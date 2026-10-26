# Brukerhistorie: Årshjul (interaktiv årsplanlegger)

## Mål

Som bruker ønsker jeg en interaktiv nettapplikasjon formet som et årshjul, slik at jeg kan legge inn faste årlige gjøremål, se dem på et sirkulært hjul tilpasset norske årstider, og enkelt se oppgavene for inneværende måned.

## Bruker

Én enkelt person som bruker appen i sin egen nettleser på en større skjerm (PC). Det finnes ingen innlogging og ingen andre brukere.

## Hovedflyt

1. Brukeren åpner appen og ser årshjulet til venstre og oppgavene for inneværende måned til høyre.
2. Brukeren trykker «+ Legg til nytt gjøremål», fyller ut tittel, velger én eller flere datoer og eventuelt en beskrivelse, og lagrer.
3. Gjøremålet vises som en prikk på hjulet for hver dato, og som et kort til høyre hvis det inntreffer i inneværende måned.
4. Brukeren klikker en prikk eller et kort for å se, redigere eller slette gjøremålet.
5. Gjøremålet gjentas automatisk hvert år og ligger der når brukeren kommer tilbake, også etter at siden er lastet på nytt.

## Funksjonalitet og akseptkriterier

### 1. Årshjulet (venstre side)

- Hjulet er sirkulært og viser et helt kalenderår.
- Januar ligger øverst (kl. 12), og månedene går med klokken. Begynnelsen av juli ligger nederst.
- Månedene har årstidsfarger tilpasset norske sesonger:
  - Vinter (desember, januar, februar): hvitaktig / lys gråblå
  - Vår (mars, april, mai): lys grønn
  - Sommer (juni, juli, august): mørkegrønn
  - Høst (september, oktober, november): oransje / varm høsttone
- Månedene er tydelig merket med navn.
- Hver dag har en liten strek. Den 1. i hver måned (og den 10. og 20.) har datotall. Dagens dato har alltid tall.
- **Dagens dato** markeres med en ring rundt datotallet, litt som en magnet på en gammel kalender. Ringen vises bare på dagens dato og flytter seg når datoen skifter.
- **Hvert gjøremål** vises som én prikk per dato det er lagt inn på.
- Når flere gjøremål har samme dato, plasseres prikkene på forskjellige steder langs datoens linje, slik at ingen ligger oppå hverandre. Plasseringen ser tilfeldig ut, men utledes fra gjøremålets id, så den er lik hver gang siden lastes. Appen sjekker at to prikker aldri får samme plassering.
- Når brukeren holder musen over en prikk, eller navigerer til den med tastaturet, vises tittelen.
- Klikk på en prikk åpner en dialog (modal eller popover) med tittel, dato(er) og beskrivelse, og valg for å redigere eller slette.

### 2. Inneværende måned (høyre side)

- En sidekolonne viser alle gjøremål som inntreffer i inneværende måned, basert på dagens dato i brukerens nettleser.
- Hvert gjøremål vises som ett kort med tittel, datoen eller datoene i måneden, beskrivelse (hvis utfylt) og knapper for Rediger og Slett.
- Et gjøremål med flere datoer i måneden vises som ett kort med alle datoene.
- Kortene sorteres etter første dato i måneden, tidligst øverst.
- Finnes ingen gjøremål i måneden, vises teksten «Ingen oppgaver denne måneden».

### 3. Opprette og redigere gjøremål

- En tydelig knapp «+ Legg til nytt gjøremål» åpner et skjema.
- **Tittel:** påkrevd, maks 60 tegn.
- **Beskrivelse:** valgfri, maks 500 tegn.
- **Datoer:** minst én er påkrevd, maks 12 per gjøremål.
  - Brukeren kan velge dato i en datovelger eller skrive den inn manuelt.
  - Datoen må være gyldig i kalenderen. Ugyldige datoer, som 31. april og 30. februar, avvises med en tydelig melding.
  - **29. februar** er tillatt. I år uten skuddår vises den 28. februar.
  - Samme dato kan ikke legges inn to ganger på samme gjøremål.
  - En knapp «+ Legg til ekstra dato» legger til flere datoer, til grensen på 12 er nådd.
- Alle gjøremål er årlige og gjentas automatisk hvert år. Det finnes ingen egen innstilling for gjentakelse.
- Ved brudd på en regel vises en tydelig feilmelding ved feltet, og ingenting lagres.
- Redigering bruker samme skjema og samme regler som oppretting.
- **Sletting** krever en bekreftelse («Er du sikker?») før gjøremålet fjernes.

### 4. Lagring

- Gjøremålene lagres i brukerens nettleser, slik at de finnes igjen når siden lastes på nytt.
- Hvert gjøremål har id, tittel, beskrivelse, liste med datoer (måned og dag) og opprettelsestidspunkt.
- Alt som leses fra lagringen kontrolleres før det brukes.
- **Ødelagte data:** Kan lagrede data ikke leses eller har ugyldig innhold, ignoreres de, og appen starter med en tom liste. Brukeren får en tydelig melding om at lagrede data var ødelagt. En kopi av de ødelagte dataene tas vare på, og meldingen har en knapp som laster ned kopien som fil.

### 5. Tilgjengelighet og tastatur

- Alle prikker på hjulet kan nås med Tab og åpnes med Enter.
- Hver prikk har en tekst som leses opp, for eksempel «Vårvask av garasjen, 15. mai».
- Knapper, skjemafelt og dialoger kan brukes med tastatur.

## Kvalitetskrav

- Appen skal ha automatiske tester for:
  - at nye gjøremål kan legges til, og at tittel og minst én dato kreves
  - at lagringen oppdateres ved oppretting, redigering og sletting
  - at kortene til høyre bare viser gjøremål for inneværende måned
  - datovalidering, inkludert 29. februar og ugyldige datoer
  - ødelagte data i lagringen
  - at to prikker aldri får samme plassering
- Minst én ende-til-ende-test: brukeren åpner appen, oppretter et gjøremål med to datoer, ser at to prikker vises på hjulet, og sletter gjøremålet etter bekreftelse.

## Forutsetninger

Fakta:

- Appen er klientbasert og har ingen server.
- Teknologivalg er dokumentert i `CLAUDE.md`, ikke her.

Antakelser:

- Brukeren bruker en moderne nettleser på PC.
- Hele brukergrensesnittet er på norsk.
- Dagens dato hentes fra brukerens nettleser.
- Det finnes ingen innlogging, så ingen personopplysninger lagres utover det brukeren selv skriver inn.

## Utenfor scope

- Innlogging, flere brukere og deling
- Synkronisering mellom enheter, siden dataene bare finnes i den ene nettleseren
- Varsler og påminnelser
- Eksport og import av gjøremål (bortsett fra nedlasting av ødelagte data)
- Mobil og nettbrett, kun PC-skjerm er med i dette prosjektet
- Gjentakelse som ikke er årlig, som ukentlig eller månedlig (brukeren legger i stedet inn flere datoer)
- Hele år i fremtiden eller fortiden, hjulet viser bare ett generelt år
- Undo/angre etter sletting

## Rekkefølge

1. Skjelett for appen
2. CI
3. Wireframe i `docs/design/`, godkjent før noe kodes
4. Funksjonalitet, ett brukstilfelle om gangen
5. Feiltilstander (ugyldige datoer, ødelagte data)
6. Tomtilstand
7. Tilgjengelighet og tastatur

## MVP og nice-to-have

**MVP:** alt over unntatt det som står under.

**Nice-to-have (ikke i første versjon):**

- Tilpasning til mobil og nettbrett
- Eksport og import av gjøremål
