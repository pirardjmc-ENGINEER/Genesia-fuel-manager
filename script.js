let currentROB = null;

function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });
  document.getElementById(tabId).classList.add("active");
}

function interpolateFromMM(table, mm) {
  if (mm <= table[0][0]) {
    return {
      mm: table[0][0],
      percent: table[0][1],
      litres: table[0][2] * 1000,
      warning: "Sous minimum table"
    };
  }

  if (mm >= table[table.length - 1][0]) {
    const last = table[table.length - 1];
    return {
      mm: last[0],
      percent: last[1],
      litres: last[2] * 1000,
      warning: "Au-dessus maximum table"
    };
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
    return {
      mm: converted[0][0],
      percent: converted[0][1],
      litres: converted[0][2],
      warning: "Sous minimum table"
    };
  }

  if (litres >= converted[converted.length - 1][2]) {
    const last = converted[converted.length - 1];
    return {
      mm: last[0],
      percent: last[1],
      litres: last[2],
      warning: "Au-dessus capacité max"
    };
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
  const table = tanks[tankKey].table;
  return table[table.length - 1][2] * 1000;
}

function calculateByMode(tankKey, mode, value) {
  if (mode === "mm") {
    return interpolateFromMM(tanks[tankKey].table, value);
  }
  return interpolateFromLitres(tanks[tankKey].table, value);
}

function fillTankSelects() {
  const select = document.getElementById("convertTank");
  select.innerHTML = "";

  for (const key in tanks) {
    select.innerHTML += `<option value="${key}">${tanks[key].name}</option>`;
  }
}

function createTankInputs(containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (const key in tanks) {
    container.innerHTML += `
      <div class="tank-line">
        <label>${tanks[key].name}</label>
        <select id="${prefix}_mode_${key}">
          <option value="mm">mm</option>
          <option value="litres">litres</option>
        </select>
        <input id="${prefix}_value_${key}" type="number" placeholder="Valeur">
      </div>
    `;
  }
}

function calculateConversion() {
  const tankKey = document.getElementById("convertTank").value;
  const mode = document.getElementById("convertMode").value;
  const value = parseFloat(document.getElementById("convertValue").value);
  const result = document.getElementById("convertResult");

  if (isNaN(value)) {
    result.innerHTML = "Valeur invalide.";
    return;
  }

  const data = calculateByMode(tankKey, mode, value);

  result.innerHTML = `
    ${tanks[tankKey].name}<br>
    ${data.litres.toFixed(0)} L<br>
    ${data.mm.toFixed(0)} mm<br>
    ${data.percent.toFixed(1)} %
    ${data.warning ? `<br><span style="color:#ffcc66">${data.warning}</span>` : ""}
  `;
}

function getROBFromInputs(prefix) {
  let total = 0;
  let capacity = 0;
  const details = [];

  for (const key in tanks) {
    const mode = document.getElementById(`${prefix}_mode_${key}`).value;
    const value = parseFloat(document.getElementById(`${prefix}_value_${key}`).value);

    let data = { litres: 0, mm: 0, percent: 0, warning: "" };

    if (!isNaN(value)) {
      data = calculateByMode(key, mode, value);
    }

    const max = maxLitres(key);
    total += data.litres;
    capacity += max;

    details.push({
      key,
      name: tanks[key].name,
      litres: data.litres,
      mm: data.mm,
      percent: data.percent,
      capacity: max,
      warning: data.warning
    });
  }

  return { total, capacity, details };
}

function calculateROB() {
  const rob = getROBFromInputs("rob");
  currentROB = rob;

  const globalPercent = rob.capacity > 0 ? (rob.total / rob.capacity) * 100 : 0;

  let rows = "";
  rob.details.forEach(tank => {
    rows += `
      <tr>
        <td>${tank.name}</td>
        <td>${tank.litres.toFixed(0)} L</td>
        <td>${tank.mm.toFixed(0)} mm</td>
        <td>${tank.percent.toFixed(1)} %</td>
      </tr>
    `;
  });

  document.getElementById("robResult").innerHTML = `
    ROB TOTAL : ${rob.total.toFixed(0)} L<br>
    ${globalPercent.toFixed(1)} % global<br>
    Capacité restante : ${(rob.capacity - rob.total).toFixed(0)} L
    <table>
      <tr><th>Tank</th><th>L</th><th>mm</th><th>%</th></tr>
      ${rows}
    </table>
  `;

  updateDashboard(rob);
}

function calculateBunker() {
  const rob = getROBFromInputs("bunker");
  const margin = parseFloat(document.getElementById("securityMargin").value) || 5;
  const planned = parseFloat(document.getElementById("bunkerQty").value) || 0;

  let safeCapacity = 0;
  let remainingSafe = 0;
  let remainingFull = 0;

  rob.details.forEach(tank => {
    const safe = tank.capacity * (1 - margin / 100);
    safeCapacity += safe;
    remainingSafe += Math.max(safe - tank.litres, 0);
    remainingFull += Math.max(tank.capacity - tank.litres, 0);
  });

  const finalROB = rob.total + planned;

  let alert = "";
  if (planned <= remainingSafe) {
    alert = `<span style="color:#00e6b8">OK : avitaillement sous limite sécurité.</span>`;
  } else if (planned <= remainingFull) {
    alert = `<span style="color:#ffcc66">Attention : dépasse marge sécurité de ${(planned - remainingSafe).toFixed(0)} L.</span>`;
  } else {
    alert = `<span style="color:#ff6b6b">RISQUE DÉBORDEMENT : dépasse capacité max de ${(planned - remainingFull).toFixed(0)} L.</span>`;
  }

  document.getElementById("bunkerResult").innerHTML = `
    ROB actuel : ${rob.total.toFixed(0)} L<br>
    Limite sécurité : ${safeCapacity.toFixed(0)} L<br>
    Max embarquable sécurité : ${remainingSafe.toFixed(0)} L<br>
    Max avant plein théorique : ${remainingFull.toFixed(0)} L<br>
    ROB final prévu : ${finalROB.toFixed(0)} L<br><br>
    ${alert}
  `;
}

function calculateCharter() {
  const start = parseFloat(document.getElementById("robStart").value);
  const end = parseFloat(document.getElementById("robEnd").value);
  const dateStart = document.getElementById("dateStart").value;
  const dateEnd = document.getElementById("dateEnd").value;
  const result = document.getElementById("charterResult");

  if (isNaN(start) || isNaN(end)) {
    result.innerHTML = "ROB début ou fin invalide.";
    return;
  }

  const consumption = start - end;
  let extra = "";

  if (dateStart && dateEnd) {
    const d1 = new Date(dateStart);
    const d2 = new Date(dateEnd);
    const diffDays = (d2 - d1) / (1000 * 60 * 60 * 24);

    if (diffDays > 0) {
      extra = `<br>Durée : ${diffDays.toFixed(1)} jours<br>Conso moyenne : ${(consumption / diffDays).toFixed(0)} L/jour`;
    }
  }

  result.innerHTML = `
    Consommation charter : ${consumption.toFixed(0)} L
    ${extra}
  `;
}

function updateDashboard(rob) {
  const box = document.getElementById("dashboardContent");
  const globalPercent = rob.capacity > 0 ? (rob.total / rob.capacity) * 100 : 0;

  let html = `
    <div class="result">
      ROB TOTAL : ${rob.total.toFixed(0)} L<br>
      ${globalPercent.toFixed(1)} % global<br>
      Capacité restante : ${(rob.capacity - rob.total).toFixed(0)} L
    </div>
  `;

  rob.details.forEach(tank => {
    html += `
      <p>
        <strong>${tank.name}</strong><br>
        ${tank.litres.toFixed(0)} L - ${tank.mm.toFixed(0)} mm - ${tank.percent.toFixed(1)} %
      </p>
    `;
  });

  box.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  fillTankSelects();
  createTankInputs("robInputs", "rob");
  createTankInputs("bunkerInputs", "bunker");
});
