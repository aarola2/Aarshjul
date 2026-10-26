# Designbeskrivelse: Årshjul (variant A)

Prototype: `Årshjul.dc.html` (variant A). Kun PC-skjerm.

## 1. Layout og hovedelementer

**Sideoppsett**
- Toppfelt: tittel «Årshjul» (serif) med undertekst, og knappen «+ Legg til nytt gjøremål» til høyre.
- Hovedområde i to kolonner: hjul til venstre (fyller resten av bredden), sidekolonne til høyre (440 px, hvit/lys bakgrunn, egen scroll).
- Bakgrunn: varm off-white `#f4f1ea`. Tekst `#1d2624`.

**Hjul**
- Sirkulært, hele året. Januar kl. 12, månedene går med klokken, begynnelsen av juli nederst.
- Ytterst et fargebånd med månedsnavn i store bokstaver, bøyd langs sirkelen. Fargen følger årstiden.
- Innenfor båndet: én liten strek per dag. Lengre streker for den 1., 10. og 20. med datotall.
- Innerst et senterfelt med dagens dato (dag, måned, ukedag).
- Hvert gjøremål er en mørk prikk per dato, plassert langs datoens linje innover mot sentrum.
- Prikkenes plassering utledes av gjøremålets id (stabil mellom innlastinger). To prikker på samme dato får aldri samme plass.

**Sidekolonne «Denne måneden»**
- Overskrift med inneværende månedsnavn.
- Ett kort per gjøremål: datomerker (i årstidsfarge), tittel, valgfri beskrivelse, knappene «Rediger» og «Slett».
- Gjøremål med flere datoer i måneden er ett kort med alle datoene som merker.
- Sortert etter første dato i måneden, tidligst øverst.

**Knapper**
- Primær: mørk fylt pille («+ Legg til nytt gjøremål», «Lagre», «Rediger» i dialog).
- Sekundær: omriss («Rediger» på kort, «Avbryt»).
- Farlig: rød tekst/omriss («Slett»), fylt rød for «Ja, slett» i bekreftelsen.
- «+ Legg til ekstra dato»: stiplet omriss.

**Dialoger (modal, midtstilt, mørk overlegg)**
- *Vis gjøremål:* tittel, datomerker, beskrivelse, «Gjentas automatisk hvert år», knappene Rediger og Slett, lukkeknapp.
- *Skjema (nytt/rediger):* Tittel (maks 60, teller), Beskrivelse (valgfri, maks 500, teller), Datoer (tekstfelt dd.mm + kalenderknapp + «Fjern»), «+ Legg til ekstra dato» (maks 12), Avbryt / Lagre.
- *Bekreftelse:* «Er du sikker?» med gjøremålets tittel, Avbryt / Ja, slett.

## 2. Farger

**Årstider (månedsbånd og datomerker)**

| Årstid | Måneder | Fyll | Tekst |
|---|---|---|---|
| Vinter | des, jan, feb | `#e3e9ef` (lys gråblå) | `#2b3a48` |
| Vår | mar, apr, mai | `#bfdc9c` (lys grønn) | `#24401a` |
| Sommer | jun, jul, aug | `#2e6a42` (mørkegrønn) | `#ffffff` |
| Høst | sep, okt, nov | `#df8a3e` (oransje) | `#3a1c05` |

**Dagens dato**
- Rød ring `#c4302b`, 3,5 px, rundt datotallet på hjulet, med lys fyll og liten skygge (som en magnet på en gammel kalender).
- Ringen vises bare på dagens dato og flytter seg når datoen skifter.
- Dagens dato i sidekolonnen: datomerket får rød kant og teksten «I dag ·».

**Øvrige**
- Prikker: `#1d2624` med lys kant.
- Kort og dialog: `#fffdf8`, kant `#e3dccd`.
- Feil: `#b3261e` (tekst og feltkant). Slett: `#a52520` / `#c4302b`.

**Typografi:** Instrument Serif til tittel, månedsnavn og dialogtitler. Instrument Sans til resten.

## 3. Klikk og hover

**Prikk på hjulet**
- Hover: prikken vokser og en tooltip med tittelen vises over den.
- Tastatur: nås med Tab, får synlig fokusring og samme tooltip. Enter (eller mellomrom) åpner dialogen.
- Skjermleser leser «Tittel, dato», for eksempel «Vårvask av garasjen, 15. mai».
- Klikk: åpner «Vis gjøremål»-dialogen.

**Kort i sidekolonnen**
- Hover: kanten blir mørkere. Klikk på kortet eller tittelen åpner «Vis gjøremål».
- «Rediger» åpner skjemaet med utfylte verdier. «Slett» åpner bekreftelsen.

**Skjema**
- Dato kan skrives inn (dd.mm, dd/mm eller dd-mm) eller velges i kalender.
- Feil vises ved feltet, og ingenting lagres. Eksempler:
  - «Tittel er påkrevd.»
  - «Minst én dato er påkrevd.»
  - «31. april finnes ikke i kalenderen.»
  - «15. mai er allerede lagt inn på dette gjøremålet.»
- 29. februar er tillatt. I år uten skuddår vises den 28. februar.
- Feilmeldinger oppdateres mens brukeren retter opp.

**Dialoger**
- Lukkes med Esc, klikk utenfor eller lukkeknapp. Fokus går tilbake til elementet som åpnet dem.
- Sletting krever alltid bekreftelse. Ingen angre.

**Lagring:** ved lagre, rediger og slett oppdateres hjul, kort og nettleserens lagring med en gang.

## 4. Tomtilstand og ødelagte data

**Tomtilstand (ingen oppgaver denne måneden)**
- Stiplet ramme i sidekolonnen med teksten «Ingen oppgaver denne måneden» og en linje under: «Gjøremål med en dato i [måned] dukker opp her.»
- Hjulet vises som vanlig, uten prikker hvis listen er helt tom.

**Ødelagte data**
- Hvis lagrede data ikke kan leses eller har ugyldig innhold, ignoreres de og appen starter med tom liste.
- Rød/rosa varselstripe under toppfeltet (`#fbe9e6`, `role="alert"`):
  «**Lagrede data var ødelagt.** De kunne ikke leses, så årshjulet startet med en tom liste. En kopi av de ødelagte dataene er tatt vare på.»
- Knapper: «Last ned kopien» (laster ned `aarshjul-odelagte-data.json`) og «Lukk».
- En kopi av de ødelagte dataene lagres separat i nettleseren.

## 5. Utenfor designet

- Mobil og nettbrett (kun PC-skjerm).
- Innlogging, flere brukere og deling.
- Synkronisering mellom enheter.
- Varsler og påminnelser.
- Eksport og import av gjøremål (bortsett fra nedlasting av ødelagte data).
- Gjentakelse som ikke er årlig. Brukeren legger i stedet inn flere datoer.
- Andre år enn det generelle året. Hjulet viser ett år.
- Angre etter sletting.
- Den lille grå prikken til venstre for knappen «+ Legg til nytt gjøremål» i skjermbildet er en rest og skal ikke bygges.

Variant B (månedsfelt, rød viser, popover og skjema i sidekolonnen) er ikke valgt.
