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
    { data: { id: 'MiddleEast_Oil', label: 'Middle East (Oil)', type: 'source', lat: 25.0, lng: 45.0 } },
    { data: { id: 'India_Oil', label: 'India (Oil)', type: 'node', lat: 20.5, lng: 78.9 } },
    { data: { id: 'India_Wheat', label: 'India (Wheat)', type: 'node', lat: 22.0, lng: 77.0 } },
    { data: { id: 'China_Oil', label: 'China (Oil)', type: 'node', lat: 35.8, lng: 104.1 } },
    { data: { id: 'China_Manufacturing', label: 'China (Mfg)', type: 'node', lat: 33.0, lng: 110.0 } },
    { data: { id: 'USA_Tech', label: 'USA (Tech)', type: 'node', lat: 37.0, lng: -95.7 } },
    { data: { id: 'SouthKorea_Semiconductors', label: 'S.Korea (Semi)', type: 'node', lat: 35.9, lng: 127.7 } },
    { data: { id: 'Vietnam_Manufacturing', label: 'Vietnam (Mfg)', type: 'node', lat: 14.0, lng: 108.2 } }
];

const defaultEdges = [
    { data: { source: 'MiddleEast_Oil', target: 'India_Oil' } },
    { data: { source: 'MiddleEast_Oil', target: 'China_Oil' } },
    { data: { source: 'India_Oil', target: 'India_Wheat' } },
    { data: { source: 'China_Oil', target: 'China_Manufacturing' } },
    { data: { source: 'China_Manufacturing', target: 'Vietnam_Manufacturing' } },
    { data: { source: 'SouthKorea_Semiconductors', target: 'USA_Tech' } }
];

const GRAPH_ADJACENCY = {
    'MiddleEast_Oil': ['India_Oil', 'China_Oil'],
    'India_Oil': ['India_Wheat'],
    'China_Oil': ['China_Manufacturing'],
    'China_Manufacturing': ['Vietnam_Manufacturing'],
    'SouthKorea_Semiconductors': ['USA_Tech'],
    'India_Wheat': [],
    'Vietnam_Manufacturing': [],
    'USA_Tech': []
};

const ALERT_RULES = {
    oil: {
        MiddleEast: [
            "Critical oil supply disruption in Middle East — global energy markets at risk.",
            "OPEC production capacity constrained. Brent crude prices surging.",
            "Middle East oil infrastructure under stress. Downstream refineries impacted."
        ],
        China: [
            "China oil imports disrupted — manufacturing slowdown imminent.",
            "Chinese industrial output at risk due to energy supply shock.",
            "Beijing energy reserves being drawn down. Regional supply chains at risk."
        ],
        India: [
            "India oil imports under pressure — fuel subsidies at risk.",
            "Indian economy facing energy cost inflation from oil shock.",
            "South Asian energy corridor disrupted. Neighboring states affected."
        ],
        default: [
            "Oil supply shock detected. Global energy markets destabilized.",
            "Downstream fuel-dependent industries entering warning state.",
            "Energy price inflation propagating across dependent nodes."
        ]
    },
    war: {
        MiddleEast: [
            "Armed conflict in Middle East — Strait of Hormuz shipping routes at risk.",
            "War-level disruption to oil transit corridors. Insurance premiums spiking.",
            "Regional conflict causing panic buying across commodity markets."
        ],
        China: [
            "Military conflict scenario: South China Sea shipping routes threatened.",
            "East Asian trade corridors at risk. Semiconductor supply chain disrupted.",
            "Taiwan Strait stability deteriorating — tech manufacturing severely impacted."
        ],
        India: [
            "Conflict near Indian subcontinent — Bay of Bengal trade routes threatened.",
            "South Asian conflict escalating supply chain disruptions regionally."
        ],
        default: [
            "Armed conflict shock propagating through supply network.",
            "Trade routes disrupted. Insurance and logistics costs escalating.",
            "War-level event detected. Critical node resilience below threshold."
        ]
    },
    sanction: {
        USA: [
            "US tech export sanctions imposed — semiconductor access restricted.",
            "American trade restrictions cutting off advanced component supply.",
            "Sanction regime impacting allied tech supply chains globally."
        ],
        China: [
            "Sanctions on China disrupting global manufacturing inputs.",
            "Chinese export controls triggering retaliatory supply restrictions.",
            "Sanctions cascading: China manufacturing to Vietnam to global assembly."
        ],
        default: [
            "Economic sanctions applied. Trade volumes contracting.",
            "Sanction-related export bans triggering secondary supply disruptions.",
            "Financial isolation of affected node reduces downstream supply flow."
        ]
    },
    exportban: {
        India: [
            "India wheat export ban activated — food security risk in importing nations.",
            "Indian agricultural export restriction: South Asian food supply chain strained.",
            "Wheat export ban causing price spikes in Middle East and Africa."
        ],
        China: [
            "China export ban on rare earth materials — tech sector severely affected.",
            "Chinese component export restrictions hitting semiconductor fabs globally.",
            "Export ban from China impacting global EV and electronics supply chains."
        ],
        default: [
            "Export ban detected. Downstream importers entering critical supply state.",
            "Trade flow cessation detected. Substitute sourcing routes insufficient.",
            "Export restriction causing inventory depletion across dependent nodes."
        ]
    }
};

const NODE_META = {
    'MiddleEast_Oil':            { region: 'Middle East', sector: 'Oil',           connectivity: 4, gdpWeight: 0.18 },
    'India_Oil':                 { region: 'India',       sector: 'Oil',           connectivity: 2, gdpWeight: 0.12 },
    'India_Wheat':               { region: 'India',       sector: 'Agriculture',   connectivity: 1, gdpWeight: 0.08 },
    'China_Oil':                 { region: 'China',       sector: 'Oil',           connectivity: 2, gdpWeight: 0.14 },
    'China_Manufacturing':       { region: 'China',       sector: 'Manufacturing', connectivity: 3, gdpWeight: 0.20 },
    'USA_Tech':                  { region: 'USA',         sector: 'Technology',    connectivity: 2, gdpWeight: 0.22 },
    'SouthKorea_Semiconductors': { region: 'South Korea', sector: 'Semiconductors',connectivity: 2, gdpWeight: 0.14 },
    'Vietnam_Manufacturing':     { region: 'Vietnam',     sector: 'Manufacturing', connectivity: 1, gdpWeight: 0.07 }
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
                    <option value="MiddleEast_Oil">Middle East (Oil)</option>
                    <option value="India_Oil">India (Oil)</option>
                    <option value="India_Wheat">India (Wheat)</option>
                    <option value="China_Oil">China (Oil)</option>
                    <option value="China_Manufacturing">China (Mfg)</option>
                    <option value="USA_Tech">USA (Tech)</option>
                    <option value="SouthKorea_Semiconductors">S.Korea (Semi)</option>
                    <option value="Vietnam_Manufacturing">Vietnam (Mfg)</option>
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
    const nodeId    = document.getElementById('shock-node-select')?.value || 'MiddleEast_Oil';
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
            const intensity = parseInt(document.getElementById('intensity-slider')?.value || 50);
            handleShockApply(evt.target.id(), draggedShock, intensity);
            draggedShock = null;
        }
    });
}

function drag(ev, type) {
    draggedShock = type;
    ev.dataTransfer.setData("text", type);
}
function allowDrop(ev) { ev.preventDefault(); }
function dropNode(ev) {
    ev.preventDefault();
    const type = ev.dataTransfer.getData("text") || draggedShock;
    if (type) {
        const intensity = parseInt(document.getElementById('intensity-slider')?.value || 50);
        handleShockApply('MiddleEast_Oil', type, intensity);
        draggedShock = null;
    }
}
function triggerPreset(type) {
    if (type === 'oil')   handleShockApply('MiddleEast_Oil', 'war', 60);
    if (type === 'trade') handleShockApply('USA_Tech', 'sanction', 45);
}

// ==========================================
// LEAFLET (MAP)
// ==========================================
function initLeaflet() {
    map = L.map('mapContainer').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
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
            labels: ['ME Oil', 'India Wheat', 'China Mfg', 'USA Tech', 'S.Korea Semi'],
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
    const country = nodeId.split('_')[0];
    const shockKey = (shockType || '').toLowerCase();
    const ruleSet = ALERT_RULES[shockKey] || ALERT_RULES['oil'];
    const regionAlerts = ruleSet[country] || ruleSet['default'] || [];
    alerts.push(...regionAlerts.slice(0, 2));

    if (data && data.nodes) {
        Object.entries(data.nodes).forEach(([id, nd]) => {
            const lbl = defaultNodes.find(n => n.data.id === id)?.data.label || id;
            if (nd.supply < 50) alerts.push(`🔴 CRITICAL: ${lbl} supply at ${nd.supply}% — immediate action required.`);
            else if (nd.supply < 70) alerts.push(`🟡 WARNING: ${lbl} supply degraded to ${nd.supply}%.`);
        });
        const avg = Object.values(data.nodes).reduce((s, n) => s + n.supply, 0) / Object.keys(data.nodes).length;
        if (avg < 65) alerts.push("⚠️ Global supply below 65% — systemic risk escalating.");
        if (avg < 75) alerts.push("Global economic slowdown risk — dependent sectors contracting.");
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
        const lbl    = defaultNodes.find(n => n.data.id === id)?.data.label || id;
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
        if ((nodeSupplies[current] ?? 100) < 90) visited.push(current);
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
    t0[originId] = nodeSupplies[originId] ?? 40;

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
        let color, statusLabel;
        if      (supply < 50) { color = "#ef4444"; statusLabel = "Critical"; }
        else if (supply < 80) { color = "#f59e0b"; statusLabel = "Warning";  }
        else                  { color = "#10b981"; statusLabel = "Normal";   }

        const disruption = Math.max(0, 100 - supply);
        const meta  = NODE_META[id] || {};
        const label = defaultNodes.find(n => n.data.id === id)?.data.label || id;
        markers[id].setStyle({ fillColor: color, color: color });
        markers[id].setTooltipContent(buildTooltip(label, statusLabel, supply, disruption, meta.region || ''));
        markers[id].setRadius(supply < 50 ? 14 : supply < 80 ? 11 : 9);
    });
}

function triggerSimulation() { applyShockFromSidebar(); }

// ==========================================
// SIMULATION LOGIC & API CALLS
// ==========================================
async function handleShockApply(nodeId, shockType, intensity) {
    intensity = intensity || parseInt(document.getElementById('intensity-slider')?.value || 50);
    document.getElementById('sim-loader').classList.remove('hidden');
    document.getElementById('global-status').className = "px-3 py-1 bg-yellow-900/50 text-yellow-400 border border-yellow-800 rounded text-xs font-semibold";
    document.getElementById('global-status').innerText = "Simulating...";

    const nodeSelect = document.getElementById('shock-node-select');
    const typeSelect = document.getElementById('shock-type-select');
    if (nodeSelect) nodeSelect.value = nodeId;
    if (typeSelect) typeSelect.value = shockType;

    const parts = nodeId.split('_');
    const payload = {
        country:   parts[0],
        resource:  parts[1] || 'Oil',
        shock:     shockType,
        reduction: intensity
    };

    try {
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        processSimulationData(data, payload, nodeId);
    } catch (e) {
        console.warn("Backend unavailable — using rule-based fallback.", e);
        const mockData = generateRuleBasedSimulation(payload, nodeId);
        setTimeout(() => processSimulationData(mockData, payload, nodeId), 500);
    }
}

function processSimulationData(data, payload, originNodeId) {
    currentSimulationData = data;
    originNodeId = originNodeId || `${payload.country}_${payload.resource}`;

    document.getElementById('sim-loader').classList.add('hidden');
    const statusBadge = document.getElementById('global-status');
    statusBadge.className = "px-3 py-1 bg-red-900/50 text-red-400 border border-red-800 rounded text-xs font-semibold uppercase";
    statusBadge.innerText = `Shock: ${payload.shock}`;

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
            if (srcS < 80 || tgtS < 80) edge.addClass('edge-active');
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
        const lbl    = defaultNodes.find(n => n.data.id === id)?.data.label || id;
        const meta   = NODE_META[id] || {};
        markers[id].setStyle({ fillColor: color, color: color });
        markers[id].setTooltipContent(buildTooltip(lbl, stat.label, supply, Math.max(0, 100 - supply), meta.region || ''));
        markers[id].setRadius(supply < 50 ? 14 : supply < 80 ? 11 : 9);
    });

    // ---- ANALYTICS TAB ----
    if (data.history && charts.line) {
        charts.line.data.datasets[0].data = data.history;
        charts.line.update();
    }

    const sectors   = ['MiddleEast_Oil', 'India_Wheat', 'China_Manufacturing', 'USA_Tech', 'SouthKorea_Semiconductors'];
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
    const worstLabel = worstNode ? (defaultNodes.find(n => n.data.id === worstNode[0])?.data.label || worstNode[0]) : '–';
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
function updateInsights(data, payload, originNodeId, riskLevel, affectedNodes, allNodes) {
    const nodeSupplies = {};
    if (data.nodes) Object.entries(data.nodes).forEach(([id, nd]) => { nodeSupplies[id] = nd.supply; });

    const cascadePath  = bfsPropagate(originNodeId, nodeSupplies);
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
                const lbl = defaultNodes.find(x => x.data.id===n.id)?.data.label || n.id;
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
    if (shock==='oil'||shock==='war') {
        recs.push(`- Activate strategic petroleum reserves to buffer ${payload.country} supply disruption.`);
        recs.push(`- Diversify energy imports: redirect to producers outside the propagation path.`);
    }
    if (shock==='sanction') {
        recs.push(`- Identify alternative trade partners outside the sanctioned region.`);
        recs.push(`- Stockpile critical components ahead of expected supply compression.`);
    }
    if (shock==='exportban') {
        recs.push(`- Engage diplomatic channels to negotiate partial export exemptions.`);
        recs.push(`- Accelerate domestic production of restricted commodities.`);
    }
    if (cascadePath.length > 2) recs.push(`- Deploy circuit-breaker protocols at intermediate nodes to contain cascade propagation.`);
    if (riskLevel==='High') recs.push(`- Invoke emergency supply chain resilience protocols. Activate backup logistics corridors.`);
    recs.push(`- Strengthen long-term supply chain diversification to reduce single-point-of-failure risk.`);
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
        nodeSupplies[id] = Math.max(20, Math.round(100 - reductionFactor * decay * 100));
        (GRAPH_ADJACENCY[id] || []).forEach(nbr => {
            if (!visited.has(nbr)) queue.push({ id: nbr, decay: decay * 0.6 });
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
        const p = n.data.id.split('_');
        nodes[n.data.id] = { country: p[0], resource: p[1]||'', supply: nodeSupplies[n.data.id] };
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
