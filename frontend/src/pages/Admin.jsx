import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Users,
  Activity,
  Settings,
  Server,
  ShieldAlert,
  Database,
  ArrowRight,
  LogOut,
  FileDown,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiUrl, SOCKET_BASE_URL } from '../config/api';

const SOCKET_URL = SOCKET_BASE_URL;

const TABS = [
  { id: 'overview', label: 'OVERVIEW', icon: Activity },
  { id: 'operators', label: 'OPERATORS', icon: Users },
  { id: 'infrastructure', label: 'INFRASTRUCTURE', icon: Server },
  { id: 'security', label: 'SECURITY LOGS', icon: ShieldAlert },
  { id: 'config', label: 'SYSTEM CONFIG', icon: Settings },
];

export default function Admin() {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [operators, setOperators] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, operatorsRes, logsRes] = await Promise.all([
        axios.get(apiUrl('/admin/stats')),
        axios.get(apiUrl('/admin/operators')),
        axios.get(apiUrl('/admin/logs?limit=25')),
      ]);
      
      const st = statsRes.data;
      setStats([
        { label: 'ACTIVE OPERATORS', value: st.activeOperators.toString(), trend: 'TOTAL', icon: Users },
        { label: 'ONLINE NOW', value: st.onlineOperators.toString(), trend: 'LIVE', icon: Activity },
        { label: 'OPEN INCIDENTS', value: String(st.openIncidents || 0), trend: 'ACTIVE', icon: ClipboardList },
        { label: 'SYSTEM LOAD', value: st.systemLoad, trend: 'NOMINAL', icon: Server },
        { label: 'SECURITY ALERTS', value: st.securityAlerts.toString(), trend: 'ACTION REQ', icon: ShieldAlert, critical: st.securityAlerts > 0 },
      ]);
      setOperators(operatorsRes.data);
      setAuditLogs(logsRes.data?.logs || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket.io connection for real-time updates
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('operator_updated', () => {
      console.log('Real-time sync: Operator updated, refetching...');
      fetchData();
    });
    socket.on('incident_updated', fetchData);
    socket.on('incident:updated', fetchData);
    socket.on('incident:new', fetchData);
    socket.on('incident:resolved', fetchData);

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        overview: stats,
        operators,
        auditLogs,
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rescuesync-admin-report-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const activeStats = stats || [];

  const configCards = [
    { label: 'Frontend API URL', value: apiUrl(''), icon: Server },
    { label: 'Socket URL', value: SOCKET_URL, icon: Activity },
    { label: 'PWA', value: 'Enabled', icon: ShieldCheck },
    { label: 'Audit Logging', value: 'Enabled', icon: Database },
  ];

  const topActions = (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border ${
            activeTab === tab.id
              ? 'bg-white text-black border-white'
              : 'border-white/10 bg-black text-slate-300 hover:bg-white hover:text-black'
          }`}
        >
          <tab.icon size={14} strokeWidth={2.5} />
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {activeStats.length > 0 ? activeStats.map((stat, idx) => (
          <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl relative group hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-xl ${stat.critical ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white border border-white/10'}`}>
                <stat.icon size={24} strokeWidth={2.5} />
              </div>
              <span className={`text-sm font-bold tracking-wider ${stat.critical ? 'text-red-400' : 'text-slate-400'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-1">{stat.label}</h3>
            <div className="font-display text-4xl font-bold text-white">{stat.value}</div>
          </div>
        )) : <div className="col-span-4 p-6 rounded-2xl border border-white/10 bg-white/5 shadow-xl font-bold text-slate-300">LOADING TELEMETRY...</div>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Incidents</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.find((stat) => stat.label === 'OPEN INCIDENTS')?.value || '0'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Events</p>
          <p className="mt-2 text-3xl font-bold text-white">{auditLogs.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Sync</p>
          <p className="mt-2 text-sm font-bold text-white">Real-time via Socket.io</p>
        </div>
      </div>
    </>
  );

  const renderOperators = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-display text-2xl font-bold text-white">ACTIVE OPERATORS</h2>
        <div className="flex gap-2">
          <button type="button" className="text-xs font-bold px-4 py-2 rounded-full bg-white text-black uppercase tracking-wider">ALL</button>
          <button type="button" className="text-xs font-bold px-4 py-2 rounded-full border border-white/10 bg-black text-slate-300 uppercase tracking-wider hover:bg-white hover:text-black transition-colors">ADMIN</button>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/60 border-b border-white/10">
              <th className="p-4 text-xs font-bold tracking-wider text-slate-400 uppercase">ID</th>
              <th className="p-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Operator Name</th>
              <th className="p-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Email</th>
              <th className="p-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Clearance</th>
              <th className="p-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {operators.length > 0 ? operators.map((op, idx) => (
              <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-sm tracking-wider text-white">{op._id.slice(-6).toUpperCase()}</td>
                <td className="p-4 font-bold text-white">{op.firstName} {op.lastName}</td>
                <td className="p-4 text-sm text-slate-400 font-mono">{op.email}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold tracking-wider px-2 py-1 rounded-full border ${op.role === 'ADMIN' ? 'bg-red-500/10 text-red-300 border-red-400/30' : 'bg-white/10 text-white border-white/10'}`}>
                    {op.role}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${op.status === 'ONLINE' ? 'bg-red-400' : 'bg-slate-500'}`}></div>
                    <span className="text-xs font-bold tracking-wider text-white">{op.status}</span>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="p-4 text-center font-bold text-slate-400 uppercase tracking-wider">No operators found in database</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-white/10 text-center">
        <button type="button" onClick={() => setActiveTab('overview')} className="text-sm font-bold tracking-wider text-white hover:text-red-300 uppercase">VIEW OVERVIEW</button>
      </div>
    </div>
  );

  const renderInfrastructure = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h2 className="font-display text-2xl font-bold text-white mb-4">Infrastructure</h2>
        <div className="space-y-3">
          {[
            { label: 'Database ops', value: stats?.find((stat) => stat.label === 'SYSTEM LOAD')?.value || 'N/A' },
            { label: 'Online operators', value: stats?.find((stat) => stat.label === 'ONLINE NOW')?.value || '0' },
            { label: 'Security alerts', value: stats?.find((stat) => stat.label === 'SECURITY ALERTS')?.value || '0' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <span className="text-sm font-semibold text-slate-300">{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h2 className="font-display text-2xl font-bold text-white mb-4">Realtime Signals</h2>
        <div className="space-y-3">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log._id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white">{log.action}</span>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">{log.category}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{log.actorLabel} • {new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {auditLogs.length === 0 ? <p className="text-sm text-slate-400">No audit events yet.</p> : null}
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-white">Security Logs</h2>
        <button type="button" onClick={() => setActiveTab('infrastructure')} className="text-xs font-bold px-4 py-2 rounded-full border border-white/10 bg-black text-slate-300 uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
          View Infrastructure
        </button>
      </div>
      <div className="divide-y divide-white/10">
        {auditLogs.length > 0 ? auditLogs.map((log) => (
          <div key={log._id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between hover:bg-white/5 transition-colors">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">{log.action}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">{log.category}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{log.actorLabel} • {log.actorRole} • {new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <pre className="max-w-xl overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-slate-300">
{JSON.stringify(log.metadata || {}, null, 2)}
            </pre>
          </div>
        )) : (
          <div className="p-6 text-center text-sm font-semibold text-slate-400">No audit events recorded yet.</div>
        )}
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {configCards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-2 break-all text-sm font-bold text-white">{card.value}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-white">
              <card.icon size={22} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex font-body bg-slate-950 text-white">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-white/10 flex flex-col z-10 sticky top-0 h-screen bg-slate-950">
        <div className="p-8 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-white no-underline">
            <Terminal size={32} strokeWidth={2.5} />
            <span className="font-display font-bold text-2xl tracking-tight">RescueSync</span>
          </Link>
          <div className="mt-2 text-xs font-bold tracking-wider text-red-400 uppercase">
            Admin Terminal v1.0
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 p-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold transition-colors border ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border-white/10'
                  : 'text-slate-300 border-transparent hover:border-white/10 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={20} strokeWidth={2.5} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">ADMIN-01</span>
              <span className="text-xs text-slate-400 font-bold tracking-wider">ROOT ACCESS</span>
            </div>
            <LogOut size={20} className="text-slate-400 cursor-pointer hover:text-white transition-colors" onClick={handleLogout} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto relative bg-slate-950 text-white">
        {/* Top Ticker for Admin */}
        <div className="bg-white text-black">
          <div className="ticker">
            WARNING: YOU ARE IN ROOT ACCESS MODE • ALL ACTIONS ARE LOGGED AND AUDITABLE • WARNING: YOU ARE IN ROOT ACCESS MODE • ALL ACTIONS ARE LOGGED AND AUDITABLE •
          </div>
        </div>

        <div className="p-12 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <h1 className="font-display text-5xl font-bold mb-2 text-white">SYSTEM OVERVIEW</h1>
              <p className="text-slate-400 font-bold tracking-wider uppercase text-sm">Real-time telemetry and control</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="rounded-xl border border-white/10 bg-white px-6 py-3 flex items-center gap-2 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingReport ? 'GENERATING...' : 'GENERATE REPORT'} <FileDown size={20} />
            </button>
          </div>

          <div className="mb-8">{topActions}</div>

          {activeTab === 'overview' ? renderOverview() : null}
          {activeTab === 'operators' ? renderOperators() : null}
          {activeTab === 'infrastructure' ? renderInfrastructure() : null}
          {activeTab === 'security' ? renderSecurity() : null}
          {activeTab === 'config' ? renderConfig() : null}
        </div>
      </main>
    </div>
  );
}
