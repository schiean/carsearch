import { getalOfNull } from "./voertuig-score.js";

export function formatKenteken(raw) {
  if (!raw || raw === "-") return raw;
  const delen = raw.match(/[A-Z]+|\d+/g) ?? [];
  const segmenten = delen.flatMap(deel => {
    if (deel.length >= 4) {
      const midden = Math.ceil(deel.length / 2);
      return [deel.slice(0, midden), deel.slice(midden)];
    }
    return [deel];
  });
  return segmenten.join("-");
}

export function formatCarrosserie(inrichting) {
  if (!inrichting || inrichting === "Niet geregistreerd") return null;
  return inrichting.charAt(0).toUpperCase() + inrichting.slice(1);
}

export function formatGezienMelding(datums) {
  if (!datums?.length) return "";
  const uniekeDatums = new Set();
  for (const datum of datums) {
    uniekeDatums.add(datum.toISOString().slice(0, 10));
  }
  const geformatteerdeDatums = [...uniekeDatums]
    .map(datum => formatDatum(datum.replaceAll("-", "")));
  if (geformatteerdeDatums.length === 1) {
    return `Seen before! ${geformatteerdeDatums[0]}`;
  }
  return `Seen ${geformatteerdeDatums.length} times before! Most recent: ${geformatteerdeDatums[0]}. First time: ${geformatteerdeDatums.at(-1)}`;
}

export function formatScoreOnderdelen(onderdelen) {
  if (!onderdelen?.length) return "";
  return onderdelen
    .map(onderdeel => `${onderdeel.label} ${onderdeel.score}`)
    .join(" · ");
}

export function formatScore(score) {
  if (score === null || score === undefined) {
    return { waarde: "Onbekend", label: "Geen vermogensgegevens" };
  }
  if (score >= 650) return { waarde: score, label: "Exotisch" };
  if (score >= 450) return { waarde: score, label: "Zeer bijzonder" };
  if (score >= 250) return { waarde: score, label: "Sportief" };
  if (score >= 100) return { waarde: score, label: "Interessant" };
  return { waarde: score, label: "Normaal" };
}

export function formatGetal(waarde) {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(waarde);
}

export function formatPrijs(waarde) {
  const prijs = getalOfNull(waarde);
  if (prijs === null) return null;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(prijs);
}

export function formatDatum(datum) {
  if (!datum || datum.length < 8) return datum ?? "-";
  return `${datum.slice(6, 8)}-${datum.slice(4, 6)}-${datum.slice(0, 4)}`;
}
