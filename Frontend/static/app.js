// app.js

// ==========================================
// STATE MANAGEMENT & CONSTANTS
// ==========================================
const API_BASE = "";
let cy;
let map;
let markers = {};
let charts = {};
let draggedShock = null;
let currentSimulationData = null;
let propagationSteps = [];

const defaultNodes = [
    // 🌍 OIL PRODUCERS
    { data: { id: 'Saudi_Oil', label: 'Saudi Arabia (Oil)', type: 'source', lat: 24, lng: 45 } },
    { data: { id: 'Iran_Oil', label: 'Iran (Oil)', type: 'source', lat: 32, lng: 53 } },
    { data: { id: 'Iraq_Oil', label: 'Iraq (Oil)', type: 'source', lat: 33, lng: 44 } },

    // 🚢 TRADE HUB
    { data: { id: 'Suez_Trade', label: 'Suez Canal', type: 'hub', lat: 30, lng: 32.5 } },

    // 🌏 DEMAND NODES
    { data: { id: 'India_Oil', label: 'India (Oil)', type: 'node', lat: 20.5, lng: 78.9 } },
    { data: { id: 'China_Oil', label: 'China (Oil)', type: 'node', lat: 35.8, lng: 104.1 } },

    // 🌾 OTHER
    { data: { id: 'India_Wheat', label: 'India (Wheat)', type: 'node', lat: 22, lng: 77 } },

    // 🏭 MANUFACTURING
    { data: { id: 'China_Manufacturing', label: 'China (Mfg)', type: 'node', lat: 33, lng: 110 } },
    { data: { id: 'Vietnam_Manufacturing', label: 'Vietnam (Mfg)', type: 'node', lat: 14, lng: 108.2 } },

    // 💻 TECH
    { data: { id: 'USA_Tech', label: 'USA (Tech)', type: 'node', lat: 37, lng: -95.7 } },
    { data: { id: 'SouthKorea_Semiconductors', label: 'S.Korea (Semi)', type: 'node', lat: 35.9, lng: 127.7 } },

    // 🇪🇺 EUROPE
    { data: { id: 'France_Energy', label: 'France (Energy)', type: 'node', lat: 46.2, lng: 2.2 } },
    { data: { id: 'UK_Finance', label: 'UK (Finance)', type: 'node', lat: 55, lng: -3.4 } }
];

const NODE_MAP = Object.fromEntries(
    defaultNodes.map(n => [n.data.id, n.data])
);

const defaultEdges = [
    { data: { source: 'Saudi_Oil', target: 'Suez_Trade' } },
    { data: { source: 'Iran_Oil', target: 'Suez_Trade' } },
    { data: { source: 'Iraq_Oil', target: 'Suez_Trade' } },

    { data: { source: 'Suez_Trade', target: 'India_Oil' } },
    { data: { source: 'Suez_Trade', target: 'China_Oil' } },

    { data: { source: 'India_Oil', target: 'India_Wheat' } },
    { data: { source: 'China_Oil', target: 'China_Manufacturing' } },
    { data: { source: 'China_Manufacturing', target: 'Vietnam_Manufacturing' } },

    { data: { source: 'SouthKorea_Semiconductors', target: 'USA_Tech' } },

    { data: { source: 'Suez_Trade', target: 'France_Energy' } },
    { data: { source: 'France_Energy', target: 'UK_Finance' } }
];

const GRAPH_ADJACENCY = {
    Saudi_Oil: ['Suez_Trade'],
    Iran_Oil: ['Suez_Trade'],
    Iraq_Oil: ['Suez_Trade'],

    Suez_Trade: ['India_Oil', 'China_Oil', 'France_Energy'],

    India_Oil: ['India_Wheat'],
    China_Oil: ['China_Manufacturing'],
    China_Manufacturing: ['Vietnam_Manufacturing'],

    SouthKorea_Semiconductors: ['USA_Tech'],

    France_Energy: ['UK_Finance'],

    India_Wheat: [],
    Vietnam_Manufacturing: [],
    USA_Tech: [],
    UK_Finance: []
};

const ALERT_RULES = {
    oil: {
        India: [
            "India oil imports under pressure — fuel inflation risk rising.",
            "Energy supply shock impacting Indian industrial output.",
            "Oil dependency stress affecting South Asian economies."
        ],
        China: [
            "China oil imports disrupted — manufacturing slowdown imminent.",
            "Industrial output at risk due to energy constraints.",
            "Energy reserves being drawn down to stabilize supply."
        ],
        Europe: [
            "European energy markets destabilized due to oil supply disruption.",
            "Refinery operations under pressure across EU region.",
            "Energy import dependency increasing systemic risk."
        ],
        default: [
            "Oil supply disruption detected. Global energy markets reacting.",
            "Fuel-dependent industries entering instability.",
            "Energy price inflation spreading across dependent nodes."
        ]
    },

    war: {
        MiddleEast: [
            "Conflict in Middle East threatening oil transport corridors.",
            "Regional instability impacting global energy logistics.",
            "Shipping routes near Gulf under risk."
        ],
        Asia: [
            "Conflict scenario disrupting major Asian trade routes.",
            "Supply chain instability across regional economies.",
            "Industrial output facing geopolitical risks."
        ],
        Europe: [
            "Geopolitical conflict affecting European trade routes.",
            "Defense and energy sectors entering high-risk state."
        ],
        default: [
            "Armed conflict shock propagating through supply network.",
            "Trade routes disrupted. Logistics costs rising.",
            "Critical infrastructure under stress due to conflict."
        ]
    },

    sanction: {
        USA: [
            "US sanctions impacting global tech supply chains.",
            "Export restrictions affecting semiconductor access.",
            "Financial controls disrupting international trade."
        ],
        China: [
            "Sanctions on China disrupting global manufacturing inputs.",
            "Export controls triggering supply chain instability.",
            "Manufacturing networks cascading into regional disruptions."
        ],
        Europe: [
            "Sanctions affecting European economic flows.",
            "Trade restrictions impacting cross-border dependencies."
        ],
        default: [
            "Economic sanctions applied. Trade volumes contracting.",
            "Export bans triggering downstream supply disruptions.",
            "Financial isolation reducing node connectivity."
        ]
    },

    exportban: {
        India: [
            "India export restrictions affecting regional supply chains.",
            "Agricultural exports halted — food supply instability rising.",
            "South Asian trade networks disrupted."
        ],
        China: [
            "China export ban impacting global manufacturing inputs.",
            "Component shortages affecting global production lines.",
            "Supply bottlenecks forming across tech industries."
        ],
        Europe: [
            "European export restrictions affecting global trade balance.",
            "Supply chain adjustments underway due to export limits."
        ],
        default: [
            "Export ban detected. Downstream nodes entering stress.",
            "Trade flow disruption causing supply shortages.",
            "Inventory depletion across dependent nodes."
        ]
    }
};

const NODE_META = {
    Saudi_Oil: { region: 'Middle East', sector: 'Oil', connectivity: 3, gdpWeight: 0.18 },
    Iran_Oil: { region: 'Middle East', sector: 'Oil', connectivity: 3, gdpWeight: 0.14 },
    Iraq_Oil: { region: 'Middle East', sector: 'Oil', connectivity: 2, gdpWeight: 0.12 },

    Suez_Trade: { region: 'Global', sector: 'Logistics', connectivity: 4, gdpWeight: 0.20 },

    India_Oil: { region: 'India', sector: 'Oil', connectivity: 2, gdpWeight: 0.12 },
    India_Wheat: { region: 'India', sector: 'Agriculture', connectivity: 1, gdpWeight: 0.08 },

    China_Oil: { region: 'China', sector: 'Oil', connectivity: 2, gdpWeight: 0.14 },
    China_Manufacturing: { region: 'China', sector: 'Manufacturing', connectivity: 3, gdpWeight: 0.20 },

    Vietnam_Manufacturing: { region: 'Vietnam', sector: 'Manufacturing', connectivity: 1, gdpWeight: 0.07 },

    SouthKorea_Semiconductors: { region: 'South Korea', sector: 'Semiconductors', connectivity: 2, gdpWeight: 0.14 },
    USA_Tech: { region: 'USA', sector: 'Technology', connectivity: 2, gdpWeight: 0.22 },

    France_Energy: { region: 'Europe', sector: 'Energy', connectivity: 2, gdpWeight: 0.16 },
    UK_Finance: { region: 'Europe', sector: 'Finance', connectivity: 2, gdpWeight: 0.15 }
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCytoscape();
    initLeaflet();
    initCharts();
    initHeatmap(defaultNodes);
    initSidebar();
});

function applyForecastRules(nodes, shockType, originNode, intensity) {

    let updated = { ...nodes };

    const region = NODE_META[originNode]?.region || "";
    const sector = NODE_META[originNode]?.sector || "";

    // =========================
    // 🔥 IRAN WAR MODEL (REAL WORLD)
    // =========================
    if (shockType === "war") {

        // 1️⃣ DIRECT IMPACT
        updated[originNode] -= intensity;

        // =========================
        // 🛢️ ENERGY SHOCK (GLOBAL)
        // =========================
        if (sector === "Oil" || region === "Middle East") {

            // Core oil collapse
            ["Saudi_Oil", "Iran_Oil", "Iraq_Oil"].forEach(n => {
                if (updated[n]) updated[n] -= intensity * 0.8;
            });

            // Strait of Hormuz / Suez disruption
            updated["Suez_Trade"] -= intensity * 0.7;

            // Importers hit hard
            updated["India_Oil"] -= intensity * 0.5;
            updated["China_Oil"] -= intensity * 0.5;
        }

        // =========================
        // ⚙️ TECH INFRA IMPACT
        // =========================
        // (AWS outages, helium shortage, chips)
        updated["USA_Tech"] -= intensity * 0.3;
        updated["SouthKorea_Semiconductors"] -= intensity * 0.5;
        updated["China_Manufacturing"] -= intensity * 0.4;
        updated["Vietnam_Manufacturing"] -= intensity * 0.3;

        // =========================
        // 🌍 GLOBAL ECONOMIC RIPPLE
        // =========================
        Object.keys(updated).forEach(id => {
            if (updated[id] < 80) {
                updated[id] -= 5; // inflation ripple
            }
        });
    }

    // =========================
    // ⚙️ SANCTIONS (US vs CHINA / IRAN)
    // =========================
    if (shockType === "sanction") {

        updated[originNode] -= intensity;

        // Tech war chain
        updated["USA_Tech"] -= intensity * 0.8;
        updated["SouthKorea_Semiconductors"] -= intensity * 0.6;
        updated["China_Manufacturing"] -= intensity * 0.5;
        updated["Vietnam_Manufacturing"] -= intensity * 0.4;
    }

    // =========================
    // 🚢 EXPORT / TRADE BAN
    // =========================
    if (shockType === "exportban") {

        updated[originNode] -= intensity;

        // Trade choke points
        updated["Suez_Trade"] -= intensity * 0.6;

        // Downstream impact
        updated["India_Wheat"] -= intensity * 0.4;
        updated["China_Manufacturing"] -= intensity * 0.4;
    }

    // =========================
    // 🧠 FINAL NORMALIZATION
    // =========================
    Object.keys(updated).forEach(id => {
        updated[id] = Math.max(0, Math.min(100, updated[id]));
    });

    return updated;
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function initTabs() {
    const links = document.querySelectorAll('.nav-link');
    const contents = document.querySelectorAll('.tab-content');
    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            if (targetId === 'map') setTimeout(() => map.invalidateSize(), 100);
            else if (targetId === 'network') setTimeout(() => cy.resize(), 100);
        });
    });
}

// ==========================================
// SIDEBAR — Shock Controls
// ==========================================
function initSidebar() {
    const shockTools = document.querySelector('.space-y-3.flex-grow');
    if (!shockTools) return;
    let controlsDiv = document.getElementById('shock-controls');
    if (!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.id = 'shock-controls';
        controlsDiv.className = 'space-y-3 mt-2';
        controlsDiv.innerHTML = `
            <h3 class="text-sm font-semibold text-gray-400 flex items-center space-x-2">
                <i class="fa-solid fa-sliders text-brandBlue"></i><span>Shock Parameters</span>
            </h3>
            <div class="space-y-1">
                <label class="text-xs text-gray-500">Target Node</label>
                <select id="shock-node-select" class="w-full bg-darkBg border border-borderColor text-white text-xs rounded px-2 py-1.5 outline-none">
                    <option value="Saudi_Oil">Saudi Arabia (Oil)</option>
                    <option value="Iran_Oil">Iran (Oil)</option>
                    <option value="Iraq_Oil">Iraq (Oil)</option>

                    <option value="Suez_Trade">Suez Canal</option>

                    <option value="India_Oil">India (Oil)</option>
                    <option value="India_Wheat">India (Wheat)</option>

                    <option value="China_Oil">China (Oil)</option>
                    <option value="China_Manufacturing">China (Mfg)</option>

                    <option value="Vietnam_Manufacturing">Vietnam (Mfg)</option>

                    <option value="SouthKorea_Semiconductors">S.Korea (Semi)</option>
                    <option value="USA_Tech">USA (Tech)</option>

                    <option value="France_Energy">France (Energy)</option>
                    <option value="UK_Finance">UK (Finance)</option>
                </select>
            </div>
            <div class="space-y-1">
                <label class="text-xs text-gray-500">Shock Type</label>
                <select id="shock-type-select" class="w-full bg-darkBg border border-borderColor text-white text-xs rounded px-2 py-1.5 outline-none">
                    <option value="war">Conflict / War</option>
                    <option value="sanction">Sanction</option>
                    <option value="exportban">Export Ban</option>
                    <option value="oil">Oil Shock</option>
                </select>
            </div>
            <div class="space-y-1">
                <div class="flex justify-between">
                    <label class="text-xs text-gray-500">Shock Intensity</label>
                    <span id="intensity-val" class="text-xs text-brandBlue font-mono">50%</span>
                </div>
                <input type="range" id="intensity-slider" min="10" max="90" value="50"
                    oninput="document.getElementById('intensity-val').innerText=this.value+'%'">
            </div>
            <button onclick="applyShockFromSidebar()"
                class="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded transition flex items-center justify-center space-x-2">
                <i class="fa-solid fa-bolt"></i><span>Apply Shock</span>
            </button>
            <div id="network-node-status" class="hidden space-y-1 bg-darkBg border border-borderColor rounded p-3 text-xs mt-2">
                <div class="font-semibold text-gray-300 mb-1 uppercase tracking-wide">Node Status</div>
                <div id="node-status-list" class="space-y-1"></div>
            </div>
        `;
        shockTools.parentNode.appendChild(controlsDiv);
    }
}

function applyShockFromSidebar() {
    const nodeId = document.getElementById('shock-node-select')?.value || 'Saudi_Oil';
    const shockType = document.getElementById('shock-type-select')?.value || 'war';
    const intensity = parseInt(document.getElementById('intensity-slider')?.value || 50);
    handleShockApply(nodeId, shockType, intensity);
}

// ==========================================
// CYTOSCAPE (NETWORK GRAPH)
// ==========================================
function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: { nodes: defaultNodes, edges: defaultEdges },
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#10b981',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 5,
                    'font-size': '12px',
                    'width': 32,
                    'height': 32,
                    'border-width': 2,
                    'border-color': '#065f46'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#4a5568',
                    'target-arrow-color': '#4a5568',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            {
                selector: '.shocked',
                style: { 'background-color': '#ef4444', 'border-color': '#991b1b', 'border-width': 4 }
            },
            {
                selector: '.affected-medium',
                style: { 'background-color': '#f59e0b', 'border-color': '#92400e', 'border-width': 3 }
            },
            {
                selector: '.origin-node',
                style: { 'background-color': '#dc2626', 'border-color': '#fca5a5', 'border-width': 5, 'width': 42, 'height': 42 }
            },
            {
                selector: '.ripple',
                style: { 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', 'width': 4 }
            },
            {
                selector: '.edge-active',
                style: { 'line-color': '#f97316', 'target-arrow-color': '#f97316', 'width': 3, 'line-style': 'dashed' }
            }
        ],
        layout: { name: 'breadthfirst', directed: true, padding: 30 }
    });

    cy.on('tap', 'node', function (evt) {
        if (draggedShock) {
            const nodeId = evt.target.id();

            if (!NODE_META[nodeId]) return; // prevent invalid node

            const intensity = parseInt(document.getElementById('intensity-slider')?.value || 50);

            handleShockApply(nodeId, draggedShock, intensity);

            draggedShock = null;
        }
    });
}

function drag(ev, type) {
    ev.dataTransfer.setData("text/plain", type);
}
function allowDrop(ev) { ev.preventDefault(); }

function dropNode(ev) {
    ev.preventDefault();

    const shockType = ev.dataTransfer.getData("text/plain");

    const container = document.getElementById("cy");
    const rect = container.getBoundingClientRect();

    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    let selectedNode = null;

    // ✅ FIRST: exact bounding box match
    cy.nodes().forEach(n => {
        const box = n.renderedBoundingBox();

        if (
            x >= box.x1 &&
            x <= box.x2 &&
            y >= box.y1 &&
            y <= box.y2
        ) {
            selectedNode = n;
        }
    });

    // ✅ SECOND: fallback → nearest node
    if (!selectedNode) {
        let minDist = Infinity;

        cy.nodes().forEach(n => {
            const pos = n.renderedPosition();
            const dist = Math.hypot(pos.x - x, pos.y - y);

            if (dist < minDist) {
                minDist = dist;
                selectedNode = n;
            }
        });
    }

    if (!selectedNode) {
        console.log("No node detected");
        return;
    }

    const nodeId = selectedNode.id();

    console.log("Dropped on:", nodeId);

    handleShockApply(nodeId, shockType);
}

const cyContainer = document.getElementById("cy");

cyContainer.addEventListener("dragover", (e) => {
    e.preventDefault(); // REQUIRED
});

cyContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    dropNode(e);
});

function triggerPreset(type) {
    if (type === 'oil')   handleShockApply('Saudi_Oil', 'war', 60);
    if (type === 'trade') handleShockApply('Suez_Trade', 'sanction', 45);
}

// ==========================================
// LEAFLET (MAP)
// ==========================================
function initLeaflet() {
    map = L.map('mapContainer').setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

    defaultNodes.forEach(node => {
        if (node.data.lat && node.data.lng) {
            const marker = L.circleMarker([node.data.lat, node.data.lng], {
                radius: 10,
                fillColor: "#10b981",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(map);
            marker.bindTooltip(buildTooltip(node.data.label, 'Normal', 100, 0, NODE_META[node.data.id]?.region || ''), {
                permanent: false, direction: 'top'
            });
            markers[node.data.id] = marker;
        }
    });
}

function buildTooltip(label, status, supply, disruption, region) {
    const color = status === 'Critical' ? '#ef4444' : status === 'Warning' ? '#f59e0b' : '#10b981';
    return `<div style="font-family:monospace;font-size:12px;line-height:1.8">
        <strong>${label}</strong><br>
        Status: <span style="color:${color}">${status}</span><br>
        Supply: ${supply}%<br>
        Disruption: ${disruption}%<br>
        Region: ${region}
    </div>`;
}

// ==========================================
// CHART.JS (ANALYTICS)
// ==========================================
function initCharts() {
    Chart.defaults.color = '#a0aec0';
    Chart.defaults.borderColor = '#333333';

    const ctxLine = document.getElementById('lineChart').getContext('2d');
    charts.line = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: Array.from({ length: 90 }, (_, i) => i % 15 === 0 ? `Day ${i}` : ''),
            datasets: [{
                label: 'Global Supply %',
                data: Array(90).fill(100),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.15)',
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 105, grid: { color: '#2d2d2d' } },
                x: { grid: { color: '#2d2d2d' } }
            }
        }
    });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    charts.bar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: [
                'Saudi Oil',
                'India Wheat',
                'China Mfg',
                'USA Tech',
                'S.Korea Semi'
            ],
            datasets: [{
                label: 'Supply Level %',
                data: [100, 100, 100, 100, 100],
                backgroundColor: Array(5).fill('#10b981')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 105, grid: { color: '#2d2d2d' } } }
        }
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Normal (>80%)', 'Warning (50-80%)', 'Critical (<50%)'],
            datasets: [{
                data: [8, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
    updatePieLegend([8, 0, 0]);
}

function updatePieLegend(dataArr) {
    const total = dataArr.reduce((a, b) => a + b, 0) || 1;
    const ul = document.getElementById('pie-legend');
    ul.innerHTML = `
        <li><span class="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>Normal (&gt;80%) — ${Math.round(dataArr[0]/total*100)}%</li>
        <li><span class="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Warning (50-80%) — ${Math.round(dataArr[1]/total*100)}%</li>
        <li><span class="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>Critical (&lt;50%) — ${Math.round(dataArr[2]/total*100)}%</li>
    `;
}

function initHeatmap(nodes) {
    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';
    nodes.forEach(n => {
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center justify-center p-2 rounded bg-green-500/20 border border-green-500/50 transition-all duration-500';
        div.id = `heat-${n.data.id}`;
        div.innerHTML = `<span class="text-[10px] text-gray-300 text-center leading-tight">${n.data.label}</span><span class="font-bold text-sm text-white mt-1">100%</span>`;
        container.appendChild(div);
    });
}

function updateHeatmap(nodes) {
    if (!nodes) return;
    defaultNodes.forEach(n => {
        const cell = document.getElementById(`heat-${n.data.id}`);
        if (!cell) return;
        const supply = nodes[n.data.id]?.supply ?? 100;
        let cls, valColor;
        if (supply < 50)       { cls = 'bg-red-500/20 border-red-500/50';       valColor = 'text-red-400'; }
        else if (supply < 80)  { cls = 'bg-yellow-500/20 border-yellow-500/50'; valColor = 'text-yellow-400'; }
        else                   { cls = 'bg-green-500/20 border-green-500/50';   valColor = 'text-green-400'; }
        cell.className = `flex flex-col items-center justify-center p-2 rounded border transition-all duration-500 ${cls}`;
        cell.innerHTML = `<span class="text-[10px] text-gray-300 text-center leading-tight">${n.data.label}</span><span class="font-bold text-sm mt-1 ${valColor}">${supply}%</span>`;
    });
}

// ==========================================
// DYNAMIC ALERTS (rule-based)
// ==========================================
function generateDynamicAlerts(nodeId, shockType, data) {
    const alerts = [];

    const region = NODE_META[nodeId]?.region || 'default';
    const shockKey = (shockType || '').toLowerCase();
    const ruleSet = ALERT_RULES[shockKey] || ALERT_RULES['oil'];

    const regionAlerts = ruleSet[region] || ruleSet['default'] || [];
    alerts.push(...regionAlerts.slice(0, 2));

    if (data && data.nodes) {
        Object.entries(data.nodes).forEach(([id, nd]) => {
            const lbl = NODE_MAP[id]?.label || id;
            const status = computeNodeStatus(nd.supply);

            if (status.label === 'Critical') {
                alerts.push(`🔴 CRITICAL: ${lbl} supply at ${nd.supply}% — severe disruption.`);
            } else if (status.label === 'Warning') {
                alerts.push(`🟡 WARNING: ${lbl} supply reduced to ${nd.supply}%.`);
            }
        });

        const avg = Object.values(data.nodes)
            .reduce((s, n) => s + n.supply, 0) / Object.keys(data.nodes).length;

        if (avg < 60) alerts.push("🔴 Global supply critical — cascading failures likely.");
        else if (avg < 75) alerts.push("⚠️ Global supply under stress — slowdown expected.");
    }

    return [...new Set(alerts)];
}

// ==========================================
// NODE STATUS HELPERS
// ==========================================
function computeNodeStatus(supply) {
    if (supply < 50) return { label: 'Critical', color: 'text-red-400', dot: 'bg-red-500' };
    if (supply < 80) return { label: 'Warning',  color: 'text-yellow-400', dot: 'bg-yellow-500' };
    return { label: 'Normal', color: 'text-green-400', dot: 'bg-green-500' };
}

function computeGDPImpact(data) {
    if (!data?.nodes) return 0;
    let impact = 0;
    Object.entries(data.nodes).forEach(([id, nd]) => {
        const meta = NODE_META[id] || { gdpWeight: 0.1 };
        impact += ((100 - nd.supply) / 100) * meta.gdpWeight * 1000;
    });
    return Math.round(impact);
}

function updateNodeStatusPanel(data) {
    const panel = document.getElementById('network-node-status');
    const list  = document.getElementById('node-status-list');
    if (!panel || !list || !data?.nodes) return;
    panel.classList.remove('hidden');
    list.innerHTML = '';
    Object.entries(data.nodes).forEach(([id, nd]) => {
        const lbl = NODE_MAP[id]?.label || id;
        const status = computeNodeStatus(nd.supply);
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between py-0.5 border-b border-borderColor/30';
        row.innerHTML = `
            <div class="flex items-center space-x-1.5">
                <span class="inline-block w-2 h-2 rounded-full ${status.dot}"></span>
                <span class="text-gray-300">${lbl}</span>
            </div>
            <span class="${status.color} font-mono">${nd.supply}%</span>
        `;
        list.appendChild(row);
    });
}

// ==========================================
// BFS PROPAGATION (insights cascade path)
// ==========================================
function bfsPropagate(originId, nodeSupplies) {
    const visited = [];
    const queue   = [originId];
    const seen    = new Set([originId]);
    while (queue.length > 0) {
        const current = queue.shift();
        if ((nodeSupplies[current] ?? 100) < 80) visited.push(current);
        (GRAPH_ADJACENCY[current] || []).forEach(nbr => {
            if (!seen.has(nbr)) { seen.add(nbr); queue.push(nbr); }
        });
    }
    return visited;
}

// ==========================================
// MAP TIMELINE — propagation steps (t0→t1→t2)
// ==========================================
function buildPropagationSteps(originId, nodeSupplies) {
    const t0 = {}, t1 = {}, t2 = {};
    defaultNodes.forEach(n => { t0[n.data.id] = 100; t1[n.data.id] = 100; t2[n.data.id] = nodeSupplies[n.data.id] ?? 100; });

    // t0: only origin is affected (critical)
    t0[originId] = nodeSupplies[originId] ?? 70;

    // t1: origin + direct neighbors at mid-point
    t1[originId] = nodeSupplies[originId] ?? 40;
    (GRAPH_ADJACENCY[originId] || []).forEach(nbr => {
        const final = nodeSupplies[nbr] ?? 80;
        t1[nbr] = Math.round((100 + final) / 2);
    });

    return [t0, t1, t2];
}

function updateTimeline(val) {
    const v   = parseInt(val);
    const el  = document.getElementById('timeline-val');
    if (el) el.innerText = v;
    if (!propagationSteps.length) return;

    const stepIdx = v <= 30 ? 0 : v <= 60 ? 1 : 2;
    const stepData = propagationSteps[stepIdx];
    if (!stepData) return;

    Object.keys(markers).forEach(id => {
        const supply  = stepData[id] ?? 100;
        const status = computeNodeStatus(supply);

        const color =
            status.label === "Critical" ? "#ef4444" :
            status.label === "Warning"  ? "#f59e0b" :
                                        "#22c55e";

        const statusLabel = status.label;

        const disruption = Math.max(0, 100 - supply);
        const meta  = NODE_META[id] || {};
        const label = NODE_MAP[id]?.label || id;
        markers[id].setStyle({
            fillColor: color,
            color: "#ffffff",
            fillOpacity: 0.9
        });
        markers[id].setTooltipContent(buildTooltip(label, statusLabel, supply, disruption, meta.region || 'Global'));
        markers[id].setRadius(supply < 50 ? 14 : supply < 80 ? 11 : 9);
    });
}

let playInterval = null;

function triggerSimulation() {

    const slider = document.getElementById('timeline-slider');
    const btn = document.querySelector('[onclick="triggerSimulation()"]');

    // ⛔ If already playing → stop
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;

        btn.innerHTML = '<i class="fa-solid fa-play text-brandBlue"></i><span class="font-semibold text-sm">Play Simulation</span>';
        return;
    }

    let current = parseInt(slider.value) || 0;

    // ▶ Change to Pause
    btn.innerHTML = '<i class="fa-solid fa-pause text-brandBlue"></i><span class="font-semibold text-sm">Pause</span>';

    playInterval = setInterval(() => {

        current += 2;

        if (current > 90) {
            clearInterval(playInterval);
            playInterval = null;

            // 🔥 RESET BUTTON BACK TO PLAY
            btn.innerHTML = '<i class="fa-solid fa-play text-brandBlue"></i><span class="font-semibold text-sm">Play Simulation</span>';

            return;
        }

        slider.value = current;
        updateTimeline(current);

    }, 120);
}

// ==========================================
// SIMULATION LOGIC & API CALLS
// ==========================================

let activeShocks = [];

function applyMultiShock(nodes) {
    let result = { ...nodes };

    activeShocks.forEach(shock => {
        result = applyForecastRules(
            result,
            shock.type,
            shock.nodeId,
            shock.intensity
        );
    });

    return result;
}

function handleShockApply(nodeId, shockType, intensity) {

    intensity = intensity || parseInt(document.getElementById('intensity-slider')?.value || 50);

    // UI loading
    document.getElementById('sim-loader').classList.remove('hidden');

    const status = document.getElementById('global-status');
    status.className =
        "px-3 py-1 bg-yellow-900/50 text-yellow-400 border border-yellow-800 rounded text-xs font-semibold";
    status.innerText = "Simulating...";

    // 🔥 BASE STATE
    const baseState = {};
    defaultNodes.forEach(n => baseState[n.data.id] = 100);

    // 🔥 APPLY FORECAST
    const result = applyForecastRules(baseState, shockType, nodeId, intensity);

    // 🔥 BUILD FULL DATA OBJECT (CRITICAL FIX)
    const data = {
        nodes: {},
        metrics: {
            avgSupply: 0
        },
        history: []
    };

    let total = 0;
    let count = 0;

    Object.keys(result).forEach(id => {
        const supply = result[id];

        data.nodes[id] = { supply };

        total += supply;
        count++;
    });

    // ✅ Avg Supply (FIXES METRICS)
    data.metrics.avgSupply = Math.round(total / count);

    // ✅ History (FIXES GRAPH)
    for (let i = 0; i < 90; i++) {
        const val = 100 - (100 - data.metrics.avgSupply) * Math.exp(-i / 25);
        data.history.push(Math.round(val));
    }

    // ✅ Proper payload (FIXES CRASH)
    const payload = {
        shock: shockType,
        country: nodeId.split('_')[0],
        resource: nodeId.split('_')[1]
    };

    // 🔥 FINAL CALL
    setTimeout(() => {
        processSimulationData(data, payload, nodeId);

        document.getElementById('sim-loader').classList.add('hidden');
    }, 200);
}

function processSimulationData(data, payload, originNodeId) {
    currentSimulationData = data;
    originNodeId = originNodeId || nodeId;

    document.getElementById('sim-loader').classList.add('hidden');
    const statusBadge = document.getElementById('global-status');
    statusBadge.className = "px-3 py-1 bg-red-900/50 text-red-400 border border-red-800 rounded text-xs font-semibold uppercase";
    const region = NODE_META[originNodeId]?.region || '';
    statusBadge.innerText = `Shock: ${payload.shock} (${region})`;

    // ---- NETWORK TAB ----
    cy.nodes().forEach(node => node.removeClass('shocked').removeClass('affected-medium').removeClass('origin-node'));
    cy.edges().forEach(edge => edge.removeClass('ripple').removeClass('edge-active'));

    if (data.nodes) {
        Object.entries(data.nodes).forEach(([id, nd]) => {
            const cyNode = cy.getElementById(id);
            if (!cyNode.empty()) {
                if      (id === originNodeId)  cyNode.addClass('origin-node');
                else if (nd.supply < 50)        cyNode.addClass('shocked');
                else if (nd.supply < 80)        cyNode.addClass('affected-medium');
            }
        });
        cy.edges().forEach(edge => {
            const srcS = data.nodes[edge.data('source')]?.supply ?? 100;
            const tgtS = data.nodes[edge.data('target')]?.supply ?? 100;
            if (srcS < 70 || tgtS < 70) edge.addClass('edge-active');
        });
    }

    // Alerts
    const dynAlerts = generateDynamicAlerts(originNodeId, payload.shock, data);
    const alertsCont = document.getElementById('alerts-container');
    if (alertsCont) {
        alertsCont.innerHTML = '';
        if (!dynAlerts.length) {
            alertsCont.innerHTML = '<div class="text-sm text-gray-500 italic">No active alerts.</div>';
        } else {
            dynAlerts.forEach(msg => {
                const sev    = msg.startsWith('🔴') ? 'red' : msg.startsWith('🟡') ? 'yellow' : 'orange';
                const colors = { red: 'border-red-800 text-red-300 bg-red-900/20', yellow: 'border-yellow-700 text-yellow-300 bg-yellow-900/20', orange: 'border-orange-700 text-orange-300 bg-orange-900/20' };
                const div = document.createElement('div');
                div.className = `text-xs p-2 border rounded ${colors[sev] || colors.orange}`;
                div.innerText = msg;
                alertsCont.appendChild(div);
            });
        }
    }

    // Network metrics
    const avgSupply = data.metrics?.avgSupply ?? 100;
    const textC = avgSupply < 70 ? 'text-red-500' : avgSupply < 85 ? 'text-yellow-500' : 'text-green-500';
    const bgC   = avgSupply < 70 ? 'bg-red-500'   : avgSupply < 85 ? 'bg-yellow-500'   : 'bg-green-500';
    const gdpLoss = computeGDPImpact(data);

    document.getElementById('metric-supply').innerText = `${avgSupply}%`;
    document.getElementById('metric-supply').className = `text-2xl font-bold ${textC}`;
    document.getElementById('bar-supply').style.width   = `${avgSupply}%`;
    document.getElementById('bar-supply').className     = `${bgC} h-2 rounded-full transition-all duration-500`;
    document.getElementById('metric-gdp').innerText     = `-$${gdpLoss}B`;

    updateNodeStatusPanel(data);

    // ---- MAP TAB ----
    const nodeSupplies = {};
    if (data.nodes) Object.entries(data.nodes).forEach(([id, nd]) => { nodeSupplies[id] = nd.supply; });
    propagationSteps = buildPropagationSteps(originNodeId, nodeSupplies);

    const slider = document.getElementById('timeline-slider');
    if (slider) { slider.value = 0; updateTimeline(0); }

    Object.keys(markers).forEach(id => {
        const supply = nodeSupplies[id] ?? 100;
        const color  = supply < 50 ? "#ef4444" : supply < 80 ? "#f59e0b" : "#10b981";
        const stat   = computeNodeStatus(supply);
        const lbl    = NODE_MAP[id]?.label || id;
        const meta   = NODE_META[id] || {};
        markers[id].setStyle({
            fillColor: color,
            color: "#ffffff",
            fillOpacity: 0.9
        });
        markers[id].setTooltipContent(buildTooltip(lbl, stat.label, supply, Math.max(0, 100 - supply), meta.region || ''));
        markers[id].setRadius(supply < 50 ? 14 : supply < 80 ? 11 : 9);
    });

    // ---- ANALYTICS TAB ----
    if (data.history && charts.line) {
        charts.line.data.datasets[0].data = data.history;
        charts.line.update();
    }

    const sectors   = ['Saudi_Oil', 'India_Wheat', 'China_Manufacturing', 'USA_Tech', 'SouthKorea_Semiconductors'];
    const barData   = sectors.map(id => data.nodes?.[id]?.supply ?? 100);
    const barColors = barData.map(v => v < 50 ? '#ef4444' : v < 80 ? '#f59e0b' : '#10b981');
    charts.bar.data.datasets[0].data             = barData;
    charts.bar.data.datasets[0].backgroundColor  = barColors;
    charts.bar.update();

    const allNodes      = Object.values(data.nodes || {});
    const normalCnt     = allNodes.filter(n => n.supply >= 80).length;
    const warningCnt    = allNodes.filter(n => n.supply >= 50 && n.supply < 80).length;
    const criticalCnt   = allNodes.filter(n => n.supply < 50).length;
    const affectedNodes = allNodes.filter(n => n.supply < 80).length;
    charts.pie.data.datasets[0].data = [normalCnt, warningCnt, criticalCnt];
    charts.pie.update();
    updatePieLegend([normalCnt, warningCnt, criticalCnt]);

    updateHeatmap(data.nodes);

    const riskLevel = criticalCnt > allNodes.length * 0.5 ? 'High'
        : (criticalCnt > 0 || warningCnt > allNodes.length * 0.2) ? 'Moderate' : 'Low';
    const riskColor = riskLevel === 'High' ? 'text-red-400' : riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400';

    const kpiSupply = document.getElementById('kpi-supply');
    const kpiGdp    = document.getElementById('kpi-gdp');
    const kpiRisk   = document.getElementById('kpi-risk');
    const kpiNodes  = document.getElementById('kpi-nodes');
    if (kpiSupply) { kpiSupply.innerText = `${avgSupply}%`; kpiSupply.className = `text-2xl font-bold mt-2 ${textC}`; }
    if (kpiGdp)    kpiGdp.innerText = `-$${gdpLoss}B`;
    if (kpiRisk)   { kpiRisk.innerText = riskLevel; kpiRisk.className = `text-2xl font-bold mt-2 ${riskColor}`; }
    if (kpiNodes)  kpiNodes.innerText = affectedNodes;

    const worstNode  = data.nodes ? Object.entries(data.nodes).sort((a, b) => a[1].supply - b[1].supply)[0] : null;
    const worstLabel = worstNode ? (NODE_MAP[worstNode[0]]?.label || worstNode[0]) : '–';
    const summaryEl  = document.getElementById('analytics-summary');
    if (summaryEl) {
        summaryEl.innerText = `Shock "${payload.shock.toUpperCase()}" at ${payload.country} (${payload.resource}). ` +
            `Global avg supply: ${avgSupply}%. Most affected: ${worstLabel} at ${worstNode?.[1]?.supply ?? 100}%. ` +
            `Risk: ${riskLevel}. GDP impact: -$${gdpLoss}B. ${affectedNodes} node(s) disrupted.`;
    }

    // ---- INSIGHTS TAB ----
    updateInsights(data, payload, originNodeId, riskLevel, affectedNodes, allNodes);
}

// ==========================================
// INSIGHTS — Rule-based + BFS
// ==========================================
function shockAwarePropagation(originId, nodeSupplies, shockType) {
    const visited = [];
    const queue   = [{ id: originId, depth: 0 }];
    const seen    = new Set([originId]);

    while (queue.length > 0) {
        const { id, depth } = queue.shift();
        const supply = nodeSupplies[id] ?? 100;

        // 🔥 shock-specific filtering
        let threshold = 80;

        if (shockType === 'war') threshold = 90;        // spreads more
        if (shockType === 'sanction') threshold = 70;   // selective
        if (shockType === 'exportban') threshold = 75;

        if (supply < threshold) visited.push(id);

        (GRAPH_ADJACENCY[id] || []).forEach(nbr => {
            if (!seen.has(nbr)) {
                seen.add(nbr);

                // 🔥 shock-specific depth control
                if (shockType === 'exportban' && depth > 1) return;
                if (shockType === 'sanction' && !nbr.includes('Tech') && !nbr.includes('Manufacturing')) return;

                queue.push({ id: nbr, depth: depth + 1 });
            }
        });
    }

    return visited;
}

function updateInsights(data, payload, originNodeId, riskLevel, affectedNodes, allNodes) {
    const nodeSupplies = {};
    if (data.nodes) Object.entries(data.nodes).forEach(([id, nd]) => { nodeSupplies[id] = nd.supply; });

    const cascadePath = shockAwarePropagation(originNodeId, nodeSupplies, payload.shock);
    const pathLabels   = [...new Set(cascadePath.map(id => NODE_META[id]?.region || id.split('_')[0]))];

    // Root cause
    const rootEl = document.getElementById('insight-root');
    if (rootEl) {
        rootEl.innerHTML = `
            <div class="space-y-1">
                <div><span class="text-blue-400 font-bold">${payload.country} — ${payload.resource}</span></div>
                <div class="text-gray-400">Trigger: <span class="text-orange-400 uppercase font-semibold">${payload.shock}</span></div>
                <div class="text-gray-500 text-xs mt-1">Origin supply: <span class="${(nodeSupplies[originNodeId]??100)<50?'text-red-400':'text-yellow-400'} font-mono">${nodeSupplies[originNodeId]??'–'}%</span></div>
            </div>`;
    }

    // Cascade path
    const cascadeEl = document.getElementById('insight-cascade');
    if (cascadeEl) {
        if (pathLabels.length > 1) {
            cascadeEl.innerHTML = pathLabels.map((lbl, i) => {
                const c = i===0?'text-red-400':i===pathLabels.length-1?'text-orange-400':'text-yellow-400';
                return `<span class="${c}">${lbl}</span>${i<pathLabels.length-1?' <span class="text-gray-500">→</span> ':''}`;
            }).join('');
        } else if (pathLabels.length === 1) {
            cascadeEl.innerHTML = `<span class="text-red-400">${pathLabels[0]}</span> <span class="text-gray-500 text-xs">— Impact localized.</span>`;
        } else {
            cascadeEl.innerText = 'No propagation detected.';
        }
    }

    // Risk assessment
    const riskEl     = document.getElementById('insight-risk');
    const critCnt    = allNodes.filter(n => n.supply < 50).length;
    const warnCnt    = allNodes.filter(n => n.supply >= 50 && n.supply < 80).length;
    const riskColor  = riskLevel==='High'?'text-red-400':riskLevel==='Moderate'?'text-yellow-400':'text-green-400';
    if (riskEl) {
        riskEl.innerHTML = `
            <div class="space-y-2">
                <div class="text-lg font-bold ${riskColor}">${riskLevel} Risk</div>
                <div class="text-xs text-gray-400">${critCnt} critical node(s) (${Math.round(critCnt/(allNodes.length||1)*100)}% of network)</div>
                <div class="text-xs text-gray-400">${warnCnt} node(s) in warning state</div>
                <div class="text-xs text-gray-500 mt-1">${
                    riskLevel==='High'     ? '⚠️ Systemic threshold breached. Immediate mitigation required.' :
                    riskLevel==='Moderate' ? '⚠️ Moderate disruption. Monitor dependent nodes closely.' :
                                            '✅ Network largely stable. Isolated disruption detected.'
                }</div>
            </div>`;
    }

    // Dependency analysis
    const depEl = document.getElementById('insight-dep');
    if (depEl) {
        const sorted = Object.entries(data.nodes || {})
            .map(([id, nd]) => {
                const meta = NODE_META[id] || { connectivity:1, gdpWeight:0.1 };
                return { id, supply: nd.supply, impact: meta.connectivity*(100-nd.supply), meta };
            })
            .filter(n => n.supply < 100)
            .sort((a, b) => b.impact - a.impact)
            .slice(0, 4);
        depEl.innerHTML = sorted.length
            ? sorted.map(n => {
                const lbl = NODE_MAP[n.id]?.label || n.id;
                const s   = computeNodeStatus(n.supply);
                return `<li><span class="${s.color} font-semibold">${lbl}</span> — Connectivity: ${n.meta.connectivity}, Disruption: ${100-n.supply}%, GDP: ${(n.meta.gdpWeight*100).toFixed(0)}%</li>`;
              }).join('')
            : '<li class="text-gray-500 italic">No significant dependencies disrupted.</li>';
    }

    // AI summary
    const aiEl = document.getElementById('ai-summary');
    if (aiEl) {
        const worstNode  = data.nodes ? Object.entries(data.nodes).sort((a,b)=>a[1].supply-b[1].supply)[0] : null;
        const worstLabel = worstNode ? (defaultNodes.find(n=>n.data.id===worstNode[0])?.data.label||worstNode[0]) : '–';
        aiEl.innerText =
            `A ${payload.shock.toUpperCase()} shock in ${payload.country} (${payload.resource}) triggered cascading disruptions across ${affectedNodes} node(s). ` +
            `Propagation path: ${pathLabels.join(' → ')||payload.country}. Most affected: ${worstLabel} at ${worstNode?.[1]?.supply??100}%. ` +
            `Risk: ${riskLevel}. Estimated GDP impact: -$${computeGDPImpact(data)}B. ` +
            (riskLevel==='High' ? 'Emergency re-routing of supply chains is recommended.' :
             riskLevel==='Moderate' ? 'Targeted intervention at high-connectivity nodes may limit further propagation.' :
             'Network remains stable. Monitor dependent nodes for secondary effects.');
    }

    // Recommendations
    const recEl = document.getElementById('insight-rec');
    if (recEl) recEl.innerHTML = generateRecommendations(payload, riskLevel, cascadePath, data).map(r=>`<li>${r}</li>`).join('');
}

function generateRecommendations(payload, riskLevel, cascadePath, data) {
    const recs  = [];
    const shock = payload.shock.toLowerCase();

    if (shock === 'oil') {
        recs.push(`- Activate strategic petroleum reserves.`);
        recs.push(`- Diversify oil imports from alternate suppliers.`);
    }

    if (shock === 'war') {
        recs.push(`- Secure trade routes and reroute logistics.`);
        recs.push(`- Increase defense and supply chain monitoring.`);
    }

    if (shock === 'sanction') {
        recs.push(`- Shift to alternative trade partners.`);
        recs.push(`- Build domestic production capacity for restricted goods.`);
    }

    if (shock === 'exportban') {
        recs.push(`- Identify substitute import sources immediately.`);
        recs.push(`- Increase domestic production to offset shortages.`);
    }

    if (cascadePath.length > 2) {
        recs.push(`- Contain cascading effects via intermediate node stabilization.`);
    }

    if (riskLevel === 'High') {
        recs.push(`- Activate emergency supply chain resilience protocols.`);
    }

    recs.push(`- Improve long-term diversification to reduce dependency risks.`);

    return recs;
}

// ==========================================
// RULE-BASED FALLBACK SIMULATION
// ==========================================
function generateRuleBasedSimulation(payload, originNodeId) {
    const reductionFactor = (payload.reduction || 50) / 100;
    const nodeSupplies    = {};
    defaultNodes.forEach(n => { nodeSupplies[n.data.id] = 100; });

    // BFS propagation with decay
    const queue   = [{ id: originNodeId, decay: 1.0 }];
    const visited = new Set();
    while (queue.length > 0) {
        const { id, decay } = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        nodeSupplies[id] = Math.max(40, Math.round(100 - reductionFactor * decay * 100));
        (GRAPH_ADJACENCY[id] || []).forEach(nbr => {
            if (!visited.has(nbr) && decay > 0.25) {
                queue.push({ id: nbr, decay: decay * 0.5 });
            }
        });
    }

    const allVals = Object.values(nodeSupplies);
    const avg     = Math.round(allVals.reduce((a,b)=>a+b,0)/allVals.length);

    // 90-day history: stable → drop → partial recovery
    const history = Array.from({ length: 90 }, (_, i) => {
        if (i < 10) return 100;
        if (i < 30) return Math.round(100 - (100-avg)*((i-10)/20));
        if (i < 70) return avg;
        return Math.min(100, Math.round(avg + (100-avg)*((i-70)/40)*0.4));
    });

    const nodes = {};
    defaultNodes.forEach(n => {
        const meta = NODE_META[n.data.id] || {};
        nodes[n.data.id] = {
            country: meta.region || n.data.id.split('_')[0],
            resource: meta.sector || '',
            supply: nodeSupplies[n.data.id]
        };
    });

    const critCnt  = allVals.filter(v=>v<50).length;
    const riskLevel = critCnt > allVals.length*0.5 ? 'High' : critCnt > 0 ? 'Moderate' : 'Low';

    return {
        nodes,
        history,
        metrics: { avgSupply: avg, riskLevel, totalGDP: avg*10 },
        alerts: generateDynamicAlerts(originNodeId, payload.shock, { nodes }),
        insights: [
            `${payload.resource} shock in ${payload.country} triggered cascading global effects.`,
            `Graph-based BFS propagation from ${originNodeId}.`
        ]
    };
}