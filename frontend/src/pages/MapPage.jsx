import { useState } from 'react';
import MapView from '../components/map/MapView';
import IncidentOverlay from '../components/map/IncidentOverlay';
import CoordinationModal from '../components/detail/CoordinationModal';
import { useIncidents } from '../hooks/useIncidents';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import './MapPage.css';

export default function MapPage() {
  const { incidents } = useIncidents();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="map-page">
      <MapView incidents={incidents} onIncidentClick={setSelectedIncident} />
      <IncidentOverlay incidents={incidents} />

      {/* FAB */}
      <button className="map-page__fab" onClick={() => navigate('/request')} title="Report Incident">
        <Icon name="add" size={24} />
      </button>

      {selectedIncident && (
        <CoordinationModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
}
