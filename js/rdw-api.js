const VOERTUIGEN_BASE = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const BRANDSTOFFEN_BASE = "https://opendata.rdw.nl/resource/8ys7-d773.json";

export const MAX_ZOEKRESULTATEN = 500;
export const MAX_BRANDSTOFRESULTATEN = 1000;

async function haalRdwGegevens(base, params) {
  const antwoord = await fetch(`${base}?${params}`);
  if (!antwoord.ok) {
    throw new Error(`RDW gaf status ${antwoord.status}`);
  }

  const gegevens = await antwoord.json();
  if (!Array.isArray(gegevens)) {
    throw new Error("RDW gaf een onverwacht antwoord");
  }
  return gegevens;
}

function maakKentekenFilter(kenteken) {
  return kenteken.length >= 6
    ? `kenteken='${kenteken}'`
    : `starts_with(kenteken,'${kenteken}')`;
}

export function haalVoertuigGegevens({ kenteken, merk, bevat }) {
  const filters = ["voertuigsoort='Personenauto'"];
  if (kenteken) filters.push(maakKentekenFilter(kenteken));
  if (merk) filters.push(`upper(merk)='${merk}'`);
  if (bevat) filters.push(`contains(kenteken,'${bevat}')`);

  const params = new URLSearchParams({
    $where: filters.join(" AND "),
    $limit: MAX_ZOEKRESULTATEN,
    $order: kenteken ? "kenteken ASC" : "merk ASC"
  });
  return haalRdwGegevens(VOERTUIGEN_BASE, params);
}

export function haalBrandstofGegevens(kenteken) {
  const params = new URLSearchParams({
    $select: [
      "kenteken",
      "brandstof_omschrijving",
      "nettomaximumvermogen",
      "netto_max_vermogen_elektrisch",
      "nominaal_continu_maximumvermogen",
      "co2_uitstoot_gecombineerd"
    ].join(","),
    $where: maakKentekenFilter(kenteken),
    $limit: MAX_BRANDSTOFRESULTATEN,
    $order: "kenteken ASC"
  });
  return haalRdwGegevens(BRANDSTOFFEN_BASE, params);
}
