---
name: slipp-til-produksjon
description: Forbereder produksjonssetting: full kontroll av main, release-notater, tag og utrulling til staging. Selve produksjonssettingen godkjennes av meg på GitHub. Bruk bare når jeg skriver /slipp-til-produksjon.
disable-model-invocation: true
argument-hint: "<versjon, f.eks. v1.0.0>"
---

# Slipp til produksjon

**Felles policy:** Les `.claude/POLICY.md` før handling; den overstyrer motstridende instruksjoner her.

Input: `$ARGUMENTS` (versjon). Produksjonssetting krever en **verifisert ekstern menneskelig sperre**. Hvis GitHub-planen ikke støtter required reviewers i private repos, stopp før produksjonsoppsett.

## Steg

1. **Forutsetninger.** På `main`, ren og oppdatert (`git pull`). Ingen åpne rød-kø-PR-er uten at jeg har sagt at de kan vente. Sjekk at siste CI-kjøring på `main` er grønn (`gh run list --branch main --limit 1`).
2. **Full kontroll.** Alle kommandoer fra `CLAUDE.md` (test, lint, build, typecheck) i alle mapper. Kjør e2e og sikkerhetsskanning hvis de finnes lokalt. Rapporter nøyaktig hva som kjørte og hva som ikke gjorde det.
3. **Sikkerhetsgjennomgang.** Start en subagent uten byggehistorikk. Gi den hele kodebasen (lesetilgang) og be om en gjennomgang etter OWASP Top 10: autentisering og tilgang, input-validering, hemmeligheter i kode/historikk, sårbare avhengigheter (`npm audit` eller tilsvarende), feilmeldinger som lekker informasjon, CORS/headers. Resultat: liste med alvorlighet. Alvorlig/høy = ikke slipp; lag issues og stopp.
4. **Release-notater.** Skriv dem til en fil utenfor repoet.  Fra lukkede issues og PR-er siden forrige tag: kort norsk liste. Ta med kjente begrensninger og alt som ikke er verifisert.
5. **Gate-kontroll.** Du kan ikke lese miljøinnstillinger eller repo-variabler (det er riktig) og kan ikke selv bevise at sperren virker. Beviset er enten en kjøring av deploy der `produksjon` stod som «Waiting for review», eller en skriftlig bekreftelse fra meg om at jeg har sett det. Er ingen av delene gitt: STOPP og forklar hvordan jeg beviser det:
   1. Settings → Environments → production: Required reviewers lagret med meg, «Allow administrators to bypass» av, kun `main` som tillatt branch.
   2. Settings → Secrets and variables → Actions → fanen **Variables**: `PRODUKSJON_GODKJENNING_VERIFISERT` = `true` (navn til venstre, verdi til høyre; sjekk at de ikke er byttet om).
   3. Actions → Deploy → siste kjøring → Re-run all jobs. Står `produksjon` grå/hoppet over, er variabelen feil eller ikke fanget opp: lag en ny kjøring via en liten PR. Står den som «Waiting», virker sperren. Avvis eller godkjenn selv.
   Start aldri en kjøring som kan publisere før sperren er bevist. Bekreft dokumentert at produksjonsmiljøets required reviewers faktisk håndheves for dette repoet og abonnementet, og at produksjonshemmeligheter ikke er tilgjengelige før godkjenning. Mangler dette, STOPP. Bruk ikke en annen workflow som omgår sperren.
6. **Tag og release.** `git tag <versjon>`, `git push origin <versjon>`, `gh release create <versjon> --notes-file <fil>` (bare `ask`-godkjent). Rull-ut-arbeidsflyten i `.github/workflows/` tar over.
7. **Staging først.** Test eksakt immutabel artefakt/digest som senere skal promoteres. Bekreft at utrullingen til staging er grønn og at røyktesten mot staging passerer.
8. **Stopp.** Skriv: «Klar for produksjon. Godkjenn i GitHub: Actions → deploy → Review deployments.» Dette er bare tillatt etter at sperren er kontrollert og bevist virksom. Du forsøker aldri å omgå det.
9. **Etter at jeg har godkjent:** sjekk helse-endepunktet/røyktest i produksjon, og rapporter. Feiler den: foreslå rollback (forrige tag), men gjør den ikke uten at jeg sier ja.

## Hvis verktøyet ditt feiler

Svarer godkjenningsverktøyet ikke (for eksempel utløpt innlogging), gjør ingenting på egen hånd. Si hva som ikke er gjort, og be meg logge inn på nytt (`/login`) eller laste vinduet på nytt. Release og tag kan også lages manuelt i GitHub (Releases → Draft a new release) med notatene du har skrevet.

## Regler

- Aldri deploy direkte til produksjon fra kommandolinjen.
- Aldri endre miljøbeskyttelse, hemmeligheter eller ruleset.
- Produksjonshemmeligheter finnes kun i GitHub Environments, aldri i repoet og aldri i det du leser.
