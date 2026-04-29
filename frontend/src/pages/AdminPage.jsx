import { useState, useEffect } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { getAdminStats, verifyIncident, banUser, broadcastAlert } from '../services/api';
import Icon from '../components/ui/Icon';
import './AdminPage.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('command');
  const { incidents, loading: incidentsLoading, refetch } = useIncidents();
  const [stats, setStats] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res.data.stats);
    } catch (err) { console.error(err); }
  };

  const handleVerify = async (id) => {
    try {
      await verifyIncident(id);
      refetch();
    } catch (err) { alert('Failed to verify'); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    setIsBroadcasting(true);
    try {
      await broadcastAlert(broadcastMsg);
      setBroadcastMsg('');
      alert('Alert broadcasted successfully');
    } catch (err) { alert('Broadcast failed'); }
    finally { setIsBroadcasting(false); }
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header">
        <h1 className="text-display-sm">Command Center</h1>
        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'command' ? 'active' : ''}`} onClick={() => setActiveTab('command')}>Incident Command</button>
          <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
          <button className={`admin-tab ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>Broadcast</button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'command' && (
          <div className="admin-grid">
            <div className="admin-card">
              <h3 className="text-label-bold">Live Triage Queue</h3>
              <div className="admin-list">
                {incidentsLoading ? <p>Loading...</p> : incidents.filter(i => i.status !== 'RESOLVED').map(inc => (
                  <div key={inc._id} className="admin-list-item">
                    <div className="admin-item-info">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`urgency-tag ${inc.urgency.toLowerCase()}`}>{inc.urgency}</span>
                        {inc.isVerified && <span className="verified-badge" title="Verified Incident"><Icon name="verified" size={14} /> VERIFIED</span>}
                      </div>
                      <p className="text-body-md-bold">{inc.title}</p>
                      <p className="text-body-sm">{inc.location?.address || 'Unknown location'}</p>
                    </div>
                    <div className="admin-item-actions">
                      {!inc.isVerified && (
                        <button className="btn-icon-text" onClick={() => handleVerify(inc._id)}>
                          <Icon name="verified" size={18} /> Verify
                        </button>
                      )}
                      <button className="btn-icon-text text-error">
                        <Icon name="block" size={18} /> Ban User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="admin-card stats-sidebar">
              <h3 className="text-label-bold">Global Health</h3>
              {stats && (
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{stats.activeIncidents}</span>
                    <span className="stat-label">Active Incidents</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.activeVolunteers}</span>
                    <span className="stat-label">Active Volunteers</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-card">
            <h3 className="text-label-bold">User Management</h3>
            <p className="text-body-sm" style={{ opacity: 0.7 }}>User list integration pending more backend data.</p>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="admin-card">
            <h3 className="text-label-bold">Emergency Broadcast</h3>
            <p className="text-body-sm" style={{ marginBottom: '16px' }}>Send a global alert to all connected users.</p>
            <form onSubmit={handleBroadcast} className="broadcast-form">
              <textarea 
                className="admin-input" 
                placeholder="Enter alert message (e.g. Flash flood warning in Zone 4)"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
              />
              <button className="btn btn-primary" style={{ width: '200px' }} disabled={isBroadcasting}>
                {isBroadcasting ? 'Sending...' : 'Broadcast Alert'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
