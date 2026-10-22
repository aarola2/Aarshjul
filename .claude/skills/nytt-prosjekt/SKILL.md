---
name: nytt-prosjekt
description: Setter opp et nytt prosjekt for KI-assistert utvikling: CLAUDE.md, rettigheter, issue-mal, etikett, mappestruktur og sjekkliste for GitHub. Bruk når jeg skriver /nytt-prosjekt.
disable-model-invocation: true
argument-hint: "<prosjektnavn> <én setning om hva det er>"
---

# Nytt prosjekt

**Felles policy:** Les `.claude/POLICY.md` før handling; den overstyrer motstridende instruksjoner her.

Input: `$ARGUMENTS` (navn og kort beskrivelse).

Malene ligger i `.claude/skills/nytt-prosjekt/maler/`. Du setter opp rammene; du bygger ingen funksjon. Én branch og én PR for hele oppsettet (`feature/oppsett`).

## Steg

1. **Forutsetninger.** Sjekk `git --version`, `gh auth status`, og at gjeldende mappe er et git-repo koblet til GitHub (`git remote -v`). Mangler repo: foreslå `gh repo create <navn> --private --clone` og vent på ja. Mangler verktøy, si hva jeg må installere, og stopp.
2. **Stack.** Bruk AskUserQuestion (maks fire spørsmål): språk/rammeverk for frontend, for backend (eller «ingen»), testverktøy, lint-verktøy. Foreslå en anbefaling per spørsmål, med én setnings begrunnelse. Sjekk at nødvendig runtime er installert (f.eks. `node --version`).
3. **Plan.** Vis filene du vil lage og endre, og stopp for godkjenning. Dette er rød sone for alle prosjekter.
4. **Opprett** (etter godkjenning):
   - `CLAUDE.md` fra `maler/CLAUDE.md.mal`, utfylt med navn, beskrivelse, stack og **faktiske kommandoer** per mappe (test, lint, build, typecheck, dev).
   - `.github/ISSUE_TEMPLATE/brukstilfelle.md` fra `maler/brukstilfelle.md`.
   - `docs/krav/` og `docs/design/` (med `.gitkeep`).
   - `.github/workflows/ci.yml` fra `maler/ci.yml.mal` (lint, typecheck, test med dekning, build, avhengighetsskanning, hemmelighetsskanning, kodeanalyse, e2e hvis UI) og `.github/dependabot.yml` fra `maler/dependabot.yml.mal`. Fest tredjeparts-actions til commit-SHA, og bruk `persist-credentials: false` på alle `actions/checkout`.
   - **Hvis prosjektet har UI: Playwright.** I frontend-mappen: `npm init playwright@latest` (TypeScript, mappen `e2e`, uten egen GitHub-workflow siden `ci.yml` har jobben). I `playwright.config.ts`: `webServer` som starter appen og venter til den svarer (ikke bruk `npx wait-on` eller andre pakker utenfor `package.json`; start også backend hvis testene trenger den), `use: { screenshot: 'on', trace: 'retain-on-failure' }`, ett prosjekt (Chromium), `reporter: 'html'`. Legg scriptet `"e2e": "playwright test"` i `package.json`, skriv kommandoen i `CLAUDE.md`, og lag én enkel røyktest (siden laster og viser forventet overskrift). Legg `playwright-report/` og `test-results/` i `.gitignore`. Fyll `{{E2E_MAPPE}}` i `ci.yml`. Har prosjektet ikke UI, fjern `e2e`-jobben.
   - `.github/workflows/deploy.yml` for utrulling: staging automatisk etter grønn `main`, produksjon som **deaktivert/stoppet jobb inntil håndhevet manuell godkjenning er verifisert**: la produksjonsjobben ha `if: vars.PRODUKSJON_GODKJENNING_VERIFISERT == 'true'` og `environment: production`. Variabelen opprettes ikke i oppsettet; jeg setter den selv etter at sperren er testet. For GitHub Pages: Settings → Pages → Source = GitHub Actions. Deploy samme artefakt-digest fra staging til produksjon; aldri bygg på nytt. Tilpass til hostingen jeg oppgir; spør hvis jeg ikke har valgt.
   - `docs/arkitektur.md` (tom mal med overskriftene: oversikt, deler, kjøre, teste, feilsøke).
   - I `CLAUDE.md`: regelen om at pakker ikke hentes utenfor `package.json`, og at nettleserlagring (`localStorage`) bruker en unik nøkkel med prosjektnavn og versjon (for eksempel `<prosjekt>:v1:<navn>`), siden alle GitHub Pages-sider under samme brukernavn deler opprinnelse.
   - `.gitignore` for stacken hvis den mangler (hold den kort).
   - `.claude/settings.json` finnes allerede fra pakken: tilpass `allow`-listen til stackens kommandoer (bytt ut npm-linjene), og ikke løsne på `ask`/`deny`. Inkluder `.claude/POLICY.md` og sjekk at agenten ikke kan endre eksterne gates.
5. **Etikett.** `gh label create brukstilfelle --color 0E8A16 --description "Brukstilfelle / user story"` hvis den ikke finnes.
6. **Commit, push, PR** på `feature/oppsett`: `git add -- <filer>` med filnavn, push bare branchen, `gh pr create`. Jeg merger. Etterpå `git checkout main` og `git pull`.
7. **Sjekkliste til meg** (ting bare jeg kan gjøre på GitHub), skriv den ut og vent:
   - Settings → Rules → Rulesets → New branch ruleset for `main`: krev PR, blokker force push og sletting.
   - «Require status checks» legges til **etter** at CI har kjørt første gang (da dukker jobbnavnene opp).
   - **Verifiser** GitHub-plan og synlig, fungerende `Required reviewers` på `production` med test av blokkert deploy. For private repos er dette ikke tilgjengelig på alle abonnementer. Hvis funksjonen mangler: ikke opprett aktiv produksjonsjobb og ikke legg inn prod-hemmeligheter; dokumenter manuell ekstern godkjent release-metode.
   - Settings → Code security: slå på secret scanning, push protection og Dependabot alerts.
   - Environments → production: Required reviewers = meg, trykk Save og last siden på nytt for å bekrefte at det ble lagret. «Allow administrators to bypass» **av**. Deployment branches: bare `main`. (Er jeg eneste utvikler: la «Prevent self-review» stå av, ellers kan ingen godkjenne.)
   - Test sperren (se `/slipp-til-produksjon` steg 5) **før** variabelen settes for ekte. I Variables: navn til venstre og verdi `true` til høyre; ikke bytt dem om.
   - Slå på **code scanning merge protection** i rulesettet, så høye CodeQL-funn blokkerer merge (POLICY krever det).
   - Krev at jobbene `kontroll`, `avhengigheter`, `hemmeligheter`, `kodeanalyse` (og `e2e`) er required status checks.
   - Verifiser i repoet at ruleset/required checks faktisk håndheves på den aktuelle planen før automatisk merge.
8. **Neste steg:** be meg skrive brukerhistorien (mål, brukere, hovedflyt, utenfor scope), lagre den i `docs/krav/<navn>.md`, og kjøre `/lag-github-issues docs/krav/<navn>.md`.

## Regler

- Kun forhåndsgodkjente utviklingsavhengigheter for test/lint/e2e kan installeres i oppsettsteget; andre pakker krever egen godkjenning.
- Stack står bare i `CLAUDE.md`. Skills og settings skal ikke gjøre antakelser utover det du tilpasset i steg 4.
- Rapporter hva du ikke har verifisert.
