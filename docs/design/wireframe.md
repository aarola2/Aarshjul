# Wireframe: Årshjul

Klikkbar prototype: [`prototype.html`](prototype.html). Brukerhistorie: [`docs/krav/aarshjul.md`](../krav/aarshjul.md). Issue: #4.

## Åpne prototypen

Åpne `docs/design/prototype.html` direkte i nettleseren (for eksempel `open docs/design/prototype.html` på Mac). Filen er selvstendig: ingen server, ingen eksterne skript eller fonter, og ingenting lagres i nettleseren. Endringer forsvinner når siden lastes på nytt.

Prototypen bruker dagens dato fra nettleseren. Eksempelgjøremålet «Avtale feiing av pipa» legges alltid på dagens dato, slik at «I dag»-merket vises.

## Grunnlag

Prototypen bygger på referansen i [`referanse/`](referanse/), variant A:

- [`referanse/Aarshjul_design.png`](referanse/Aarshjul_design.png): skjermbilde av hovedvisningen
- [`referanse/aarshjul-design.md`](referanse/aarshjul-design.md): designbeskrivelse med farger, knapper, dialoger, feilmeldinger og tilstander

Tatt uendret fra referansen:

- Sideoppsett: toppfelt med tittel, undertekst og «+ Legg til nytt gjøremål»; hjul til venstre; sidekolonne «Denne måneden» (440 px) til høyre.
- Hjulet: januar kl. 12, med klokken, juli nederst; fargebånd med månedsnavn langs sirkelen; én strek per dag; datotall på 1., 10. og 20.; senterfelt med dag, måned og ukedag; rød ring rundt dagens dato.
- Farger for årstider, dagens dato, prikker, dialog, feil og slett. Kortene avviker, se under.
- Knapper: primær (mørk fylt), sekundær (omriss), farlig (rød), stiplet «+ Legg til ekstra dato».
- Dialogene «Vis gjøremål», skjema og «Er du sikker?». Alle lukkes med Esc, klikk utenfor og lukkeknapp (×), og fokus går tilbake til elementet som åpnet dem.
- Feilmeldingstekstene, tomtilstanden og varselstripen for ødelagte data med «Last ned kopien» (`aarshjul-odelagte-data.json`) og «Lukk».

## Avvik og tillegg

| Hva | Hvorfor |
|---|---|
| Systemskrift i stedet for Instrument Serif/Sans | Besluttet av eier i #4: ingen eksterne fonter eller nye pakker. |
| Månedsnavnene på hjulet er i sans, ikke serif | Md-en sier serif, men png-en viser sans. Prototypen følger png-en. |
| Kortene har `#f9f6ef` og sidekolonnen `#fffdf8` | Md-en sier `#fffdf8` for kort, men png-en viser kort som er litt mørkere enn sidekolonnen. Prototypen følger png-en. |
| Prikker på nære datoer spres så de ikke overlapper, når det er plass | Brukerhistorien krever bare at prikker på samme dato aldri får samme plass. Prototypen unngår også synlig overlapp med nabodatoer. |
| Tab går gjennom prikkene i kalenderrekkefølge, fra januar | Ikke beskrevet i referansen. |
| Er dagens dato 1., 10. eller 20., vises tallet bare i ringen | Så tallet ikke står to ganger. |
| Den grå prikken til venstre for «+ Legg til nytt gjøremål» er ikke med | Referansen sier at den er en rest og ikke skal bygges. |
| Variant B er ikke med | Valgt bort i referansen. |
| `Årshjul.dc.html` er ikke brukt | Filen som referansen nevner, finnes ikke. Bare PNG og md er grunnlag. |
| Ringen for dagens dato ligger litt innenfor de andre datotallene, med en rød strek ut til datoen | Så ringen ikke dekker 1., 10. eller 20. når dagens dato ligger like ved. |
| «Fjern» vises bare når det er mer enn én dato | Minst én dato er påkrevd, så den siste kan ikke fjernes. |
| Ved 12 datoer forsvinner «+ Legg til ekstra dato», og «Maks 12 datoer per gjøremål.» vises | Referansen sier bare «maks 12». |
| Bekreftelsen viser tittelen og «… slettes. Dette kan ikke angres.» | Referansen sier bare «Er du sikker?» med gjøremålets tittel. |
| Datofelt med tom verdi ignoreres ved lagring | Ikke beskrevet i referansen. Bare når alle datofelt er tomme, vises «Minst én dato er påkrevd.». |
| Feilmeldinger for lengde og format: «Tittelen kan ha maks 60 tegn.», «Beskrivelsen kan ha maks 500 tegn.», «Skriv datoen som dd.mm, for eksempel 15.05.» | Referansen gir ikke tekst for disse. |
| Kan kopien av ødelagte data ikke lagres (full lagring), avsluttes varselet med «Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.» i stedet for «En kopi av de ødelagte dataene er tatt vare på.» | Ellers lover meldingen noe som ikke stemmer, og dataene kan gå tapt i det stille. Besluttet av eier i #19. |
| I «Vis gjøremål» står «29. februar vises som 28. februar i år uten skuddår.» når det gjelder | Gjør regelen fra brukerhistorien synlig for brukeren. |
| Kalendervelgeren er nettleserens egen datovelger | Den kan ikke velge 29. februar i år uten skuddår; da skrives datoen inn. |
| Blokkerer nettleseren lagring, vises en varselstripe i samme stil som for ødelagte data: «Nettleseren tillater ikke lagring. Gjøremål kan ikke lagres før du tillater nettstedsdata for denne siden.» med «Lukk». Appen starter med tom liste. | Ellers blir siden hvit. Gjøremål holdes ikke bare i minnet, for da ville de forsvinne ved neste innlasting. Besluttet av eier i #46. |
| Kan et gjøremål ikke lagres, blir skjemaet stående åpent med «Kunne ikke lagre. Lagringen i nettleseren er full eller blokkert.» over knappene | Brukeren skal ikke tro at noe er lagret. Besluttet av eier i #46. |
| Kan en sletting ikke lagres, blir «Er du sikker?» stående med «Kunne ikke slette. Lagringen i nettleseren er full eller blokkert.» over knappene | Gjøremålet skal ikke forsvinne fra skjermen når det fortsatt er lagret. Besluttet av eier i #46. |
| Slettes et gjøremål i en annen fane mens det er åpent i visning, skjema eller «Er du sikker?», lukkes dialogen, og en varselstripe viser «Gjøremålet «Tittel» ble slettet i en annen fane.» med «Lukk». Fokus går til «+ Legg til nytt gjøremål». | Gjøremålet skal ikke stille gjenoppstå fra et skjema som var åpent. Et skjema med sperret «Lagre» ble valgt bort. Besluttet av eier i #47. |
| Med 500 gjøremål viser skjemaet for nytt gjøremål «Du kan ha maks 500 gjøremål. Slett et gjøremål før du legger til et nytt.» over knappene, og «Lagre» lagrer ingenting. «+ Legg til nytt gjøremål» forblir aktiv. Redigering virker som før. | Knappen er reservemål for fokus og kan ikke deaktiveres. Grensen hindrer at store mengder data fryser appen. Besluttet av eier i #56. |
| Prototypemenyen nederst til venstre | Bare for å vise tilstander i prototypen. Bygges ikke. Den er lukket fra start og dekker deler av hjulet når den er åpen. |

## Skjermer og tilstander

Bruk prikker, kort og knapper som i appen. Tilstander som er vanskelige å nå, ligger i menyen «Prototype: tilstander» nederst til venstre.

| # | Tilstand | Slik kommer du dit |
|---|---|---|
| 1 | Hovedvisning med hjul og kort | Åpne prototypen |
| 2 | Prikk med tooltip ved hover | Hold musen over en prikk |
| 3 | Prikk med fokusring og tooltip | Tab til en prikk |
| 4 | «Vis gjøremål» | Klikk en prikk eller et kort, eller Enter/mellomrom på en prikk |
| 5 | Skjema, nytt | «+ Legg til nytt gjøremål» |
| 6 | Skjema, rediger (utfylt) | «Rediger» på et kort eller i «Vis gjøremål» |
| 7 | Skjema med påkrevde felt som mangler | Meny: «Skjema: påkrevde felt mangler» |
| 8 | Skjema med ugyldige verdier (lengde, 31. april, 30. februar, duplikat, feil format) | Meny: «Skjema: ugyldige verdier» |
| 9 | Skjema med 12 datoer | Meny: «Skjema: 12 datoer» |
| 10 | Slettebekreftelse «Er du sikker?» | «Slett» på et kort eller i «Vis gjøremål» |
| 11 | Tomtilstand i sidekolonnen | Meny: «Tom måned» |
| 12 | Helt tom liste (hjul uten prikker) | Meny: «Helt tom liste» |
| 13 | Varselstripe for ødelagte data | Meny: «Ødelagte data» |
| 14 | Dagens dato flytter seg ved midnatt | Meny: «Simuler midnatt (neste dag)» |
| 15 | 29. februar vist som 28. februar | Klikk prikken «Skuddårsdugnad» (i år uten skuddår) |

## Sporing mot brukerhistorien

Hvert UI-krav i `docs/krav/aarshjul.md` og hvor det vises i prototypen. Tallene viser til tabellen over.

| Krav i brukerhistorien | Tilstand |
|---|---|
| **1. Årshjulet** | |
| Sirkulært hjul som viser et helt kalenderår | 1 |
| Januar kl. 12, med klokken, begynnelsen av juli nederst | 1 |
| Årstidsfarger: vinter, vår, sommer, høst | 1 |
| Månedene merket med navn | 1 |
| Strek per dag, datotall på 1., 10. og 20., dagens dato har alltid tall | 1 |
| Ring rundt dagens dato, bare der, flytter seg når datoen skifter | 1, 14 |
| Én prikk per dato per gjøremål | 1 |
| Flere gjøremål på samme dato havner ikke oppå hverandre; plassering fra id | 1 (15. oktober har tre gjøremål) |
| Tittel ved hover eller tastaturnavigering | 2, 3 |
| Klikk på prikk åpner dialog med tittel, datoer, beskrivelse, rediger og slett | 4 |
| **2. Inneværende måned** | |
| Sidekolonne med gjøremål i inneværende måned | 1 |
| Kort med tittel, datoer i måneden, beskrivelse, Rediger og Slett | 1 |
| Flere datoer i måneden gir ett kort | 1 («Rense takrennene» har to datoer i oktober) |
| Sortert etter første dato i måneden | 1 |
| «Ingen oppgaver denne måneden» | 11 |
| **3. Opprette og redigere** | |
| «+ Legg til nytt gjøremål» åpner skjema | 5 |
| Tittel påkrevd, maks 60 tegn | 7, 8 |
| Beskrivelse valgfri, maks 500 tegn | 5, 8 |
| Minst én dato, maks 12 | 7, 9 |
| Dato fra datovelger eller skrevet inn | 5 |
| Ugyldige datoer (31. april, 30. februar) avvises med tydelig melding | 8 |
| 29. februar tillatt, vises 28. februar i år uten skuddår | 15 |
| Samme dato kan ikke legges inn to ganger | 8 |
| «+ Legg til ekstra dato» til grensen på 12 | 5, 9 |
| Alle gjøremål gjentas hvert år, ingen egen innstilling for gjentakelse | 4 («↻ Gjentas automatisk hvert år»), 5 (hjelpeteksten under «Datoer») |
| Feilmelding ved feltet, ingenting lagres | 7, 8 |
| Redigering bruker samme skjema og regler | 6 |
| Sletting krever bekreftelse | 10 |
| **4. Lagring** | |
| Melding ved ødelagte data, tom liste, knapp som laster ned kopien | 13 |
| **5. Tilgjengelighet og tastatur** | |
| Prikker nås med Tab og åpnes med Enter | 3, 4 |
| Prikken leses opp som «Tittel, dato» (f.eks. «Vårvask av garasjen, 15. mai») | 3 |
| Knapper, skjemafelt og dialoger kan brukes med tastatur | 4–10 |

Lagring som overlever ny innlasting er ikke med i prototypen. Den er ikke synlig i grensesnittet og hører til #5.

## Til godkjenning

Eier krysser av og godkjenner i en kommentar på #4:

- [ ] Hovedvisningen stemmer med referansen.
- [ ] Dialogene, skjemaet og feilmeldingene er slik de skal være.
- [ ] Tomtilstand og varselet for ødelagte data er slik de skal være.
- [ ] Avvikene i tabellen over er godtatt.
