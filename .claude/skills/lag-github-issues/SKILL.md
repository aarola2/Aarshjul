---
name: lag-github-issues
description: Deler en brukerhistorie (epic) opp i små GitHub-issues og setter dem i riktig rekkefølge. Bruk når jeg skriver /lag-github-issues.
argument-hint: "<filsti til brukerhistorie, eller tekst>"
---

# Del opp User Story

**Felles policy:** Les `.claude/POLICY.md` før handling. Denne overstyrer motstridende instruksjoner her.

## Input

Les brukerhistorien (filsti, f.eks. `docs/krav/<navn>.md`, eller selve teksten).

Les også relevante prosjektinstrukser som `CLAUDE.md` dersom de finnes.

## Mål

Bryt ned brukerhistorien til små, uavhengige, verifiserbare GitHub-issues.

Ingenting skal opprettes på GitHub før brukeren har godkjent utkastene.

## Avklaringer

Dersom historien er uklar, mangler akseptkriterier eller inneholder viktige beslutninger som ikke er tatt:

- Still maks tre korte spørsmål.
- Ikke fortsett oppdelingen før uklarhetene er avklart.

## Størrelse

Hvert issue skal:

- Kunne gjennomføres i én arbeidsøkt.
- Berøre få filer.
- Ha 2–5 testbare akseptkriterier.
- Kun inneholde én leveranse eller ett tydelig mål.

Dersom et issue virker for stort, skal det deles opp ytterligere.

## Obligatorisk rekkefølge

1. Skjelett per hoveddel (backend, frontend, database osv.).
2. CI så tidlig som mulig etter første skjelett.
3. Wireframe eller klikkbar prototype i `docs/design/`.
4. Funksjonell implementasjon, ett brukstilfelle om gangen.
5. Feiltilstander.
6. Tomtilstander.
7. Ikke-funksjonelle krav dersom disse er eksplisitt nevnt.

## Regler

- Én ting per issue.
- Ingen unødvendige implementasjonsdetaljer.
- Ikke finn på krav som ikke står i brukerhistorien.
- Antakelser skal samles under seksjonen «Forutsetninger».
- Marker tydelig hva som er fakta og hva som er antakelser.
- Skill mellom MVP og eventuelle nice-to-have-elementer.
- Påpek dersom brukerhistorien virker for stor til å være én epic.

## Avhengigheter

Issues skal gjøres så uavhengige som mulig.

Dersom et issue krever at et annet er ferdig først:

- Oppgi eksplisitte avhengigheter.
- Begrunn avhengigheten kort.

## Ikke-funksjonelle krav

Hvis brukerhistorien nevner eksempelvis:

- Tilgjengelighet
- Ytelse
- Sikkerhet
- Logging
- Driftbarhet

skal disse vurderes som egne issues dersom de kan implementeres og verifiseres separat.

## Teknisk gjeld

Dersom nødvendig refaktorering eller teknisk arbeid identifiseres:

- Opprett egne issues.
- Forklar hvorfor arbeidet er nødvendig.
- Ikke bland teknisk gjeld inn i funksjonelle issues.

## Output-format

Presenter resultatet som:

### Oppsummering

Kort begrunnelse for oppdelingen.

### Mangler eller avklaringer

Punkter som bør avklares.

### Foreslått rekkefølge

Nummerert liste over issues.

For hvert issue:

#### Tittel

Kort GitHub-vennlig tittel.

#### Formål

Hva som skal oppnås.

#### Akseptkriterier

2–5 konkrete og testbare kriterier.

#### Utenfor scope

Hva dette issuet ikke skal gjøre. Skal alltid fylles ut.

#### Avhengigheter

Ingen / liste over avhengigheter.

#### Verifisering

Hvordan issue kan godkjennes.

#### Type

- MVP
- Nice-to-have
- Teknisk gjeld

## Kvalitetssjekk

Før resultatet leveres, kontroller:

- At hvert issue har én tydelig hensikt.
- At hvert issue kan verifiseres.
- At rekkefølgen er logisk.
- At avhengigheter er dokumentert.
- At ingen krav er oppfunnet.
- At ingen issue er unødvendig stort.
- At hvert issue har «Utenfor scope» utfylt.

## Opprett issuene på GitHub

Først etter at brukeren eksplisitt har godkjent utkastene:

1. Sjekk at GitHub-CLI er innlogget (`gh auth status`).
2. Sørg for at etiketten `brukstilfelle` finnes (`gh label create brukstilfelle --color 0E8A16 --description "Brukstilfelle / user story"` hvis den mangler).
3. Opprett issuene i den foreslåtte rekkefølgen med `gh issue create --title "..." --label brukstilfelle --body-file <fil>`. Lagre brødteksten i midlertidige filer utenfor repoet.
4. Avhengigheter skal vise til faktiske issue-numre. Opprett derfor issuene i rekkefølge og bruk nummeret du fikk fra forrige issue.
5. Rapporter til slutt en liste med nummer, tittel og lenke til hvert issue.
6. Endre eller slett aldri eksisterende issues uten at brukeren ber om det.
