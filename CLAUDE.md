# Aarhjul

Applikasjonen er et årshjul der man kan skrive opp faste ting man skal gjøre gjennom året.

## Stack

- Frontend: React 19 + TypeScript (strict) + Vite, i `frontend/`
- Backend: ingen (data lagres i nettleseren)
- Test: Vitest + Testing Library (enhet/komponent), Playwright (e2e, Chromium)
- Lint: ESLint + typescript-eslint (strictTypeChecked)
- Hosting: GitHub Pages, `https://aarola2.github.io/Aarshjul/` (Vite `base: '/Aarshjul/'`)

## Kommandoer

Kjøres fra mappen som står i overskriften.

### frontend/
- Installer: `npm ci`
- Start: `npm run dev` (åpne `http://localhost:5173/Aarshjul/`)
- Test: `npm test` (med dekning: `npm test -- --coverage`, grense 80 % i `vite.config.ts`)
- Lint: `npm run lint`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- E2E (Playwright): `npm run e2e` (første gang: `npx playwright install chromium`). Rapport med skjermbilder i `playwright-report/`.
- E2E mot bygget `dist/`: `E2E_PREVIEW=1 npm run e2e` (brukes av CI-jobben `e2e-bygg` og av staging i `deploy.yml`)

## Mappestruktur

```
frontend/           kode og tester (tester ved siden av koden, *.test.tsx)
frontend/e2e/       Playwright-tester
docs/krav/          brukerhistorier
docs/design/        wireframe / klikkbar prototype
docs/arkitektur.md  oversikt over løsningen
.github/            issue-mal, CI og utrulling
.claude/            policy, rettigheter og skills
```

## Kodestandard

- Strengeste typesjekk stacken tilbyr (se `tsconfig.app.json`).
- Navn i koden på engelsk. Meldinger til brukeren på norsk.
- Aldri hent eller kjør pakker utenfor `package.json` (`npx <pakke>`, `npx --yes`, `npm exec`, `dlx`, `bunx`). Unntak: `npx playwright test` og `npx playwright install chromium`. Appstart i e2e skjer via `webServer` i `playwright.config.ts`. Nye pakker krever godkjenning i planen.
- Nettleserlagring (`localStorage`) bruker unik nøkkel med prosjektnavn og versjon: `aarhjul:v1:<navn>`. Alle GitHub Pages-sider under `aarola2.github.io` deler opprinnelse, så nøkler uten prefiks kan kollidere med andre prosjekter. Alt som leses derfra valideres før bruk.
- Hver ny funksjon har en test. Tester ligger ved siden av koden.
- Små funksjoner. Ingen død kode.
- E2E-tester (Playwright): velg elementer med `getByRole`/`getByLabel`/`getByText`, aldri CSS-klasser. Ingen faste ventetider. Én test per akseptkriterium i UI-issues. Skjermbilder lagres i testrapporten. Naviger med relative stier (`page.goto('./')`) så `/Aarshjul/`-basen beholdes.

## Arbeidsmåte

- Ett issue = én branch (`feature/<nr>-<navn>`) = én PR med `Closes #<nr>`.
- Aldri push til `main`. Aldri force push. Aldri `git add .`.
- Se `.claude/POLICY.md`: nivå 1–2 krever forhåndsgodkjenning, nivå 3 gir autonom PR (men `/bygg-issue-nr` og `/bygg-en-og-en` viser alltid planen først), nivå 4 muliggjør autonom merge bare for lav risiko med eksterne gates.
- Avviker ønsket fra issuet: oppdater issuet først.
- Et issue er ferdig først når PR-en er merget.
- Kjør test, lint og build før commit. Rapporter hva som ikke er verifisert.

## Felles styring

Les `.claude/POLICY.md` først. KI-review er rådgivende; CI, branch protection og produksjonssperrer må håndheves utenfor agenten.

## Grønn sone (kan gjøres selvstendig)

Små funksjoner med tester, UI-detaljer ut fra godkjent wireframe, dokumentasjon, tester.

## Rød sone (plan og godkjenning alltid)

Autentisering, penger, personopplysninger, database og migreringer, sikkerhet, mappestruktur, CI og hemmeligheter, nye pakker.

## Utrulling

- `deploy.yml` kjører etter grønn CI på `main`: `bygg` lager én artefakt, `staging` røyktester nøyaktig den (digest-sjekk), `produksjon` publiserer samme artefakt til GitHub Pages.
- Produksjon er stengt til variabelen `PRODUKSJON_GODKJENNING_VERIFISERT` settes til `true` av eieren. Ikke endre `deploy.yml`, miljøer eller variabler.
- Se `.claude/POLICY.md`.

## Ikke rør

- `.env` og andre hemmeligheter
- `.claude/settings.json` uten at jeg ber om det
- Alt under «Utenfor scope» i issuet

## Forklaringer

Når du lager noe jeg ikke selv kunne forklart for en kollega, legg ved en kort forklaring på norsk i planen eller rapporten.
