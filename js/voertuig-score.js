const EERDER_GEZIEN_BONUS = 200;

export function getalOfNull(waarde) {
  if (waarde === null || waarde === undefined || waarde === "") return null;
  const getal = Number(waarde);
  return Number.isFinite(getal) ? getal : null;
}

function maximumVeldwaarde(records, velden) {
  let maximum = null;
  for (const record of records) {
    for (const veld of velden) {
      const waarde = getalOfNull(record[veld]);
      if (waarde !== null && (maximum === null || waarde > maximum)) {
        maximum = waarde;
      }
    }
  }
  return maximum;
}

function jaarOfNull(datum) {
  if (!datum || String(datum).length < 4) return null;
  const jaar = Number(String(datum).slice(0, 4));
  return Number.isInteger(jaar) ? jaar : null;
}

function begrens(waarde, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, waarde));
}

function berekenCarrosserieScore(inrichting) {
  const carrosserie = (inrichting ?? "").toLowerCase();
  if (carrosserie === "coupe" || carrosserie === "cabriolet") return 150;
  if (carrosserie === "limousine") return 25;
  return 0;
}

function berekenTijdsfactor(leeftijd) {
  if (leeftijd === null) return 1;
  return begrens(2 ** (leeftijd / 30), 1, 2.5);
}

function formatTijdsfactor(tijdsfactor) {
  return tijdsfactor.toFixed(2).replace(".", ",");
}

function berekenBijzonderheidsscore(voertuig, huidigJaar) {
  const vermogenPk = voertuig.vermogenPk;
  const massaKg = getalOfNull(voertuig.massa_rijklaar);
  const catalogusprijs = getalOfNull(voertuig.catalogusprijs);
  const toelatingsjaar = jaarOfNull(voertuig.datum_eerste_toelating);
  const leeftijd = toelatingsjaar === null ? null : Math.max(0, huidigJaar - toelatingsjaar);
  const heeftBeoordelingsgegevens =
    vermogenPk !== null || massaKg !== null || catalogusprijs !== null || leeftijd !== null;

  if (!heeftBeoordelingsgegevens) {
    return { totaal: null, onderdelen: [] };
  }

  const pkPerTon = vermogenPk === null || massaKg === null || massaKg <= 0
    ? null
    : vermogenPk / (massaKg / 1000);
  const tijdsfactor = berekenTijdsfactor(leeftijd);
  const tijdgecorrigeerdePkPerTon = pkPerTon === null
    ? null
    : pkPerTon * tijdsfactor;
  const teltVermogenMee = !voertuig.isVolledigElektrisch && vermogenPk !== null;
  const vermogenScore = teltVermogenMee
    ? begrens((vermogenPk - 200) * 0.5, 0, 100)
    : 0;
  const hoogVermogenBonus = teltVermogenMee && vermogenPk > 350
    ? begrens(25 + (vermogenPk - 350) * 0.5, 0, 100)
    : 0;
  const verhoudingScore = teltVermogenMee && tijdgecorrigeerdePkPerTon !== null
    ? begrens((tijdgecorrigeerdePkPerTon - 120) * 1.25, 0, 250)
    : 0;
  const prijsScore = catalogusprijs !== null && catalogusprijs > 100_000
    ? begrens(25 + (catalogusprijs - 100_000) / 2000, 0, 150)
    : 0;
  const klassiekerScore = leeftijd !== null
    ? begrens((leeftijd - 30) * 2, 0, 100)
    : 0;
  const carrosserieScore = berekenCarrosserieScore(voertuig.inrichting);
  const eerderGezienScore = voertuig.gezienOp?.length ? EERDER_GEZIEN_BONUS : 0;
  const verhoudingLabel = tijdsfactor > 1
    ? `Pk/ton (tijd x${formatTijdsfactor(tijdsfactor)})`
    : "Pk/ton";
  const onderdelen = [
    { label: "Vermogen", score: vermogenScore + hoogVermogenBonus },
    { label: verhoudingLabel, score: verhoudingScore },
    { label: "Carrosserie", score: carrosserieScore },
    { label: "Prijs", score: prijsScore },
    { label: "Klassieker", score: klassiekerScore },
    { label: "Eerder gezien", score: eerderGezienScore }
  ].filter(onderdeel => onderdeel.score > 0);
  const totaal = onderdelen.reduce((som, onderdeel) => som + onderdeel.score, 0);

  return {
    totaal: Math.round(totaal),
    onderdelen: onderdelen.map(onderdeel => ({
      ...onderdeel,
      score: Math.round(onderdeel.score)
    }))
  };
}

function groepeerBrandstofOpKenteken(brandstofGegevens) {
  const perKenteken = new Map();
  for (const record of brandstofGegevens) {
    const records = perKenteken.get(record.kenteken) ?? [];
    records.push(record);
    perKenteken.set(record.kenteken, records);
  }
  return perKenteken;
}

function verrijkVoertuig(voertuig, brandstofRecords, gezienOp, huidigJaar) {
  const brandstoffen = [...new Set(
    brandstofRecords.map(record => record.brandstof_omschrijving).filter(Boolean)
  )];
  const isVolledigElektrisch =
    brandstoffen.length > 0 &&
    brandstoffen.every(brandstof => brandstof === "Elektriciteit");
  const verbrandingsvermogenKw = maximumVeldwaarde(
    brandstofRecords,
    ["nettomaximumvermogen"]
  );
  const elektrischVermogenKw = maximumVeldwaarde(
    brandstofRecords,
    ["netto_max_vermogen_elektrisch", "nominaal_continu_maximumvermogen"]
  );
  const vermogenKw = isVolledigElektrisch
    ? elektrischVermogenKw
    : verbrandingsvermogenKw;
  const vermogenPk = vermogenKw === null ? null : Math.round(vermogenKw * 1.35962);
  const massaKg = getalOfNull(voertuig.massa_rijklaar);
  const pkPerTon = vermogenPk === null || massaKg === null || massaKg <= 0
    ? null
    : Math.round(vermogenPk / (massaKg / 1000));
  const verrijktVoertuig = {
    ...voertuig,
    gezienOp,
    brandstof_omschrijving: brandstoffen.join(" + ") || null,
    co2_uitstoot_gecombineerd: maximumVeldwaarde(
      brandstofRecords,
      ["co2_uitstoot_gecombineerd"]
    ),
    isVolledigElektrisch,
    vermogenKw,
    vermogenPk,
    pkPerTon
  };
  const bijzonderheidsscore = brandstofRecords.length
    ? berekenBijzonderheidsscore(verrijktVoertuig, huidigJaar)
    : { totaal: null, onderdelen: [] };

  return {
    ...verrijktVoertuig,
    bijzonderheidsscore: bijzonderheidsscore.totaal,
    scoreOnderdelen: bijzonderheidsscore.onderdelen
  };
}

export function verrijkVoertuigen(voertuigen, brandstofGegevens, kentekenHistorie) {
  const brandstofPerKenteken = groepeerBrandstofOpKenteken(brandstofGegevens);
  const huidigJaar = new Date().getFullYear();
  return voertuigen.map(voertuig =>
    verrijkVoertuig(
      voertuig,
      brandstofPerKenteken.get(voertuig.kenteken) ?? [],
      kentekenHistorie.get(voertuig.kenteken) ?? [],
      huidigJaar
    )
  );
}
