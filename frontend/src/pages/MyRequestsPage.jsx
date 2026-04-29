import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import FeedList from '../components/feed/FeedList';
import CoordinationModal from '../components/detail/CoordinationModal';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import './MyRequestsPage.css';

export default function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const navigate = useNavigate();

  // Only fetch if user is loaded and we have an ID
  const { incidents, loading: incidentsLoading } = useIncidents(
    user?._id ? { requesterId: user._id } : { skip: true }
  );

  const loading = authLoading || (incidentsLoading && user?._id);

  return (
    <div className="my-requests-page">
      <header className="my-requests-page__header">
        <h1>My Requests</h1>
        <p className="my-requests-page__subtitle">Manage the incidents you've reported</p>
      </header>

      {loading ? (
        <div className="my-requests-page__loading">
          <div className="animate-pulse" style={{ color: 'var(--color-on-surface-variant)' }}>Loading your requests...</div>
        </div>
      ) : !user?._id ? (
        <div className="my-requests-page__error">Please login to view your requests.</div>
      ) : (
        <FeedList incidents={incidents} onCardClick={setSelectedIncident} />
      )}

      <button className="my-requests-page__fab" onClick={() => navigate('/request')} title="New Request">
        <Icon name="add" size={24} />
      </button>

      {selectedIncident && (
        <CoordinationModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
          onNavigate={(inc) => {
            navigate('/map', { state: { targetedIncident: inc } });
          }}
        />
      )}
    </div>
  );
}
