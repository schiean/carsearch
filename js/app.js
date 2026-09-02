import {
  haalBrandstofGegevens,
  haalVoertuigGegevens,
  MAX_BRANDSTOFRESULTATEN
} from "./rdw-api.js";
import { haalKentekenHistorie } from "./kenteken-historie.js";
import { verrijkVoertuigen } from "./voertuig-score.js";
import {
  stelScoreBedieningIn,
  toonGefilterdeResultaten,
  toonResultaatFilters,
  verbergPaginering,
  verbergResultaatFilters,
  verversResultaatFilterOpties
} from "./resultaten.js";

let zoekresultaten = [];
let huidigePagina = 1;
let scoreOndersteund = false;
let brandstofResultaatAfgekapt = false;

function leesZoekcriteriaUitFormulier() {
  return {
    kenteken: document.getElementById("inpKenteken").value
      .replace(/-/g, "")
      .toUpperCase()
      .trim(),
    merk: document.getElementById("inpMerk").value.trim().toUpperCase(),
    bevat: document.getElementById("inpLetters").value
      .replace(/-/g, "")
      .toUpperCase()
      .trim()
  };
}

function werkZoekUrlBij(zoekcriteria) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  for (const [naam, waarde] of Object.entries(zoekcriteria)) {
    if (waarde) params.set(naam, waarde);
  }

  url.search = params.toString();
  window.history.replaceState(null, "", url);
}

function herstelZoekcriteriaUitUrl() {
  const params = new URLSearchParams(window.location.search);
  const zoekcriteria = {
    kenteken: params.get("kenteken") ?? "",
    merk: params.get("merk") ?? "",
    bevat: params.get("bevat") ?? ""
  };

  document.getElementById("inpKenteken").value = zoekcriteria.kenteken;
  document.getElementById("inpMerk").value = zoekcriteria.merk;
  document.getElementById("inpLetters").value = zoekcriteria.bevat;
  return zoekcriteria;
}

function setStatus(tekst) {
  document.getElementById("status").textContent = tekst;
}

function verversResultaten() {
  huidigePagina = toonGefilterdeResultaten({
    zoekresultaten,
    huidigePagina,
    scoreOndersteund,
    brandstofResultaatAfgekapt
  });
}

async function zoek(urlBijwerken = true) {
  const zoekcriteria = leesZoekcriteriaUitFormulier();
  const { kenteken, merk, bevat } = zoekcriteria;

  document.getElementById("resultaten").innerHTML = "";
  zoekresultaten = [];
  huidigePagina = 1;
  scoreOndersteund = Boolean(kenteken);
  brandstofResultaatAfgekapt = false;
  verbergResultaatFilters();
  verbergPaginering();
  setStatus("⏳ Zoeken...");

  if (!merk && !bevat && !kenteken) {
    setStatus("⚠️ Vul minimaal één zoekveld in.");
    return;
  }

  if (urlBijwerken) {
    werkZoekUrlBij(zoekcriteria);
  }

  try {
    const voertuigAanvraag = haalVoertuigGegevens(zoekcriteria);
    const brandstofAanvraag = kenteken
      ? haalBrandstofGegevens(kenteken)
      : Promise.resolve([]);
    const [voertuigen, brandstofGegevens, kentekenHistorie] = await Promise.all([
      voertuigAanvraag,
      brandstofAanvraag,
      haalKentekenHistorie()
    ]);

    if (!voertuigen.length) {
      setStatus("❌ Geen resultaten gevonden.");
      return;
    }

    brandstofResultaatAfgekapt =
      brandstofGegevens.length === MAX_BRANDSTOFRESULTATEN;
    zoekresultaten = scoreOndersteund
      ? verrijkVoertuigen(voertuigen, brandstofGegevens, kentekenHistorie)
      : voertuigen.map(voertuig => ({
        ...voertuig,
        gezienOp: kentekenHistorie.get(voertuig.kenteken) ?? [],
        bijzonderheidsscore: null
      }));
    stelScoreBedieningIn(scoreOndersteund);
    if (voertuigen.length > 1) {
      toonResultaatFilters(zoekresultaten);
    }
    verversResultaten();
  } catch (fout) {
    setStatus("🔴 Fout bij ophalen: " + fout.message);
  }
}

function pasResultaatFiltersToe() {
  huidigePagina = 1;
  verversResultaatFilterOpties(zoekresultaten);
  verversResultaten();
}

function wijzigPagina(stap) {
  huidigePagina += stap;
  verversResultaten();
  document.getElementById("status").scrollIntoView({ behavior: "smooth" });
}

document.getElementById("zoekKnop").addEventListener("click", () => zoek());
document.addEventListener("keydown", gebeurtenis => {
  if (gebeurtenis.key === "Enter") zoek();
});
document.getElementById("filterMerk")
  .addEventListener("change", pasResultaatFiltersToe);
document.getElementById("filterKleur")
  .addEventListener("change", pasResultaatFiltersToe);
document.getElementById("filterScore")
  .addEventListener("change", pasResultaatFiltersToe);
document.getElementById("sortering")
  .addEventListener("change", pasResultaatFiltersToe);
document.getElementById("vorigePagina")
  .addEventListener("click", () => wijzigPagina(-1));
document.getElementById("volgendePagina")
  .addEventListener("click", () => wijzigPagina(1));

const zoekcriteriaUitUrl = herstelZoekcriteriaUitUrl();
if (Object.values(zoekcriteriaUitUrl).some(Boolean)) {
  zoek(false);
}
