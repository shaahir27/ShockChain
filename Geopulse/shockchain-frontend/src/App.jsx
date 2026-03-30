import React, { useState, useMemo } from 'react';
import { 
  Globe, BarChart3, Lightbulb, Truck, AlertTriangle, 
  RotateCcw, Activity, TrendingDown, Map as MapIcon, 
  Sparkles, MessageSquare, Zap, Info,
  Cpu, Droplets, Wheat, Anchor, Box, ZapOff
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

/**
 * SHOCKCHAIN: MULTI-RESOURCE REACT DASHBOARD
 * Core Logic: Map-based interaction triggers C-Engine cascades across diverse industries.
 */

const apiKey = ""; // Gemini API Key
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const INITIAL_NODES = {
  "Taiwan_Chips": { id: "Taiwan_Chips", country: "Taiwan", resource: "Semiconductors", type: "tech", supply: 100, lat: 23.5, lng: 121 },
  "Ukraine_Grain": { id: "Ukraine_Grain", country: "Ukraine", resource: "Grain", type: "agri", supply: 100, lat: 48, lng: 31 },
  "Saudi_Oil": { id: "Saudi_Oil", country: "Saudi Arabia", resource: "Oil", type: "energy", supply: 100, lat: 24, lng: 45 },
  "Germany_Auto": { id: "Germany_Auto", country: "Germany", resource: "Automotive", type: "mfg", supply: 100, lat: 51, lng: 10 },
  "Brazil_Iron": { id: "Brazil_Iron", country: "Brazil", resource: "Iron Ore", type: "raw", supply: 100, lat: -14, lng: -51 },
  "Australia_Lithium": { id: "Australia_Lithium", country: "Australia", resource: "Lithium", type: "raw", supply: 100, lat: -25, lng: 133 },
  "USA_Tech": { id: "USA_Tech", country: "USA", resource: "Cloud Svcs", type: "tech", supply: 100, lat: 38, lng: -97 },
};

const getResourceIcon = (type, size = 16) => {
  switch(type) {
    case 'tech': return <Cpu size={size} className="text-cyan-400" />;
    case 'energy': return <Droplets size={size} className="text-blue-400" />;
    case 'agri': return <Wheat size={size} className="text-amber-400" />;
    case 'raw': return <Box size={size} className="text-emerald-400" />;
    case 'mfg': return <Zap size={size} className="text-purple-400" />;
    default: return <Anchor size={size} />;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [metrics, setMetrics] = useState({ avgSupply: 100, totalGDP: 82400, riskLevel: "Low" });
  const [history, setHistory] = useState([{ time: 0, gdp: 82400, supply: 100 }]);
  const [aiReport, setAiReport] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeShock, setActiveShock] = useState(null);

  // --- Gemini API: Cross-Industry Strategic Analysis ---
  const fetchAiIntel = async () => {
    setIsAiLoading(true);
    const nodeStatus = Object.values(nodes)
      .map(n => `${n.country} (${n.resource}): ${n.supply}% capacity`)
      .join('\n');
    
    const prompt = `Simulation results indicate the following resource capacities:
    ${nodeStatus}
    
    Identify the most critical industrial bottleneck. Predict the ripple effect on consumer prices and suggest one diversification strategy for global trade partners.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: "You are the ShockChain Intelligence Core. Provide high-density, professional geopolitical insights." }] }
        })
      });
      const data = await response.json();
      setAiReport(data.candidates?.[0]?.content?.parts?.[0]?.text);
      setActiveTab('insights');
    } catch (e) {
      setAiReport("Analysis engine timed out. Verify your API credentials.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Backend Bridge: Trigger C-Simulation ---
  const applyShock = async (node) => {
    setIsSimulating(true);
    setActiveShock(node);
    try {
      const response = await fetch('http://localhost:5000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          country: node.country.replace(/\s/g, ''), 
          resource: node.resource.replace(/\s/g, ''), 
          shock: 'blockage' 
        })
      });
      const data = await response.json();
      
      const newNodes = { ...nodes };
      Object.keys(data.nodes).forEach(k => {
        if (newNodes[k]) newNodes[k].supply = data.nodes[k].supply;
      });

      setNodes(newNodes);
      setMetrics(data.metrics);
      setHistory(prev => [...prev, { 
        time: prev.length, 
        gdp: data.metrics.totalGDP, 
        supply: data.metrics.avgSupply 
      }]);
    } catch (err) {
      console.error("Backend unreachable. Ensure app.py is running on port 5000.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* --- Vertical Navigation --- */}
      <nav className="w-24 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-10 gap-12 z-50">
        <div className="relative group">
           <div className="absolute -inset-2 bg-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
           <div className="relative p-4 bg-blue-600 rounded-2xl shadow-2xl"><Globe className="w-7 h-7 text-white animate-[pulse_4s_infinite]"/></div>
        </div>
        
        <div className="flex flex-col gap-10 flex-1">
          <NavItem active={activeTab==='map'} icon={<MapIcon/>} onClick={()=>setActiveTab('map')} label="Global Map"/>
          <NavItem active={activeTab==='analytics'} icon={<BarChart3/>} onClick={()=>setActiveTab('analytics')} label="Impact Data"/>
          <NavItem active={activeTab==='logistics'} icon={<Truck/>} onClick={()=>setActiveTab('logistics')} label="Node Registry"/>
          <NavItem active={activeTab==='insights'} icon={<Lightbulb/>} onClick={()=>setActiveTab('insights')} label="AI Intel"/>
        </div>

        <button onClick={() => window.location.reload()} className="p-3 text-slate-600 hover:text-white transition-colors duration-300">
          <RotateCcw className="w-6 h-6"/>
        </button>
      </nav>

      {/* --- Primary Dashboard Stage --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* --- Global Metric Ribbon --- */}
        <header className="h-24 border-b border-slate-800 flex items-center px-10 justify-between bg-slate-950/60 backdrop-blur-2xl relative z-40">
          <div className="flex gap-16">
            <Metric label="Aggregate Resource Health" value={`${metrics.avgSupply}%`} color="text-blue-400" />
            <Metric label="Simulated World GDP" value={`$${(metrics.totalGDP/1000).toFixed(1)}T`} color="text-emerald-400" />
            <Metric label="Network Volatility" value={metrics.riskLevel} color={metrics.riskLevel === 'High' ? 'text-red-500' : 'text-yellow-500'} />
          </div>
          
          <button 
            onClick={fetchAiIntel}
            disabled={history.length < 2 || isAiLoading}
            className="group relative flex items-center gap-3 px-8 py-3 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-20 shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity"></div>
            {isAiLoading ? <Activity className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-indigo-600"/>}
            <span className="relative">Consult AI Intel</span>
          </button>
        </header>

        {/* --- Tab Content Frame --- */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'map' && (
            <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-inner group">
              {/* Decorative grid background */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:32px_32px]"></div>
              
              {Object.values(nodes).map(node => (
                <button
                  key={node.id}
                  onClick={() => applyShock(node)}
                  style={{ left: `${(node.lng + 180) * (100/360)}%`, top: `${(90 - node.lat) * (100/180)}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all hover:scale-125 group/node"
                >
                  <div className={`relative p-3 rounded-2xl border-2 transition-all duration-700 shadow-2xl flex items-center justify-center
                    ${node.supply > 85 ? 'bg-slate-900 border-white/5' : 'bg-red-950/80 border-red-500/50 animate-pulse'}`}>
                    {getResourceIcon(node.type, 20)}
                  </div>
                  
                  {/* Specialized Tooltip */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 p-3 rounded-xl opacity-0 group-hover/node:opacity-100 transition-opacity shadow-2xl pointer-events-none z-50">
                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-1">{node.country}</p>
                     <p className="text-sm font-bold whitespace-nowrap">{node.resource}: {node.supply}%</p>
                     <p className="text-[9px] text-blue-500 font-bold mt-1 uppercase">Click to Deploy Shock</p>
                  </div>
                </button>
              ))}

              {isSimulating && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center">
                  <ZapOff className="w-16 h-16 text-red-500 animate-bounce mb-6"/>
                  <h2 className="text-3xl font-black tracking-tighter text-white">SYSTEMIC DECOUPLE IN PROGRESS</h2>
                  <p className="text-slate-500 font-mono text-sm mt-2 uppercase tracking-widest">Simulating trade-war fallout across global nodes...</p>
                </div>
              )}

              <div className="absolute bottom-10 left-10 space-y-4">
                 <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Strategic Assets</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <LegendItem type="tech" label="Chips / AI"/>
                      <LegendItem type="energy" label="Energy / Oil"/>
                      <LegendItem type="agri" label="Agriculture"/>
                      <LegendItem type="mfg" label="Manufacturing"/>
                      <LegendItem type="raw" label="Raw Materials"/>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-2 gap-8 h-full">
              <AnalyticsBox title="World GDP Resilience" subtitle="Quantifying economic contraction per simulation step">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gdpArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                    <XAxis dataKey="time" stroke="#475569" hide />
                    <YAxis stroke="#475569" domain={['dataMin - 1000', 'auto']} />
                    <Tooltip contentStyle={{backgroundColor:'#0f172a', border:'1px solid #334155', borderRadius:'12px'}} />
                    <Area type="monotone" dataKey="gdp" stroke="#10b981" strokeWidth={4} fill="url(#gdpArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </AnalyticsBox>
              
              <AnalyticsBox title="Supply Chain Chain-Reaction" subtitle="Average node availability across all resource types">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                    <XAxis dataKey="time" stroke="#475569" hide />
                    <YAxis stroke="#475569" domain={[0, 100]} />
                    <Tooltip contentStyle={{backgroundColor:'#0f172a', border:'1px solid #334155', borderRadius:'12px'}} />
                    <Line type="stepAfter" dataKey="supply" stroke="#3b82f6" strokeWidth={5} dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsBox>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-700">
                  <tr>
                    <th className="p-8">Region & Industry</th>
                    <th className="p-8">Supply Volume</th>
                    <th className="p-8">Systemic Criticality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Object.values(nodes).map(node => (
                    <tr key={node.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">{getResourceIcon(node.type)}</div>
                          <div>
                            <p className="font-black text-white">{node.country}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{node.resource}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-6">
                           <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 w-32">
                              <div className={`h-full transition-all duration-1000 rounded-full ${node.supply > 80 ? 'bg-blue-500' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} style={{width:`${node.supply}%`}} />
                           </div>
                           <span className="font-mono font-bold text-sm">{node.supply}%</span>
                        </div>
                      </td>
                      <td className="p-8">
                         <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] ${node.supply > 80 ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-500 bg-red-500/10 border border-red-500/20'}`}>
                           {node.supply > 80 ? 'Optimal Flow' : 'Severe Congestion'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="max-w-4xl mx-auto space-y-10 pb-20">
               <div className="flex items-end justify-between">
                 <h2 className="text-5xl font-black tracking-tighter">Strategic<br/><span className="text-blue-500 underline decoration-slate-800 underline-offset-8">Intelligence</span></h2>
                 {activeShock && <div className="text-right"><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Active Scenario</p><p className="font-bold text-red-500">Collapse of {activeShock.country} Hub</p></div>}
               </div>

               {aiReport ? (
                 <div className="group relative">
                   <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[3rem] blur opacity-20 transition duration-1000 group-hover:opacity-40"></div>
                   <div className="relative bg-slate-900 border border-slate-800 p-12 rounded-[3rem] shadow-2xl leading-relaxed text-slate-200">
                      <div className="mb-8 flex items-center gap-3 text-indigo-400">
                        <MessageSquare size={20}/>
                        <span className="text-xs font-black uppercase tracking-widest">Executive Briefing — AI Decrypted</span>
                      </div>
                      <div className="text-xl space-y-6 whitespace-pre-line font-medium italic">
                        {aiReport}
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="p-24 text-center border-4 border-dashed border-slate-900 rounded-[3rem] flex flex-col items-center gap-6">
                    <Info className="w-16 h-16 text-slate-800"/>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Deploy a shock on the map and click "Consult AI Intel" to analyze resource specific fallout.</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ active, icon, onClick, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 group transition-all duration-500 ${active ? 'text-blue-500' : 'text-slate-600 hover:text-slate-300'}`}>
    <div className={`p-4 rounded-[1.25rem] transition-all duration-500 ${active ? 'bg-blue-500/10 scale-110 shadow-xl' : 'group-hover:bg-slate-800'}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-500 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
  </button>
);

const Metric = ({ label, value, color }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
    <span className={`text-3xl font-black tracking-tighter ${color}`}>{value}</span>
  </div>
);

const LegendItem = ({ type, label }) => (
  <div className="flex items-center gap-3">
    <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800">{getResourceIcon(type, 12)}</div>
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

const AnalyticsBox = ({ title, subtitle, children }) => (
  <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] flex flex-col shadow-2xl">
    <div className="mb-10">
      <h3 className="text-2xl font-black tracking-tight text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{subtitle}</p>
    </div>
    <div className="flex-1">{children}</div>
  </div>
);