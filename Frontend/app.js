// app.js

// ==========================================
// STATE MANAGEMENT & CONSTANTS
// ==========================================
const API_BASE = "";
let cy; // Cytoscape instance
let map; // Leaflet instance
let markers = {}; // Leaflet markers
let charts = {}; // Chart.js instances
let draggedShock = null;
let currentSimulationData = null;

// Initial Nodes Data (Fallback if API fails)
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

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCytoscape();
    initLeaflet();
    initCharts();
    initHeatmap(defaultNodes);
});

// ==========================================
// TAB NAVIGATION
// ==========================================
function initTabs() {
    const links = document.querySelectorAll('.nav-link');
    const contents = document.querySelectorAll('.tab-content');

    links.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active from all
            links.forEach(l => l.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Fix render bugs for hidden canvases/maps
            if(targetId === 'map') {
                setTimeout(() => map.invalidateSize(), 100);
            } else if (targetId === 'network') {
                setTimeout(() => cy.resize(), 100);
            }
        });
    });
}

// ==========================================
// CYTOSCAPE (NETWORK GRAPH)
// ==========================================
function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: {
            nodes: defaultNodes,
            edges: defaultEdges
        },
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#10b981', // green-500
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 5,
                    'font-size': '12px',
                    'width': 30,
                    'height': 30,
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
                style: {
                    'background-color': '#ef4444', // red-500
                    'border-color': '#991b1b',
                    'border-width': 4
                }
            },
            {
                selector: '.affected-medium',
                style: {
                    'background-color': '#f59e0b', // yellow-500
                }
            },
            {
                selector: '.ripple',
                style: {
                    'line-color': '#ef4444',
                    'target-arrow-color': '#ef4444',
                    'width': 4
                }
            }
        ],
        layout: {
            name: 'breadthfirst',
            directed: true,
            padding: 30
        }
    });

    // Drop handler on cytoscape canvas
    cy.on('tap', 'node', function(evt){
        // Manual click fallback if drag/drop fails
        if(draggedShock) {
            handleShockApply(evt.target.id(), draggedShock);
            draggedShock = null;
        }
    });
}

// Drag & Drop Handlers for Shock Tools
function drag(ev, type) {
    draggedShock = type;
    ev.dataTransfer.setData("text", type);
}

function allowDrop(ev) {
    ev.preventDefault();
}

function dropNode(ev) {
    ev.preventDefault();
    // Cytoscape handles exact node drops better via its own events, 
    // but if dropped generally on canvas without target, we default to MiddleEast
    const type = ev.dataTransfer.getData("text") || draggedShock;
    if(type) {
        handleShockApply('MiddleEast_Oil', type); 
        draggedShock = null;
    }
}

function triggerPreset(type) {
    if(type === 'oil') handleShockApply('MiddleEast_Oil', 'war');
    if(type === 'trade') handleShockApply('USA_Tech', 'sanction');
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

    // Add initial markers
    defaultNodes.forEach(node => {
        if(node.data.lat && node.data.lng) {
            const marker = L.circleMarker([node.data.lat, node.data.lng], {
                radius: 8,
                fillColor: "#10b981",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            marker.bindTooltip(node.data.label);
            markers[node.data.id] = marker;
        }
    });
}

// ==========================================
// CHART.JS (ANALYTICS)
// ==========================================
function initCharts() {
    Chart.defaults.color = '#a0aec0';
    Chart.defaults.borderColor = '#333333';

    // Line Chart
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    charts.line = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Day 0', 'Day 15', 'Day 30', 'Day 45', 'Day 60', 'Day 75', 'Day 90'],
            datasets: [{
                label: 'Global Supply %',
                data: [100, 100, 100, 100, 100, 100, 100],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Bar Chart
    const ctxBar = document.getElementById('barChart').getContext('2d');
    charts.bar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Oil', 'Wheat', 'Manufacturing', 'Tech', 'Semiconductors'],
            datasets: [{
                label: 'Supply Level %',
                data: [100, 100, 100, 100, 100],
                backgroundColor: ['#10b981', '#10b981', '#10b981', '#10b981', '#10b981']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Pie Chart
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Unaffected', 'Mild Impact', 'Severe Impact'],
            datasets: [{
                data: [100, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    updatePieLegend([100, 0, 0]);
}

function updatePieLegend(dataArr) {
    const ul = document.getElementById('pie-legend');
    ul.innerHTML = `
        <li><span class="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span> Unaffected (${dataArr[0]}%)</li>
        <li><span class="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> Mild Impact (${dataArr[1]}%)</li>
        <li><span class="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span> Severe Impact (${dataArr[2]}%)</li>
    `;
}

function initHeatmap(nodes) {
    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';
    nodes.forEach(n => {
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center justify-center p-2 rounded bg-green-500/20 border border-green-500/50';
        div.id = `heat-${n.data.id}`;
        div.innerHTML = `<span class="text-[10px] text-gray-300 text-center leading-tight">${n.data.label}</span><span class="font-bold text-sm text-white mt-1">100</span>`;
        container.appendChild(div);
    });
}

let simulationHistory = []; // To store the 90-day array from C

async function runSimulation() {
    const response = await fetch('/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            country: currentCountry, 
            resource: currentResource, 
            shock: currentShock,
            reduction: currentReduction
        })
    });

    const data = await response.json();
    
    if (data.history) {
        simulationHistory = data.history; // Save the 90-day array
        startPlayback(); // Trigger the "Play" animation
    }
}

// --- Timeline Slider Logic ---
const slider = document.getElementById('timelineSlider'); // Ensure your HTML has this ID
const dayDisplay = document.getElementById('dayDisplay');

slider.addEventListener('input', (e) => {
    const day = e.target.value;
    dayDisplay.innerText = `Day: ${day} / 90`;
    
    // Update map/charts based on the data for that specific day
    if (simulationHistory.length > 0) {
        updateUIForDay(day);
    }
});

function updateUIForDay(day) {
    const supplyAtDay = simulationHistory[day];
    
    // 1. Update Map Colors (Example: Leaflet markers)
    updateMapColors(supplyAtDay); 
    
    // 2. Update Chart Tracker
    myChart.setDatasetValue(0, supplyAtDay); // Assuming Chart.js
    myChart.update();
}

function startPlayback() {
    let day = 0;
    const interval = setInterval(() => {
        if (day >= 90) {
            clearInterval(interval);
            return;
        }
        slider.value = day;
        updateUIForDay(day);
        day++;
    }, 50); // 50ms per "day" for smooth animation
}

// ==========================================
// SIMULATION LOGIC & API CALLS
// ==========================================
function triggerSimulation() {
    handleShockApply('MiddleEast_Oil', 'exportban');
}

async function handleShockApply(nodeId, shockType) {
    // Show loader
    document.getElementById('sim-loader').classList.remove('hidden');
    document.getElementById('global-status').className = "px-3 py-1 bg-yellow-900/50 text-yellow-400 border border-yellow-800 rounded text-xs font-semibold";
    document.getElementById('global-status').innerText = "Simulating...";

    const parts = nodeId.split('_');
    const payload = {
        country: parts[0],
        resource: parts[1] || 'Oil',
        shock: shockType,
        reduction: 50 // You can later map this to a UI slider if you add one back
    };

    try {
        // Real API Call to your Flask backend
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(!response.ok) throw new Error("API error");
        const data = await response.json();
        
        // Pass the real data to the UI processor
        processSimulationData(data, payload);
        
    } catch (e) {
        console.error("Backend unavailable, ensure Flask is running.", e);
        // Fallback to mock data only if Flask is turned off
        const mockData = generateMockSimulation(payload);
        setTimeout(() => processSimulationData(mockData, payload), 800);
    }
}

function processSimulationData(data, payload) {
    currentSimulationData = data;
    
    // Hide loader and update status badge
    document.getElementById('sim-loader').classList.add('hidden');
    const statusBadge = document.getElementById('global-status');
    statusBadge.className = "px-3 py-1 bg-red-900/50 text-red-400 border border-red-800 rounded text-xs font-semibold uppercase";
    statusBadge.innerText = `Shock: ${payload.shock}`;

    // 1. Update Network Canvas (Cytoscape)
    cy.nodes().forEach(node => {
        node.removeClass('shocked').removeClass('affected-medium');
        const id = node.id();
        if(data.nodes[id]) {
            const supply = data.nodes[id].supply;
            if(supply < 50) node.addClass('shocked');
            else if(supply < 80) node.addClass('affected-medium');
        }
    });

    // 2. Update Map Markers (Leaflet)
    Object.keys(markers).forEach(id => {
        if(data.nodes[id]) {
            const supply = data.nodes[id].supply;
            let color = "#10b981"; // Green (Healthy)
            if(supply < 50) color = "#ef4444"; // Red (Critical)
            else if(supply < 80) color = "#f59e0b"; // Yellow (Warning)
            
            markers[id].setStyle({ fillColor: color, color: color });
        }
    });

    // 3. Update Global Metrics (Sidebar/Bottom Panel)
    const avgSupply = data.metrics.avgSupply;
    const textSupplyColor = avgSupply < 70 ? 'text-red-500' : avgSupply < 85 ? 'text-yellow-500' : 'text-green-500';
    const bgSupplyColor = avgSupply < 70 ? 'bg-red-500' : avgSupply < 85 ? 'bg-yellow-500' : 'bg-green-500';

    document.getElementById('metric-supply').innerText = `${avgSupply}%`;
    document.getElementById('metric-supply').className = `text-2xl font-bold ${textSupplyColor}`;
    document.getElementById('bar-supply').style.width = `${avgSupply}%`;
    document.getElementById('bar-supply').className = `${bgSupplyColor} h-2 rounded-full transition-all duration-500`;
    
    // Proper GDP calculation from your backend
    document.getElementById('metric-gdp').innerText = `-$${data.metrics.gdpImpact || (1000 - data.metrics.totalGDP)}B`;

    // 4. Update Analytics Tab Charts
    // Line Chart: Supply vs Time (90 Day Forecast)
    if(data.history && charts.line) {
        charts.line.data.datasets[0].data = data.history;
        charts.line.update();
    }

    // Bar Chart: Sector Impact
    const sectors = ['MiddleEast_Oil', 'India_Wheat', 'China_Manufacturing', 'USA_Tech', 'SouthKorea_Semiconductors'];
    const barData = sectors.map(id => data.nodes[id]?.supply || 100);
    const barColors = barData.map(v => v < 50 ? '#ef4444' : v < 80 ? '#f59e0b' : '#10b981');
    
    charts.bar.data.datasets[0].data = barData;
    charts.bar.data.datasets[0].backgroundColor = barColors;
    charts.bar.update();

    // 5. Update Insights Tab (The "Game Changer")
    // Ensure these IDs match your Insights Tab HTML
    const aiSummaryEl = document.getElementById('ai-summary-text'); 
    if(aiSummaryEl) {
        aiSummaryEl.innerText = data.insights.join(" ");
    }

    document.getElementById('root-cause-val').innerHTML = `
        <span class="text-blue-400 font-bold">${payload.country}</span><br>
        <span class="text-gray-400 text-xs">Trigger: ${payload.shock.toUpperCase()}</span>
    `;

    // Update the Cascade Path visual
    const cascadePathEl = document.getElementById('cascade-path-text');
    if(cascadePathEl) {
        cascadePathEl.innerText = data.metrics.affectedNodes > 1 
            ? `${payload.country} → ${data.insights.find(i => i.includes("impacted")) || "Dependent Nodes"}`
            : "Impact localized to origin.";
    }
}

// Mock Data Generator if Backend is down
function generateMockSimulation(payload) {
    const isOil = payload.resource.toLowerCase() === 'oil';
    return {
        metrics: { avgSupply: isOil ? 68.4 : 82.1, riskLevel: isOil ? "High" : "Medium", totalGDP: 0 },
        alerts: [
            `${payload.country} ${payload.resource} critically low`,
            "Supply disruption detected in dependent regions",
            "Global economic slowdown risk"
        ],
        insights: [`Mock Insight: ${payload.shock} caused ripple effects.`],
        nodes: {
            "MiddleEast_Oil": { country: "MiddleEast", resource: "Oil", supply: isOil ? 40 : 100 },
            "India_Oil": { country: "India", resource: "Oil", supply: isOil ? 55 : 100 },
            "India_Wheat": { country: "India", resource: "Wheat", supply: isOil ? 70 : 100 },
            "China_Oil": { country: "China", resource: "Oil", supply: isOil ? 45 : 100 },
            "China_Manufacturing": { country: "China", resource: "Manufacturing", supply: isOil ? 60 : (payload.resource==='Manufacturing'? 50: 100) },
            "USA_Tech": { country: "USA", resource: "Tech", supply: 85 },
            "SouthKorea_Semiconductors": { country: "SouthKorea", resource: "Semiconductors", supply: 90 },
            "Vietnam_Manufacturing": { country: "Vietnam", resource: "Manufacturing", supply: isOil ? 65 : 100 }
        }
    };
}
