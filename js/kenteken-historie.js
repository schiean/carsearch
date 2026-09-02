let kentekenHistorieAanvraag;

function parseCsvRegel(regel) {
  const velden = [];
  let waarde = "";
  let tussenAanhalingstekens = false;

  for (let positie = 0; positie < regel.length; positie++) {
    const teken = regel[positie];
    if (teken === '"' && tussenAanhalingstekens && regel[positie + 1] === '"') {
      waarde += '"';
      positie++;
    } else if (teken === '"') {
      tussenAanhalingstekens = !tussenAanhalingstekens;
    } else if (teken === "," && !tussenAanhalingstekens) {
      velden.push(waarde);
      waarde = "";
    } else {
      waarde += teken;
    }
  }
  velden.push(waarde);
  return velden;
}

function haalKentekenUitZoekopdracht(zoekopdracht) {
  const delen = zoekopdracht.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  let kandidaat = "";

  for (const deel of delen) {
    kandidaat += deel;
    if (kandidaat.length === 6) {
      return /[A-Z]/.test(kandidaat) && /\d/.test(kandidaat)
        ? kandidaat
        : null;
    }
    if (kandidaat.length > 6) return null;
  }
  return null;
}

function parseKentekenHistorie(csv) {
  const historie = new Map();
  const regels = csv.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const regel of regels.slice(1)) {
    if (!regel.trim()) continue;
    const [zoekopdracht, tijdstip] = parseCsvRegel(regel);
    const kenteken = haalKentekenUitZoekopdracht(zoekopdracht ?? "");
    const gezienOp = new Date(tijdstip);
    if (!kenteken || Number.isNaN(gezienOp.getTime())) continue;

    const datums = historie.get(kenteken) ?? [];
    datums.push(gezienOp);
    historie.set(kenteken, datums);
  }

  for (const [kenteken, datums] of historie) {
    datums.sort((eerste, tweede) => tweede.getTime() - eerste.getTime());
    historie.set(kenteken, datums);
  }
  return historie;
}

export function haalKentekenHistorie() {
  kentekenHistorieAanvraag ??= fetch("kenteken.csv")
    .then(antwoord => {
      if (!antwoord.ok) {
        throw new Error(`kentekenhistorie gaf status ${antwoord.status}`);
      }
      return antwoord.text();
    })
    .then(parseKentekenHistorie);
  return kentekenHistorieAanvraag;
}
