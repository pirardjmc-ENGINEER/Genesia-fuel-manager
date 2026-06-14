function interpolateFromMM(table, mm) {
  if (mm <= table[0][0]) {
    return { mm: table[0][0], percent: table[0][1], litres: table[0][2] * 1000, warning: "Sous minimum table" };
  }

  if (mm >= table[table.length - 1][0]) {
    const last = table[table.length - 1];
    return { mm: last[0], percent: last[1], litres: last[2] * 1000, warning: "Au-dessus maximum table" };
  }

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];

    if (mm >= a[0] && mm <= b[0]) {
      const ratio = (mm - a[0]) / (b[0] - a[0]);
      return {
        mm,
        percent: a[1] + ratio * (b[1] - a[1]),
        litres: (a[2] + ratio * (b[2] - a[2])) * 1000,
        warning: ""
      };
    }
  }
}

function interpolateFromLitres(table, litres) {
  const converted = table.map(row => [row[0], row[1], row[2] * 1000]);

  if (litres <= converted[0][2]) {
    return { mm: converted[0][0], percent: converted[0][1], litres: converted[0][2], warning: "Sous minimum table" };
  }

  if (litres >= converted[converted.length - 1][2]) {
    const last = converted[converted.length - 1];
    return { mm: last[0], percent: last[1], litres: last[2], warning: "Au-dessus capacité max" };
  }

  for (let i = 0; i < converted.length - 1; i++) {
    const a = converted[i];
    const b = converted[i + 1];

    if (litres >= a[2] && litres <= b[2]) {
      const ratio = (litres - a[2]) / (b[2] - a[2]);
      return {
        mm: a[0] + ratio * (b[0] - a[0]),
        percent: a[1] + ratio * (b[1] - a[1]),
        litres,
        warning: ""
      };
    }
  }
}

function maxLitres(tankKey) {
  return tanks[tankKey].table[tanks[tankKey].table.length - 1][2] * 1000;
}

console.log("Genesia Fuel Manager chargé ✅");
