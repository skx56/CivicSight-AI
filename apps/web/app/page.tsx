'use client';
import { supabase, Report } from '@civicsight/shared';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Dynamic Import for Map (Client Side only)
const MapView = dynamic(() => import('@/components/Map'), { ssr: false, loading: () => <div className="h-full w-full bg-gray-800 animate-pulse rounded-2xl" /> });

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ totalSavings: 0, activeIssues: 0 });
  const [manualCost, setManualCost] = useState(150);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      // Fetch real data from Supabase
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        console.warn("Supabase fetch failed or empty (Demo Mode Active):", error);
        // Fallback Mock Data for Demo
        const demoReports: Report[] = Array.from({ length: 5 }).map((_, i) => ({
          id: `demo-${i}`,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          issue_type: ['Pothole', 'Cracked Sidewalk', 'Graffiti', 'Street Light'][i % 4],
          severity_score: Math.floor(Math.random() * 5) + 5, // 5-10
          location: { type: 'Point', coordinates: [-122.4194 + (Math.random() * 0.01 - 0.005), 37.7749 + (Math.random() * 0.01 - 0.005)] },
          image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80",
          estimated_labor_hours: Math.floor(Math.random() * 5) + 1,
          status: 'pending',
          materials_required: ["Asphalt", "Concrete"]
        }));
        setReports(demoReports);
        return;
      }

      if (data) {
        // @ts-ignore
        setReports(data.map(d => ({
          ...d,
          location: typeof d.location === 'string' ? parsePostGIS(d.location) : d.location
        })));
      }
    };
    fetchReports();

    // Subscribe to Supabase Realtime
    const channel = supabase.channel('realtime_reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => fetchReports())
      .subscribe();

    // Poll Local API (Bridge for Mobile App)
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const localData = await res.json();
          setReports(prev => {
            // Deduplicate by ID
            const map = new Map();
            [...prev, ...localData].forEach(r => map.set(r.id, r));
            // Sort new to old
            return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      } catch (e) { console.error("Local poll error", e); }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    }
  }, []);

  // Recalculate stats whenever reports or manualCost changes
  useEffect(() => {
    const active = reports.length;
    // Formula: (Manual_Inspection_Cost * Reports) - Platform_Op_Cost
    const savings = (manualCost * active) - (active * 0.5);
    setStats({ totalSavings: savings, activeIssues: active });
  }, [reports, manualCost]);

  // Helper to parse POINT(lon lat) string from simple PostGIS select
  const parsePostGIS = (p: string) => {
    // POINT(-122.4 37.7)
    try {
      const coords = p.replace('POINT(', '').replace(')', '').split(' ');
      return { coordinates: [parseFloat(coords[0]), parseFloat(coords[1])] };
    } catch (e) { return { coordinates: [0, 0] } }
  };

  // Chart Data Preparation
  const issueCounts = reports.reduce((acc, curr) => {
    acc[curr.issue_type] = (acc[curr.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(issueCounts).map(k => ({ name: k, count: issueCounts[k] }));

  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("CivicSight AI - Infrastructure Audit Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Active Issues: ${stats.activeIssues}`, 14, 38);
    doc.text(`Estimated Manual Inspection Cost: $${manualCost}/unit`, 14, 46);
    doc.text(`Projected Savings: $${stats.totalSavings.toLocaleString()}`, 14, 54);

    // @ts-ignore
    autoTable(doc, {
      startY: 60,
      head: [['Issue Type', 'Severity', 'Labor (Hrs)', 'Location', 'Status']],
      body: reports.map(r => [
        r.issue_type,
        r.severity_score,
        r.estimated_labor_hours,
        `Lat: ${r.location?.coordinates[1]?.toFixed(4)}, Lon: ${r.location?.coordinates[0]?.toFixed(4)}`,
        r.status
      ]),
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save("civicsight_report.pdf");
  };

  const createMockReport = async () => {
    // Generate random San Francisco location
    const lat = 37.75 + (Math.random() * 0.1);
    const lon = -122.45 + (Math.random() * 0.1);
    const issues = ['Pothole', 'Cracked Sidewalk', 'Graffiti', 'Street Light'];
    const type = issues[Math.floor(Math.random() * issues.length)];
    const severity = Math.floor(Math.random() * 10) + 1;

    const newReport: Report = {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      issue_type: type,
      severity_score: severity,
      // @ts-ignore
      location: { type: 'Point', coordinates: [lon, lat] },
      image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80",
      estimated_labor_hours: Math.floor(Math.random() * 5) + 1,
      status: 'pending',
      materials_required: ["Asphalt", "Concrete"]
    };

    const { error } = await supabase.from('reports').insert({
      image_url: newReport.image_url,
      location: `POINT(${lon} ${lat})`,
      issue_type: type,
      severity_score: severity,
      materials_required: newReport.materials_required,
      estimated_labor_hours: newReport.estimated_labor_hours,
      status: 'pending'
    });

    if (error) {
      console.warn("Insert failed (Demo Mode):", error);
      // alert("Failed to report: " + error.message); // Don't alert in demo mode
    }

    // Always add to local state in demo mode
    setReports(prev => [newReport, ...prev]);
  };

  /* --- NEW REPORT WIZARD STATE --- */
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<'type' | 'location'>('type');
  const [newReportData, setNewReportData] = useState({ type: '', lat: 0, lon: 0 });

  /* --- WIZARD HANDLERS --- */
  const startWizard = () => {
    setIsWizardOpen(true);
    setWizardStep('type');
    setNewReportData({ type: 'Pothole', lat: 0, lon: 0 }); // Default
  };

  const handleTypeSelect = (type: string) => {
    setNewReportData(prev => ({ ...prev, type }));
    setWizardStep('location');
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (!isWizardOpen || wizardStep !== 'location') return;
    setNewReportData(prev => ({ ...prev, lat, lon }));
    // Auto submit after picking location? Or show confirmation? Let's show confirmation/submit in modal.
    // actually, let's keep the modal open and just update the coordinates text.
  };

  const submitNewReport = async () => {
    if (newReportData.lat === 0) {
      alert("Please select a location on the map.");
      return;
    }

    const severity = Math.floor(Math.random() * 10) + 1;
    const newReport: Report = {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      issue_type: newReportData.type,
      severity_score: severity,
      // @ts-ignore
      location: { type: 'Point', coordinates: [newReportData.lon, newReportData.lat] },
      image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80",
      estimated_labor_hours: Math.floor(Math.random() * 5) + 1,
      status: 'pending',
      materials_required: ["Asphalt", "Concrete"]
    };

    // Optimistic Update
    setReports(prev => [newReport, ...prev]);
    setIsWizardOpen(false); // Close Wizard

    // Async Insert
    const { error } = await supabase.from('reports').insert({
      image_url: newReport.image_url,
      location: `POINT(${newReportData.lon} ${newReportData.lat})`,
      issue_type: newReportData.type,
      severity_score: severity,
      materials_required: newReport.materials_required,
      estimated_labor_hours: newReport.estimated_labor_hours,
      status: 'pending'
    });

    if (error) {
      console.warn("Insert failed (Demo Mode):", error);
    }
  };


  const mainRef = useRef<HTMLElement>(null);

  // Force scroll reset when interactivity changes to prevent browser "scroll-into-view" behavior
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [wizardStep, isWizardOpen]);

  return (
    <main ref={mainRef} className="fixed inset-0 w-screen h-screen bg-[#0f172a] text-white overflow-hidden flex flex-col">
      {/* --- CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col p-8 w-full max-w-[1920px] mx-auto h-full overflow-hidden">

        <header className="flex-none mb-6 flex justify-between items-center relative z-[50] bg-[#0f172a] py-2">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              CivicSight AI
            </h1>
            <p className="text-gray-400 mt-2">Global Infrastructure Audit Platform</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={startWizard}
              className="glass-panel px-4 py-2 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer border-emerald-500/50 flex flex-col items-center group">
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest mb-0.5 group-hover:text-emerald-300">Citizen App</span>
              <span className="text-sm font-bold text-white flex items-center gap-1">
                <span>+</span> New Issue
              </span>
            </button>

            <div className="glass-panel px-4 py-2 flex flex-col items-end border-gray-600/30">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Manual Insp. Cost ($)</label>
              <input
                type="number"
                value={manualCost}
                onChange={(e) => setManualCost(Number(e.target.value))}
                className="bg-transparent text-right text-white font-mono font-bold border-b border-gray-500 focus:border-emerald-500 outline-none w-20"
              />
            </div>

            <div className="glass-panel px-6 py-3">
              <span className="text-xs text-gray-400 uppercase tracking-widest block">Active Issues</span>
              <span className="text-2xl font-mono font-bold text-white">{stats.activeIssues}</span>
            </div>
            <div className="glass-panel px-6 py-3 border-emerald-500/30 bg-emerald-900/10">
              <span className="text-xs text-emerald-400 uppercase tracking-widest block">Fiscal Savings</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">${stats.totalSavings.toLocaleString()}</span>
            </div>
            <button
              onClick={generatePDF}
              className="glass-panel px-6 py-3 hover:bg-white/10 active:scale-95 transition-all cursor-pointer border-blue-500/30">
              <span className="text-xs text-blue-400 uppercase tracking-widest block">Report</span>
              <span className="text-lg font-bold text-white flex items-center gap-2">⬇ PDF</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 relative z-0">
          {/* Main Map Panel */}
          <div className={`md:col-span-2 glass-card p-1 rounded-2xl h-full relative overflow-hidden transition-all duration-500 ${isWizardOpen && wizardStep === 'location' ? 'ring-4 ring-emerald-500/50' : ''}`}>
            <MapView reports={reports} onMapClick={handleMapClick} onReportSelect={setSelectedReport} />

            {isWizardOpen && wizardStep === 'location' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
                👇 Tap Map to Pin Location
              </div>
            )}

            {!isWizardOpen && (
              <div className="absolute top-4 left-4 z-[999] glass-panel px-4 py-2 pointer-events-none">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> LIVE AUDIT FEED
                </span>
              </div>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-6 right-6 z-[999] glass-panel px-4 py-3 bg-slate-900/80">
              <h3 className="text-[10px] uppercase text-gray-400 font-bold mb-2">Severity Heatmap</h3>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                  <span className="text-xs text-white">Critical (8-10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-white">Minor (1-7)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Panel */}
          <div className="flex flex-col gap-6 h-full overflow-hidden">
            {/* Charts */}
            <div className="glass-card p-6 flex-1 rounded-2xl min-h-0 flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-none">
                <h2 className="text-xl font-bold text-gray-200">Defect Distribution</h2>
                <span className="text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">AI Analysis</span>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#10B981' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10B981', '#34D399', '#059669'][index % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Prioritized Roadmap */}
            <div className="glass-card p-6 flex-1 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <h2 className="text-xl font-bold mb-4 text-gray-200 flex items-center gap-2 flex-none">
                Prioritized Roadmap
                <span className="text-[10px] py-0.5 px-2 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">HIGH URGENCY</span>
              </h2>
              <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                {[...reports]
                  .sort((a, b) => b.severity_score - a.severity_score) // Sort by Severity Descending
                  .map(r => (
                    <div key={r.id} onClick={() => setSelectedReport(r)} className="flex gap-3 items-center p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group cursor-pointer active:scale-[0.98]">
                      <div className={`w-1.5 h-10 rounded-full ${r.severity_score >= 8 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-emerald-500'}`} />
                      <img src={r.image_url} className="w-12 h-12 rounded-lg object-cover bg-gray-700 group-hover:scale-105 transition-transform" alt="thumb" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-white truncate">{r.issue_type}</span>
                          <span className={`text-[10px] font-mono px-1.5 rounded ${r.severity_score >= 8 ? 'text-red-300 bg-red-900/30' : 'text-emerald-300 bg-emerald-900/30'}`}>
                            Sev: {r.severity_score}
                          </span>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-xs text-gray-400 truncate">Est. Labor: <span className="text-gray-200">{r.estimated_labor_hours}h</span></span>
                          <span className="text-[10px] text-gray-500 font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- REPORT DETAILS MODAL --- */}
      {selectedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedReport(null)}>
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row bg-[#0f172a]" onClick={e => e.stopPropagation()}>

            {/* Image Side */}
            <div className="w-full md:w-1/2 p-4 h-64 md:h-auto">
              <img src={selectedReport.image_url} alt={selectedReport.issue_type} className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/10" />
            </div>

            {/* Details Side */}
            <div className="w-full md:w-1/2 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-3 h-3 rounded-full ${selectedReport.severity_score >= 8 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-emerald-500'}`} />
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Issue Details</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedReport.issue_type}</h2>
                  <p className="text-gray-400 text-sm font-mono">{selectedReport.id}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Severity</span>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-bold ${selectedReport.severity_score >= 8 ? 'text-red-500' : 'text-emerald-500'}`}>{selectedReport.severity_score}</span>
                    <span className="text-gray-500 mb-1">/ 10</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Est. Labor</span>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">{selectedReport.estimated_labor_hours}</span>
                    <span className="text-gray-500 mb-1">hours</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-xs text-gray-500 uppercase tracking-widest block mb-4">Required Materials</span>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.materials_required?.map((m: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-medium">
                      {m}
                    </span>
                  )) || <span className="text-gray-600 italic">No materials specified</span>}
                </div>
              </div>

              <div className="mb-8">
                <span className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Location Coordinates</span>
                <div className="font-mono text-gray-300 bg-black/40 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                  <span>
                    {selectedReport.location?.coordinates[1]?.toFixed(6)}, {selectedReport.location?.coordinates[0]?.toFixed(6)}
                  </span>
                  <button className="text-xs text-emerald-500 hover:text-emerald-400 uppercase font-bold tracking-wider">Copy</button>
                </div>
              </div>

              <button className="mt-auto w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2">
                <span>Dispatch Maintenance Crew</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- WIZARD MODAL (Existing) --- */}
      {isWizardOpen && (
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${wizardStep === 'location' ? 'bg-transparent pointer-events-none items-end justify-end p-8 z-[800]' : 'bg-black/60 backdrop-blur-sm z-[1000]'}`}>
          <div className={`glass-card p-8 w-full max-w-md rounded-2xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] pointer-events-auto transition-all duration-500 ${wizardStep === 'location' ? 'mr-0 mb-0 ring-2 ring-emerald-500/50' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Report New Issue</h2>
              <button onClick={() => setIsWizardOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {wizardStep === 'type' ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-4">Select the type of infrastructure defect:</p>
                {['Pothole', 'Cracked Sidewalk', 'Graffiti', 'Street Light', 'Illegal Dumping', 'Other'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/50 border border-transparent transition-all group flex justify-between items-center"
                  >
                    <span className="font-bold text-gray-200 group-hover:text-emerald-300">{type}</span>
                    <span className="text-emerald-500 opacity-0 group-hover:opacity-100">→</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-xs text-emerald-400 uppercase tracking-widest block mb-1">Issue Type</span>
                    <span className="text-xl font-bold text-white">{newReportData.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">STEP 2/2</span>
                    <span className="text-xs font-bold text-white animate-pulse">Select Location</span>
                  </div>
                </div>

                <div className="text-center py-4 bg-black/20 rounded-xl border border-white/5">
                  <p className="text-gray-300 mb-2 font-medium">
                    {newReportData.lat === 0 ? "👉 Tap anywhere on the map to pin location" : "✅ Location Pin Dropped!"}
                  </p>
                  <div className={`font-mono text-xs p-2 rounded inline-block transition-colors ${newReportData.lat === 0 ? 'text-gray-500' : 'text-emerald-400 bg-emerald-900/20 border border-emerald-500/30'}`}>
                    {newReportData.lat === 0 ? "Waiting for map click..." : `${newReportData.lat.toFixed(5)}, ${newReportData.lon.toFixed(5)}`}
                  </div>
                </div>

                <button
                  onClick={submitNewReport}
                  disabled={newReportData.lat === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${newReportData.lat !== 0 ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 cursor-pointer transform hover:scale-[1.02]' : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'}`}
                >
                  {newReportData.lat !== 0 ? "Submit Report" : "Locate on Map"}
                </button>

                <button onClick={() => setWizardStep('type')} className="w-full py-2 text-sm text-gray-400 hover:text-white">
                  ← Back to Type Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
