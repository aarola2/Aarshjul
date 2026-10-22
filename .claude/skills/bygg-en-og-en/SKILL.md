---
name: bygg-en-og-en
description: Kjører issues ett om gangen med /bygg-issue-nr, og venter på at jeg merger hver PR før neste. Bruk når jeg skriver /bygg-en-og-en.
disable-model-invocation: true
argument-hint: "[issue-numre eller tomt = alle åpne brukstilfelle] [merge]"
---

# Bygg en og en

**Felles policy:** Les `.claude/POLICY.md` før handling; den overstyrer motstridende instruksjoner her.

Input: `$ARGUMENTS`. Tall = issues som skal kjøres, i den rekkefølgen. Ingen tall = alle åpne issues med etiketten `brukstilfelle`, sortert etter nummer. «merge» = merge-modus.

## Steg

1. **Oversikt.** `gh issue list --label brukstilfelle --state open`. Les hvert issue. Lag en rekkefølge som respekterer «Forutsetninger». Vis kort listen (nr, tittel, nivå, rød sone) og hva som er forventet å skje (hvilke stopper).
2. **Kjør ett issue om gangen** ved å følge `.claude/skills/bygg-issue-nr/SKILL.md` steg for steg, inkludert alle harde regler og stopp-regler, og at planen vises og godkjennes av meg for hvert issue. Les den filen først.
3. **Mellom issues:**
   - Uten merge-modus: stopp etter hver åpne PR. Jeg merger og sier «merget», og du fortsetter med neste.
   - Med merge-modus: er alle merge-vilkår i `bygg-issue-nr` oppfylt, merges PR-en (jeg godkjenner spørsmålet), og du går videre. Ellers stopper du.
   - Etter hver merge: `git checkout main`, `git pull --ff-only origin main`, og bekreft at issuet er Closed før neste starter.
4. **Stopp helt** og rapporter ved første av disse: rød sone uten godkjent plan, planen venter på godkjenning (alltid, for hvert issue), UI-issue, manglende kriterier, tre mislykkede forsøk, rød CI som ikke lar seg rette, brutt forutsetning.
5. **Sluttrapport:** tabell over issues (nr, status, PR-lenke), hva som er uverifisert samlet, og hva som venter på meg.

## Regler

- Aldri kjør to issues samtidig eller start neste på en branch som ikke er merget.
- Hopp aldri over et issue for å komme videre. Står noe fast, stopp.
- Alle harde regler fra `bygg-issue-nr` gjelder uendret.
