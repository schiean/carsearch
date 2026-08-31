# Carsearch — Initieel Ontwerp

## Doel

Een simpele web-app om onderweg (op de iPhone) kentekens op te zoeken via de RDW Open Data API, met fuzzy/partial search en merk-filters, om zo (bijvoorbeeld) een supercar te kunnen herkennen aan een deels gelezen kenteken.

## Use cases

- Volledig kenteken invoeren en details ophalen.
- Gedeeltelijk (fout gelezen) kenteken invoeren en fuzzy zoeken.
- Filteren op merk + "bevat cijfer/letter" combinatie (bijv. Ferrari met `T-...55`).

## Gekozen aanpak

- **Geen backend nodig**: RDW Open Data (Socrata platform) staat CORS toe (`Access-Control-Allow-Origin: *`), dus rechtstreeks vanuit browser-JavaScript te bevragen.
- Eén statische `index.html` met vanilla JS + Tailwind CDN, geen build-stap.
- Hosting: gratis via GitHub Pages (of Netlify/Cloudflare Pages).
- Op iPhone: openen in Safari → "Voeg toe aan beginscherm" (PWA-achtige ervaring via `manifest.json`).

## RDW Open Data API

- Base URL: `https://opendata.rdw.nl/resource/m9d7-ebf2.json` (Gekentekende voertuigen, Socrata SoQL API).
- Querying via `$where`, `$select`, `$limit`, `$order` query parameters (SoQL syntax).
- Voorbeeld filters:
  - Exact kenteken: `kenteken='SIDZ26'`
  - Partial/fuzzy: `starts_with(kenteken,'SI')`
  - Merk: `upper(merk)='FERRARI'`
  - Bevat cijfers/letters: `contains(kenteken,'55')`
- Alleen personenauto's: permanente filter `voertuigsoort='Personenauto'` toegevoegd aan elke query.

## Functionaliteit in de app

- Zoekvelden: Kenteken (volledig of gedeeltelijk), Merk, "Bevat" (cijfers/letters).
- Een uitgevoerde zoekopdracht wordt vastgelegd in leesbare URL-parameters (`kenteken`, `merk` en `bevat`). Bij het openen van zo'n gedeelde URL worden de velden hersteld en wordt de zoekopdracht automatisch uitgevoerd.
- Maximaal 500 resultaten ophalen en lokaal filteren op merk en/of eerste kleur, zonder een nieuwe API-aanvraag.
- De merk- en kleurfilters beperken elkaars beschikbare opties tot combinaties die in de opgehaalde resultaten voorkomen.
- Gefilterde resultaten client-side pagineren met 20 voertuigen per pagina.
- Resultaten als kaarten met o.a. merk, handelsbenaming, kleur, datum eerste toelating, brandstof, CO2-uitstoot, massa, cilinders, vermogen.
- Bij zoeken op een geheel of gedeeltelijk kenteken worden brandstof- en vermogensgegevens parallel opgehaald uit de RDW-brandstofdataset en in de browser gekoppeld op kenteken.
- Een zichtbare en verklaarde sportwagenscore combineert niet-elektrisch vermogen, pk per ton, sportieve carrosserie, catalogusprijs en leeftijd. Resultaten kunnen op score worden gesorteerd en op een minimumscore worden gefilterd.
- Bij zoekopdrachten zonder kenteken worden geen aanvullende brandstofgegevens opgehaald; score en vermogen worden als onbekend getoond met een toelichting boven de resultaten.
- Kenteken-formattering: robuuste functie die splitst op overgangen tussen letters/cijfers, en groepen van 4+ tekens in tweeën splitst (want NL-kentekens hebben meerdere notatie-varianten, geen uniform formaat).
- Klikbare kaart: opent `https://www.autoweek.nl/kentekencheck/<geformatteerd-kenteken>/` in een nieuw tabblad voor uitgebreide info.

## Openstaande/toekomstige verbeteringen

- Overweeg de zoekfunctie (`zoek()`) op te splitsen in kleinere, side-effect-vrije methoden (huidige functie doet meerdere dingen: input lezen, filter opbouwen, fetch, renderen).
- Eventueel caching van resultaten voor snellere herhaalde zoekopdrachten.
