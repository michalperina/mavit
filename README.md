# MAVIT — Martin Vitásek

Jednostránkový web pro řemeslníka (obklady a dlažby, zámkové dlažby, kamenické
a zednické práce, Vitín / jižní Čechy). Statické HTML + CSS + JS, bez buildu
a bez závislostí.

## Spuštění

Stačí otevřít `index.html` v prohlížeči. Pro lokální náhled přes server:

```bash
python3 -m http.server 4321
```

Nasazení: nahrát celý obsah složky na jakýkoli webhosting nebo Netlify / Vercel /
GitHub Pages. Nic se nekompiluje.

## Kontakt a formulář

Telefon **+420 606 239 891** a e-mail **vitas25@gmail.com** jsou vyplněné
v sekci `#kontakt` a zároveň ve strukturovaných datech (JSON-LD) v hlavičce.

Odeslání formuláře otevře e-mailového klienta s předvyplněnou zprávou na adresu
z řádku „E-mail“ — funguje tedy bez backendu. Pokud budete chtít odesílání na
server, stačí formuláři `#poptavka` přidat `action` (např. Formspree) a
odstranit `e.preventDefault()` v `assets/js/main.js`.

Volitelně: IČO do patičky, absolutní URL v `og:image` po nasazení na doménu.

## Struktura

```
index.html              celá stránka
assets/css/style.css    design tokeny + layout + animace
assets/js/main.js       hero na scroll, navigace, akordeon, posuvník před/po, formulář
assets/img/*.webp       fotky použité na webu
assets/img/originaly/   nepoužité originály z profilu (JPG), pro pozdější výběr
```

## Obsah — odkud pochází

Texty, hodnocení a fotografie vycházejí z veřejného profilu
[Martin Vitásek na NejŘemeslníci.cz](https://www.nejremeslnici.cz/profil/449457-martin-vitasek).
Zákaznická hodnocení v sekci *Reference* jsou převzatá doslovně včetně známky
(5,0 / 4,7 / 4,3). Údaje v sekci *O mně* (17 referencí, devět hodnocení, z toho
osm kladných) odpovídají profilu k 29. 7. 2026 — při jeho aktualizaci je
potřeba je přepsat i tady.

## Design

- **Barvy** — cihlová `#D4241C` odečtená z loga, uhlová `#0D0D0F`, teplá
  bílá `#F7F5F2`. Definované v `:root` v `style.css`.
- **Písma** — Archivo (nadpisy, proměnná šířka), Inter Tight (text),
  JetBrains Mono (popisky a čísla). Google Fonts, `display=swap`.
- **Motiv** — vodicí linky „spáry“: kinetická mřížka v heru, červená linka
  postupu čtení nahoře, kosočtvercové odrážky.
- **Kinetická mřížka** (`.hero__fx`, canvas jen uvnitř hero sekce) — jemná
  mřížka, která se ohýbá k ukazateli myši a v okolí kurzoru se rozsvítí
  cihlově červeně; kliknutí vyšle vlnu. Kreslí se do tří pláten (podklad,
  červená vrstva, měkká maska), takže přechod je plynulý a bez pásování.
  Běží jen když je hero na obrazovce a karta aktivní; při
  `prefers-reduced-motion` zůstane statická bílá mřížka bez červené.
- **Pohyb** — hero je řízený scrollem: nadpis nejdřív vyplní celou obrazovku,
  při rolování se zmenší a pod ním se odkryje podtitulek s tlačítky
  (`--p` / `--k` / `--rp` nastavuje `heroTick()` v `main.js`, zbytek dělá CSS).
  Dál maskovaný náběh nadpisů, odhalování při scrollu a posuvník před/po.
  Vše se vypíná při `prefers-reduced-motion: reduce` — hero se pak chová jako
  běžná jednoobrazovková sekce.
- **Responzivita** — testováno na 375, 768, 1024 a 1440 px, bez vodorovného
  posuvu; kontrast textu splňuje WCAG AA.
