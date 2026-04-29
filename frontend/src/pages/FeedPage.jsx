import { useState } from 'react';
import FilterChips from '../components/feed/FilterChips';
import FeedList from '../components/feed/FeedList';
import CoordinationModal from '../components/detail/CoordinationModal';
import { useIncidents } from '../hooks/useIncidents';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import './FeedPage.css';

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState('critical');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const navigate = useNavigate();

  const filters = {};
  if (activeFilter === 'critical') filters.urgency = 'CRITICAL';
  const { incidents, loading } = useIncidents(activeFilter === 'critical' ? {} : {});

  // Sort: CRITICAL first when filter active
  const sorted = activeFilter === 'critical'
    ? [...incidents].sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4);
      })
    : incidents;

  return (
    <div className="feed-page">
      <FilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      {loading ? (
        <div className="feed-page__loading">
          <div className="animate-pulse" style={{ color: 'var(--color-on-surface-variant)' }}>Loading incidents...</div>
        </div>
      ) : (
        <FeedList incidents={sorted} onCardClick={setSelectedIncident} />
      )}

      {/* FAB to create new request */}
      <button className="feed-page__fab" onClick={() => navigate('/request')} title="New Request">
        <Icon name="add" size={24} />
      </button>

      {selectedIncident && (
        <CoordinationModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
}
