import { useState } from 'react';
import MapView from '../components/map/MapView';
import IncidentOverlay from '../components/map/IncidentOverlay';
import CoordinationModal from '../components/detail/CoordinationModal';
import { useIncidents } from '../hooks/useIncidents';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import './MapPage.css';
import { useEffect } from 'react';

export default function MapPage() {
  const { incidents } = useIncidents();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [targetedIncident, setTargetedIncident] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.targetedIncident) {
      setTargetedIncident(location.state.targetedIncident);
      // Clean up state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return (
    <div className="map-page">
      <MapView 
        incidents={incidents} 
        onIncidentClick={setSelectedIncident} 
        targetedIncident={targetedIncident}
      />
      <IncidentOverlay 
        incidents={incidents} 
        onIncidentSelect={(inc) => {
          setTargetedIncident(inc);
          setSelectedIncident(inc);
        }} 
      />

      {/* FAB */}
      <button className="map-page__fab" onClick={() => navigate('/request')} title="Report Incident">
        <Icon name="add" size={24} />
      </button>

      {selectedIncident && (
        <CoordinationModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
          onNavigate={(inc) => {
            setTargetedIncident(inc);
            setSelectedIncident(null);
          }}
        />
      )}
    </div>
  );
}
