import {
  MAX_BRANDSTOFRESULTATEN,
  MAX_ZOEKRESULTATEN
} from "./rdw-api.js";
import { getalOfNull } from "./voertuig-score.js";
import {
  formatCarrosserie,
  formatDatum,
  formatGetal,
  formatGezienMelding,
  formatKenteken,
  formatPrijs,
  formatScore,
  formatScoreOnderdelen
} from "./formattering.js";

const RESULTATEN_PER_PAGINA = 20;

function uniekeGesorteerdeWaarden(voertuigen, veld) {
  return [...new Set(voertuigen.map(voertuig => voertuig[veld]).filter(Boolean))]
    .sort((eerste, tweede) => eerste.localeCompare(tweede, "nl"));
}

function vervangFilterOpties(select, waarden, geselecteerdeWaarde = "") {
  select.length = 1;
  for (const waarde of waarden) {
    const optie = document.createElement("option");
    optie.value = waarde;
    optie.textContent = waarde;
    select.appendChild(optie);
  }
  select.value = waarden.includes(geselecteerdeWaarde) ? geselecteerdeWaarde : "";
}

export function toonResultaatFilters(voertuigen) {
  const merkFilter = document.getElementById("filterMerk");
  const kleurFilter = document.getElementById("filterKleur");

  vervangFilterOpties(merkFilter, uniekeGesorteerdeWaarden(voertuigen, "merk"));
  vervangFilterOpties(kleurFilter, uniekeGesorteerdeWaarden(voertuigen, "eerste_kleur"));
  document.getElementById("resultaatFilters").classList.remove("hidden");
}

export function verbergResultaatFilters() {
  const merkFilter = document.getElementById("filterMerk");
  const kleurFilter = document.getElementById("filterKleur");

  merkFilter.value = "";
  kleurFilter.value = "";
  merkFilter.length = 1;
  kleurFilter.length = 1;
  document.getElementById("filterScore").value = "0";
  document.getElementById("sortering").value = "score";
  document.getElementById("resultaatFilters").classList.add("hidden");
}

export function stelScoreBedieningIn(scoreOndersteund) {
  const scoreFilter = document.getElementById("filterScore");
  const scoreSortering = document.getElementById("sorteerOpScore");
  const sortering = document.getElementById("sortering");

  scoreFilter.disabled = !scoreOndersteund;
  scoreSortering.disabled = !scoreOndersteund;
  if (!scoreOndersteund) {
    scoreFilter.value = "0";
    sortering.value = "merk";
  } else {
    sortering.value = "score";
  }
}

function filterVoertuigen(voertuigen, merk, kleur, minimumScore = 0) {
  return voertuigen.filter(voertuig =>
    (!merk || voertuig.merk === merk) &&
    (!kleur || voertuig.eerste_kleur === kleur) &&
    (!minimumScore ||
      (voertuig.bijzonderheidsscore !== null &&
        voertuig.bijzonderheidsscore >= minimumScore))
  );
}

function vergelijkTekst(eerste, tweede) {
  return (eerste ?? "").localeCompare(tweede ?? "", "nl");
}

function vergelijkGetalAflopend(eersteWaarde, tweedeWaarde) {
  const eerste = getalOfNull(eersteWaarde);
  const tweede = getalOfNull(tweedeWaarde);
  if (eerste === null && tweede === null) return 0;
  if (eerste === null) return 1;
  if (tweede === null) return -1;
  return tweede - eerste;
}

function sorteerVoertuigen(voertuigen, sortering) {
  return [...voertuigen].sort((eerste, tweede) => {
    let verschil = 0;
    if (sortering === "score") {
      verschil = vergelijkGetalAflopend(
        eerste.bijzonderheidsscore,
        tweede.bijzonderheidsscore
      );
    } else if (sortering === "vermogen") {
      verschil = vergelijkGetalAflopend(eerste.vermogenPk, tweede.vermogenPk);
    } else if (sortering === "verhouding") {
      verschil = vergelijkGetalAflopend(eerste.pkPerTon, tweede.pkPerTon);
    } else if (sortering === "prijs") {
      verschil = vergelijkGetalAflopend(eerste.catalogusprijs, tweede.catalogusprijs);
    } else if (sortering === "oudste") {
      verschil = vergelijkTekst(
        eerste.datum_eerste_toelating,
        tweede.datum_eerste_toelating
      );
    }

    return verschil ||
      vergelijkTekst(eerste.merk, tweede.merk) ||
      vergelijkTekst(eerste.handelsbenaming, tweede.handelsbenaming) ||
      vergelijkTekst(eerste.kenteken, tweede.kenteken);
  });
}

export function verversResultaatFilterOpties(zoekresultaten) {
  const merkFilter = document.getElementById("filterMerk");
  const kleurFilter = document.getElementById("filterKleur");
  const gekozenMerk = merkFilter.value;
  const gekozenKleur = kleurFilter.value;
  const minimumScore = Number(document.getElementById("filterScore").value);
  const voertuigenMetKleur = filterVoertuigen(
    zoekresultaten,
    "",
    gekozenKleur,
    minimumScore
  );
  const voertuigenVanMerk = filterVoertuigen(
    zoekresultaten,
    gekozenMerk,
    "",
    minimumScore
  );

  vervangFilterOpties(
    merkFilter,
    uniekeGesorteerdeWaarden(voertuigenMetKleur, "merk"),
    gekozenMerk
  );
  vervangFilterOpties(
    kleurFilter,
    uniekeGesorteerdeWaarden(voertuigenVanMerk, "eerste_kleur"),
    gekozenKleur
  );
}

function voertuigenOpPagina(voertuigen, pagina) {
  const begin = (pagina - 1) * RESULTATEN_PER_PAGINA;
  return voertuigen.slice(begin, begin + RESULTATEN_PER_PAGINA);
}

function aantalPaginas(aantalVoertuigen) {
  return Math.ceil(aantalVoertuigen / RESULTATEN_PER_PAGINA);
}

function toonPaginering(aantalVoertuigen, huidigePagina) {
  const paginas = aantalPaginas(aantalVoertuigen);
  const paginering = document.getElementById("paginering");

  if (paginas <= 1) {
    verbergPaginering();
    return;
  }

  document.getElementById("vorigePagina").disabled = huidigePagina === 1;
  document.getElementById("volgendePagina").disabled = huidigePagina === paginas;
  document.getElementById("paginaStatus").textContent =
    `Pagina ${huidigePagina} van ${paginas}`;
  paginering.classList.remove("hidden");
}

export function verbergPaginering() {
  document.getElementById("paginering").classList.add("hidden");
}

function scoreMelding(scoreOndersteund, brandstofResultaatAfgekapt) {
  if (!scoreOndersteund) {
    return " Score en vermogensgegevens zijn alleen beschikbaar bij zoeken op een geheel of gedeeltelijk kenteken.";
  }
  if (brandstofResultaatAfgekapt) {
    return ` De eerste ${MAX_BRANDSTOFRESULTATEN} brandstofregels zijn gebruikt; verfijn het kenteken voor completere bijzonderheidsscores.`;
  }
  return "";
}

function maakGoogleZoekUrl(voertuig, geformatteerdKenteken) {
  const zoektermen = [
    geformatteerdKenteken,
    voertuig.merk,
    voertuig.handelsbenaming
  ].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(zoektermen.join(" "))}`;
}

function rij(label, waarde) {
  if (!waarde) return "";
  return `<div>${label}</div><div class="font-medium text-white">${waarde}</div>`;
}

function maakKaart(voertuig) {
  const kaart = document.createElement("div");
  kaart.className = "bg-gray-800 rounded-2xl p-4 shadow-lg";

  const kenteken = voertuig.kenteken ?? "-";
  const geformatteerdKenteken = formatKenteken(kenteken);
  const autoweekUrl =
    `https://www.autoweek.nl/kentekencheck/${geformatteerdKenteken}/`;
  const googleUrl = maakGoogleZoekUrl(voertuig, geformatteerdKenteken);
  const score = formatScore(voertuig.bijzonderheidsscore);
  const scoreUitleg = formatScoreOnderdelen(voertuig.scoreOnderdelen);
  const gezienMelding = formatGezienMelding(voertuig.gezienOp);
  const vermogen =
    voertuig.vermogenPk === null || voertuig.vermogenPk === undefined
      ? "Onbekend"
      : `${voertuig.vermogenPk} pk (${formatGetal(voertuig.vermogenKw)} kW)`;

  kaart.style.cursor = "pointer";
  kaart.addEventListener("click", () => window.open(autoweekUrl, "_blank"));
  kaart.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <span class="text-yellow-400 font-bold text-xl tracking-widest">${geformatteerdKenteken}</span>
      <div class="text-right">
        <div class="text-yellow-400 font-bold text-lg">🏆 ${score.waarde}</div>
        <div class="text-xs text-gray-400">${score.label}</div>
      </div>
    </div>
    <div class="text-white text-lg font-semibold">${voertuig.merk ?? ""} ${voertuig.handelsbenaming ?? ""}</div>
    ${gezienMelding ? `
      <div class="mt-2 rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300">
        <span class="font-semibold">${gezienMelding}</span>
      </div>` : ""}
    <div class="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-300">
      ${rij("🎨 Kleur", voertuig.eerste_kleur)}
      ${rij("📅 Toelating", formatDatum(voertuig.datum_eerste_toelating))}
      ${rij("⚙️ Brandstof", voertuig.brandstof_omschrijving ?? "Onbekend")}
      ${rij("💨 CO2", voertuig.co2_uitstoot_gecombineerd ? voertuig.co2_uitstoot_gecombineerd + " g/km" : null)}
      ${rij("🏋️ Massa", voertuig.massa_rijklaar ? voertuig.massa_rijklaar + " kg" : null)}
      ${rij("🚘 Carrosserie", formatCarrosserie(voertuig.inrichting))}
      ${rij("🔢 Cilinders", voertuig.aantal_cilinders)}
      ${rij("💪 Vermogen", vermogen)}
      ${rij("⚖️ Pk per ton", voertuig.pkPerTon ? voertuig.pkPerTon : null)}
      ${rij("💶 Catalogusprijs", formatPrijs(voertuig.catalogusprijs))}
    </div>
    ${scoreUitleg ? `<div class="mt-3 text-xs text-gray-400">Bijzonderheidsscore: ${scoreUitleg}</div>` : ""}
    <div class="mt-3 flex justify-end gap-4 text-xs">
      <a href="${autoweekUrl}" target="_blank" rel="noopener noreferrer"
        class="externe-link text-gray-400 hover:text-yellow-400">↗ AutoWeek</a>
      <a href="${googleUrl}" target="_blank" rel="noopener noreferrer"
        class="externe-link text-gray-400 hover:text-yellow-400">↗ Google</a>
    </div>`;
  for (const link of kaart.querySelectorAll(".externe-link")) {
    link.addEventListener("click", gebeurtenis => gebeurtenis.stopPropagation());
  }
  return kaart;
}

export function toonGefilterdeResultaten({
  zoekresultaten,
  huidigePagina,
  scoreOndersteund,
  brandstofResultaatAfgekapt
}) {
  const merk = document.getElementById("filterMerk").value;
  const kleur = document.getElementById("filterKleur").value;
  const minimumScore = Number(document.getElementById("filterScore").value);
  const sortering = document.getElementById("sortering").value;
  const voertuigen = sorteerVoertuigen(
    filterVoertuigen(zoekresultaten, merk, kleur, minimumScore),
    sortering
  );
  const paginas = aantalPaginas(voertuigen.length);
  const geldigePagina = Math.min(huidigePagina, Math.max(paginas, 1));
  const container = document.getElementById("resultaten");

  container.innerHTML = "";
  for (const voertuig of voertuigenOpPagina(voertuigen, geldigePagina)) {
    container.appendChild(maakKaart(voertuig));
  }
  toonPaginering(voertuigen.length, geldigePagina);

  const melding = scoreMelding(scoreOndersteund, brandstofResultaatAfgekapt);
  const status = document.getElementById("status");
  if (!voertuigen.length) {
    status.textContent = "❌ Geen resultaten voor deze filters.";
  } else if (zoekresultaten.length === MAX_ZOEKRESULTATEN) {
    status.textContent = `✅ ${voertuigen.length} van maximaal ${MAX_ZOEKRESULTATEN} opgehaalde resultaten; verfijn de zoekopdracht voor een vollediger resultaat.${melding}`;
  } else if (voertuigen.length === zoekresultaten.length) {
    status.textContent = `✅ ${voertuigen.length} resultaat/resultaten${melding}`;
  } else {
    status.textContent =
      `✅ ${voertuigen.length} van ${zoekresultaten.length} resultaten${melding}`;
  }
  return geldigePagina;
}
