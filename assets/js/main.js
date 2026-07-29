/* ═══════════════════════════════════════════════════════════
   MAVIT — interakce
   Bez závislostí. Vše respektuje prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Rozpad nadpisů na slova (maskovaný náběh) ───────── */
  function splitWords(el) {
    var i = 0;
    var walk = function (node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('i');
            inner.textContent = part;
            w.style.setProperty('--wi', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  }
  if (!reduced) {
    document.querySelectorAll('.split').forEach(splitWords);
  }

  /* ── 2. Odhalování při scrollu ──────────────────────────── */
  var revealTargets = document.querySelectorAll(
    '.split, .gal__i, .rev, .ba, .craft, .about__shot, .about__copy p, .about__meta,' +
    '.crafts__more, .marquee, .form, .cta__lines, .step, .sec:not(.hero) .reveal-up'
  );

  // stagger uvnitř skupin
  ['.gal', '.revs', '.ba-grid', '.crafts__list'].forEach(function (sel) {
    var g = document.querySelector(sel);
    if (!g) return;
    Array.prototype.forEach.call(g.children, function (c, i) {
      c.setAttribute('data-stagger', '');
      c.style.setProperty('--s', Math.min(i, 8));
    });
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealTargets.forEach(function (t) { io.observe(t); });
  } else {
    revealTargets.forEach(function (t) { t.classList.add('in-view'); });
  }

  /* ── 3. Orchestrovaný náběh hero ────────────────────────── */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
  });
  document.querySelectorAll('.hero .reveal-up').forEach(function (el) {
    el.style.setProperty('--d', el.dataset.d || 0);
  });

  /* ── 3b. Hero řízený scrollem ───────────────────────────── */
  var hero = document.getElementById('hero');
  var heroH1 = hero && hero.querySelector('.hero__h1');
  var heroReveal = hero && hero.querySelector('.hero__reveal');
  var heroLive = false;

  function heroMeasure() {
    if (!heroH1) return;
    // offsetHeight ignoruje transform → je to výška nezmenšeného nadpisu
    hero.style.setProperty('--h1h', heroH1.offsetHeight + 'px');
  }

  function heroTick() {
    if (!heroLive) return;
    var len = hero.offsetHeight - window.innerHeight;
    var passed = -hero.getBoundingClientRect().top;
    var p = len > 0 ? Math.min(Math.max(passed / len, 0), 1) : 1;

    var kEnd = parseFloat(getComputedStyle(hero).getPropertyValue('--k-end')) || 0.5;
    var rp = Math.min(Math.max((p - 0.12) / 0.5, 0), 1);
    rp = rp * rp * (3 - 2 * rp); // smoothstep

    hero.style.setProperty('--p', p.toFixed(4));
    hero.style.setProperty('--k', (1 - p * (1 - kEnd)).toFixed(4));
    hero.style.setProperty('--rp', rp.toFixed(4));
    if (heroReveal) heroReveal.classList.toggle('is-live', rp > 0.05);
  }

  if (hero && heroH1 && !reduced) {
    document.documentElement.classList.add('js-hero');
    heroLive = true;
    heroMeasure();
    heroTick();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { heroMeasure(); heroTick(); });
    }
    window.addEventListener('load', function () { heroMeasure(); heroTick(); });
  }

  /* ── 3c. Kinetická mřížka v heru (reaguje na ukazatel) ──── */
  (function () {
    var cv = document.querySelector('.hero__fx');
    var stage = hero && hero.querySelector('.hero__stage');
    if (!cv || !stage) return;

    var ctx = cv.getContext('2d');
    var layer = document.createElement('canvas');   // červená vrstva
    var lctx = layer.getContext('2d');
    var mask = document.createElement('canvas');    // maska záře
    var mctx = mask.getContext('2d');

    var W = 0, H = 0, dpr = 1, cell = 40, cols = 0, rows = 0, ox = 0, oy = 0, R = 220;
    var bx = null, by = null;                       // klidové pozice mřížky
    var cx = null, cy = null;                       // aktuální (zdeformované)
    var ptX = -1e4, ptY = -1e4, tgX = -1e4, tgY = -1e4, seenPointer = false;
    var ripples = [];
    var raf = 0, inView = true, t0 = performance.now();
    var canBlur = typeof lctx.filter === 'string';
    var animate = !reduced;   // bez pohybu se kreslí jen jeden statický snímek

    function build() {
      var r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      [cv, layer, mask].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; });
      cv.style.width = layer.style.width = mask.style.width = W + 'px';
      cv.style.height = layer.style.height = mask.style.height = H + 'px';
      [ctx, lctx, mctx].forEach(function (c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); });

      cell = W < 640 ? 30 : (W < 1100 ? 36 : 42);
      R = Math.max(150, Math.min(260, W * 0.17));
      cols = Math.ceil(W / cell) + 3;
      rows = Math.ceil(H / cell) + 3;
      ox = (W - (cols - 1) * cell) / 2;
      oy = (H - (rows - 1) * cell) / 2;

      var n = cols * rows;
      bx = new Float32Array(n); by = new Float32Array(n);
      cx = new Float32Array(n); cy = new Float32Array(n);
      for (var r2 = 0; r2 < rows; r2++) {
        for (var c2 = 0; c2 < cols; c2++) {
          var i = r2 * cols + c2;
          bx[i] = ox + c2 * cell;
          by[i] = oy + r2 * cell;
        }
      }
    }

    function frame(now) {
      raf = 0;
      if (!inView) return;
      var t = now - t0;

      // bez ukazatele se ohnisko pomalu vznáší, ať plocha nepůsobí mrtvě;
      // při vypnutém pohybu zůstane mimo plátno, takže zbyde jen jemná mřížka
      if (!seenPointer) {
        if (animate) {
          tgX = W * (0.5 + 0.3 * Math.sin(t * 0.00035));
          tgY = H * (0.5 + 0.24 * Math.sin(t * 0.00052 + 1.2));
        } else {
          tgX = -1e5; tgY = -1e5;
        }
      }
      if (ptX < -9e3) { ptX = tgX; ptY = tgY; }
      ptX += (tgX - ptX) * 0.11;
      ptY += (tgY - ptY) * 0.11;

      // živé vlnky z kliknutí
      for (var k = ripples.length - 1; k >= 0; k--) {
        if ((now - ripples[k].t) / 1000 > 1.25) ripples.splice(k, 1);
      }

      // 1) posun bodů: přitažení k ukazateli + radiální vlna
      var n = cols * rows;
      for (var i = 0; i < n; i++) {
        var x = bx[i], y = by[i];
        var dx = ptX - x, dy = ptY - y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) {
          var f = 1 - d / R;
          f = f * f;
          x += dx * f * 0.34;
          y += dy * f * 0.34;
        }
        for (var j = 0; j < ripples.length; j++) {
          var rp = ripples[j];
          var age = (now - rp.t) / 1000;
          var rx = bx[i] - rp.x, ry = by[i] - rp.y;
          var rd = Math.sqrt(rx * rx + ry * ry) || 1;
          var band = (rd - age * 620) / 90;
          var amp = Math.exp(-band * band) * 30 * Math.max(0, 1 - age / 1.25);
          x += (rx / rd) * amp;
          y += (ry / rd) * amp;
        }
        cx[i] = x; cy[i] = y;
      }

      // 2) geometrie mřížky jednou, použije se pro obě vrstvy
      var lines = new Path2D(), dots = new Path2D();
      for (var r3 = 0; r3 < rows; r3++) {
        for (var c3 = 0; c3 < cols; c3++) {
          var a = r3 * cols + c3;
          if (c3 < cols - 1) { lines.moveTo(cx[a], cy[a]); lines.lineTo(cx[a + 1], cy[a + 1]); }
          if (r3 < rows - 1) { lines.moveTo(cx[a], cy[a]); lines.lineTo(cx[a + cols], cy[a + cols]); }
          dots.rect(cx[a] - 1, cy[a] - 1, 2, 2);
        }
      }

      // 3) podkladová mřížka
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.055)';
      ctx.stroke(lines);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fill(dots);

      // 4) červená vrstva, oříznutá měkkou maskou kolem ukazatele
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, W, H);
      lctx.lineWidth = 1.25;
      lctx.strokeStyle = '#FF4A3D';
      lctx.stroke(lines);
      lctx.fillStyle = '#FFF1EF';
      lctx.fill(dots);

      mctx.clearRect(0, 0, W, H);
      var g = mctx.createRadialGradient(ptX, ptY, 0, ptX, ptY, R);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,.72)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, W, H);

      mctx.globalCompositeOperation = 'lighter';
      for (var j2 = 0; j2 < ripples.length; j2++) {
        var rp2 = ripples[j2];
        var age2 = (now - rp2.t) / 1000;
        var rad = age2 * 620;
        var life = Math.max(0, 1 - age2 / 1.25);
        if (rad > 6) {
          var rg = mctx.createRadialGradient(rp2.x, rp2.y, Math.max(0, rad - 95), rp2.x, rp2.y, rad + 55);
          rg.addColorStop(0, 'rgba(0,0,0,0)');
          rg.addColorStop(0.55, 'rgba(0,0,0,' + (0.85 * life).toFixed(3) + ')');
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          mctx.fillStyle = rg;
          mctx.fillRect(0, 0, W, H);
        }
      }
      mctx.globalCompositeOperation = 'source-over';

      lctx.globalCompositeOperation = 'destination-in';
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.drawImage(mask, 0, 0);
      lctx.globalCompositeOperation = 'source-over';

      // 5) složení: nejdřív rozostřená záře, pak ostrá kresba
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (canBlur) {
        ctx.filter = 'blur(' + Math.round(7 * dpr) + 'px)';
        ctx.globalAlpha = 0.75;
        ctx.drawImage(layer, 0, 0);
        ctx.filter = 'none';
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(layer, 0, 0);
      ctx.restore();

      if (animate) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf && inView) raf = requestAnimationFrame(frame); }

    function toLocal(e) {
      var r = cv.getBoundingClientRect();
      tgX = e.clientX - r.left;
      tgY = e.clientY - r.top;
      seenPointer = true;
    }

    if (animate) {
      window.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        if (e.clientY < r.top - 40 || e.clientY > r.bottom + 40) return;
        toLocal(e);
        kick();
      }, { passive: true });

      stage.addEventListener('pointerdown', function (e) {
        toLocal(e);
        if (ripples.length < 4) ripples.push({ x: tgX, y: tgY, t: performance.now() });
        kick();
      });
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { build(); kick(); }).observe(stage);
    } else {
      window.addEventListener('resize', function () { build(); kick(); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        if (inView) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else kick();
    });

    build();
    kick();
  })();

  /* ── 4. Navigace: stav při scrollu + tmavé sekce ────────── */
  var nav = document.getElementById('nav');
  var fill = document.getElementById('scrollFill');
  var darkZones = [];

  function measureDark() {
    darkZones = Array.prototype.map.call(
      document.querySelectorAll('.hero, .sec--dark, .sec--cta'),
      function (s) { var r = s.getBoundingClientRect(); return [r.top + window.scrollY, r.bottom + window.scrollY]; }
    );
  }
  measureDark();

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      heroTick();
      nav.classList.toggle('is-stuck', y > 40);

      var probe = y + 46;
      var onDark = darkZones.some(function (z) { return probe >= z[0] && probe < z[1]; });
      nav.classList.toggle('on-dark', onDark);

      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (fill) fill.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { heroMeasure(); measureDark(); onScroll(); });
  window.addEventListener('load', function () { measureDark(); onScroll(); });
  onScroll();

  /* ── 5. Mobilní menu ────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a, i) {
      a.style.setProperty('--i', i);
    });

    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('no-scroll', open);
      if (open) { drawer.removeAttribute('inert'); }
      else { drawer.setAttribute('inert', ''); }
    };

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1100 && drawer.classList.contains('is-open')) setMenu(false);
    });
  }

  /* ── 6. Řemesla: rozbalení + výměna náhledu ─────────────── */
  var crafts = Array.prototype.slice.call(document.querySelectorAll('.craft'));
  var craftImg = document.getElementById('craftImg');
  var viz = document.querySelector('.crafts__viz');
  var swapTimer = null;

  function showCraft(li, idx) {
    if (!craftImg || !viz) return;
    var src = li.dataset.img;
    if (!src || craftImg.getAttribute('src') === src) {
      viz.style.setProperty('--p', (idx + 1) / crafts.length);
      return;
    }
    viz.classList.add('is-swapping');
    viz.style.setProperty('--p', (idx + 1) / crafts.length);
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      craftImg.src = src;
      viz.classList.remove('is-swapping');
    }, reduced ? 0 : 220);
  }

  crafts.forEach(function (li, idx) {
    var btn = li.querySelector('.craft__row');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var open = li.classList.contains('is-open');
      crafts.forEach(function (o) {
        o.classList.remove('is-open');
        var b = o.querySelector('.craft__row');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        li.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        showCraft(li, idx);
      }
    });

    li.addEventListener('mouseenter', function () { showCraft(li, idx); });
    btn.addEventListener('focus', function () { showCraft(li, idx); });
  });

  // první je otevřené na desktopu
  if (crafts.length && window.matchMedia('(min-width:1024px)').matches) {
    crafts[0].classList.add('is-open');
    crafts[0].querySelector('.craft__row').setAttribute('aria-expanded', 'true');
    if (viz) viz.style.setProperty('--p', 1 / crafts.length);
  }

  /* ── 7. Posuvník před / po ──────────────────────────────── */
  document.querySelectorAll('[data-ba]').forEach(function (fig) {
    var stage = fig.querySelector('.ba__stage');
    var range = fig.querySelector('input[type=range]');
    if (!stage || !range) return;

    var set = function (pct) {
      pct = Math.max(0, Math.min(100, pct));
      stage.style.setProperty('--x', pct + '%');
      if (Number(range.value) !== Math.round(pct)) range.value = Math.round(pct);
    };
    set(Number(range.value));

    range.addEventListener('input', function () { set(Number(range.value)); });

    var dragging = false;
    var fromEvent = function (e) {
      var r = stage.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      return ((cx - r.left) / r.width) * 100;
    };
    var move = function (e) { if (dragging) set(fromEvent(e)); };

    stage.addEventListener('pointerdown', function (e) {
      dragging = true; set(fromEvent(e));
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function () { dragging = false; });
    stage.addEventListener('pointerleave', function () { dragging = false; });
  });

  /* ── 8. Formulář: validace + předvyplněný e-mail ────────── */
  var form = document.getElementById('poptavka');
  if (form) {
    var note = document.getElementById('formNote');
    var noteBase = note ? note.textContent : '';

    var msgFor = function (input) {
      if (input.validity.valueMissing) return 'Vyplňte prosím toto pole.';
      if (input.validity.typeMismatch) return 'Zkontrolujte prosím formát.';
      return 'Zkontrolujte prosím zadanou hodnotu.';
    };

    var check = function (input) {
      var slot = form.querySelector('[data-err-for="' + input.id + '"]');
      var ok = input.checkValidity();
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (slot) {
        slot.textContent = ok ? '' : msgFor(input);
        slot.classList.toggle('is-on', !ok);
      }
      return ok;
    };

    form.querySelectorAll('input,textarea').forEach(function (i) {
      i.addEventListener('blur', function () { if (i.value !== '' || i.getAttribute('aria-invalid') === 'true') check(i); });
      i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var required = Array.prototype.slice.call(form.querySelectorAll('[required]'));
      var bad = required.filter(function (i) { return !check(i); });

      if (bad.length) {
        bad[0].focus();
        if (note) { note.textContent = 'Doplňte prosím zvýrazněná pole.'; note.classList.remove('is-ok'); }
        return;
      }

      var d = new FormData(form);
      var to = (document.querySelector('.cta__lines a[href^="mailto:"]') || {}).href || 'mailto:';
      to = to.replace('mailto:', '');
      var subject = 'Poptávka z webu — ' + (d.get('druh') || 'zakázka');
      var body =
        'Jméno: ' + (d.get('jmeno') || '') + '\n' +
        'Telefon: ' + (d.get('telefon') || '') + '\n' +
        'Obec realizace: ' + (d.get('obec') || '—') + '\n' +
        'Druh práce: ' + (d.get('druh') || '') + '\n\n' +
        'Popis a rozměry:\n' + (d.get('zprava') || '');

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (note) {
        note.textContent = 'Otevírám váš e-mailový klient s vyplněnou zprávou…';
        note.classList.add('is-ok');
        setTimeout(function () { note.textContent = noteBase; note.classList.remove('is-ok'); }, 6000);
      }
    });
  }

  /* ── 9. Rok v patičce ───────────────────────────────────── */
  var rok = document.getElementById('rok');
  if (rok) rok.textContent = new Date().getFullYear();

  /* ── 10. Marquee: zdvojení pro plynulou smyčku ──────────── */
  var track = document.querySelector('.marquee__track');
  if (track && !reduced) {
    track.innerHTML += track.innerHTML;
  }

})();
