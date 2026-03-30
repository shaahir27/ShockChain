function mapCountryName(name) {

  const mapping = {
    "India": "India",
    "China": "China",
    "United States of America": "USA",
    "United Kingdom": "UK",
    "South Korea": "SouthKorea",
    "Vietnam": "Vietnam",

    // IMPORTANT
    "Saudi Arabia": "MiddleEast",
    "United Arab Emirates": "MiddleEast",
    "Iran": "MiddleEast",
    "Iraq": "MiddleEast",
    "Kuwait": "MiddleEast"
  };

  return mapping[name] || null; // return null if not supported
}

// ==============================
// 🌍 INIT MAP
// ==============================
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// ==============================
// 📦 GLOBAL STATE
// ==============================
let simulationData = {};
let lastResponse = null;
let geoLayer;


// ==============================
// 🧭 TAB SWITCHING
// ==============================
function switchTab(tabId) {
  document.getElementById("mapTab").classList.add("hidden");
  document.getElementById("analyticsTab").classList.add("hidden");
  document.getElementById("insightsTab").classList.add("hidden");

  document.getElementById(tabId).classList.remove("hidden");
}


// ==============================
// 🌍 LOAD GEOJSON (REAL MAP)
// ==============================
fetch("world.geo.json")
  .then(res => res.json())
  .then(data => {

    geoLayer = L.geoJSON(data, {

      style: {
        color: "#1e293b",
        weight: 1,
        fillColor: "#0f172a",
        fillOpacity: 0.7
      },

      onEachFeature: function (feature, layer) {

        const countryName = feature.properties.name;

        layer.on("click", function (e) {
          highlightCountry(layer);
          showPopup(e.latlng, countryName);
        });

        layer.on("mouseover", function () {
          layer.setStyle({ fillOpacity: 0.9 });
        });

        layer.on("mouseout", function () {
          geoLayer.resetStyle(layer);
        });

      }

    }).addTo(map);

  });


// ==============================
// 🎯 HIGHLIGHT COUNTRY
// ==============================
function highlightCountry(layer) {

  geoLayer.eachLayer(l => geoLayer.resetStyle(l));

  layer.setStyle({
    fillColor: "#3b82f6",
    fillOpacity: 0.9
  });
}


// ==============================
// 🧾 POPUP (AUTO COUNTRY)
// ==============================
function showPopup(latlng, countryName) {

  const popupContent = `
    <div style="color:black; min-width:200px;">
      <h3 style="font-weight:bold; margin-bottom:10px;">${countryName}</h3>

      <label>Resource</label>
      <select id="resource" style="width:100%; margin-bottom:8px;">
        <option>Oil</option>
      </select>

      <label>Shock</label>
      <select id="shock" style="width:100%; margin-bottom:8px;">
        <option>Sanction</option>
      </select>

      <label>Intensity</label>
      <input type="range" id="intensity" min="0" max="100" value="30" style="width:100%; margin-bottom:10px;" />

      <button onclick="runSimulation('${countryName}')"
        style="background:black; color:white; padding:6px 10px; border:none; cursor:pointer;">
        🚀 Simulate
      </button>
    </div>
  `;

  L.popup()
    .setLatLng(latlng)
    .setContent(popupContent)
    .openOn(map);
}


// ==============================
// 🚀 RUN SIMULATION
// ==============================
function runSimulation(countryName) {

  const resource = document.getElementById("resource").value;
  const shock = document.getElementById("shock").value;

  const mappedCountry = mapCountryName(countryName);

  // ❗ BLOCK unsupported countries
  if (!mappedCountry) {
    alert("This country is not part of simulation yet");
    return;
  }

  console.log("Mapped:", countryName, "→", mappedCountry);

  fetch("http://127.0.0.1:5000/simulate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      country: mappedCountry,
      resource,
      shock
    })
  })
  .then(res => res.json())
  .then(data => {

    console.log("Response:", data);

    lastResponse = data;
    simulationData = data.nodes;

    visualizeData(simulationData);
    updateMetrics(data.metrics);
    updateAlerts(data.alerts);
    updateInsights(data.insights);

  })
  .catch(err => console.error(err));
}


// ==============================
// 🎨 COLOR COUNTRIES (NEW 🔥)
// ==============================
function visualizeData(nodes) {

  geoLayer.eachLayer(layer => {

    const countryName = layer.feature.properties.name;

    // match backend node
    for (let key in nodes) {

      const node = nodes[key];

      const mapped = mapCountryName(countryName);

      if (mapped && mapped === node.country){

        let color = "#22c55e"; // green

        if (node.supply < 50) color = "#ef4444";
        else if (node.supply < 80) color = "#facc15";

        layer.setStyle({
          fillColor: color,
          fillOpacity: 0.8
        });
      }
    }

  });
}


// ==============================
// 📊 UI UPDATES
// ==============================
function updateMetrics(metrics) {
  document.getElementById("metrics").innerHTML = `
    <p>Avg Supply: ${metrics.avgSupply}%</p>
    <p>GDP Impact: ${metrics.totalGDP}</p>
    <p>Risk: ${metrics.riskLevel}</p>
  `;
}

function updateAlerts(alerts) {
  document.getElementById("alerts").innerHTML =
    alerts.map(a => `<p class="text-red-400">⚠ ${a}</p>`).join("");
}

function updateInsights(insights) {
  document.getElementById("insights").innerHTML =
    insights.map(i => `<p>• ${i}</p>`).join("");
}


// ==============================
// ⏳ TIMELINE
// ==============================
const slider = document.getElementById("timelineSlider");
const label = document.getElementById("dayLabel");

slider.addEventListener("input", () => {

  const day = slider.value;
  label.innerText = "Day " + day;

  if (!lastResponse) return;

  const progress = day / 90;
  const animatedNodes = {};

  for (let key in lastResponse.nodes) {

    const finalValue = lastResponse.nodes[key].supply;

    const interpolated = Math.round(100 - ((100 - finalValue) * progress));

    animatedNodes[key] = {
      ...lastResponse.nodes[key],
      supply: interpolated
    };
  }

  visualizeData(animatedNodes);
});


// ==============================
// 🔄 RESET
// ==============================
function resetSimulation() {

  simulationData = {};
  lastResponse = null;

  geoLayer.eachLayer(l => geoLayer.resetStyle(l));

  document.getElementById("metrics").innerHTML = "";
  document.getElementById("alerts").innerHTML = "";
  document.getElementById("insights").innerHTML = "";

  slider.value = 0;
  label.innerText = "Day 0";
}