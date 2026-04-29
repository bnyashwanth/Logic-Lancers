import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Custom marker icons by urgency
const createIcon = (color) => new L.DivIcon({
  className: 'map-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const urgencyColors = {
  CRITICAL: '#ba1a1a',
  HIGH: '#1d1202',
  MEDIUM: '#1d1202',
  LOW: '#0051d5',
};

function Routing({ start, end }) {
  const map = useMap();
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!start || !end) return;

    // Fetch route from OSRM (Free public API)
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(coordinates);
          
          // Fit map to route
          const bounds = L.latLngBounds(coordinates);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (err) {
        console.error('Routing failed:', err);
      }
    };

    fetchRoute();
  }, [start, end, map]);

  if (!route) return null;
  return <Polyline positions={route} color="var(--color-secondary)" weight={5} opacity={0.7} dashArray="10, 10" />;
}

function MapControls({ onLocate }) {
  const map = useMap();
  return (
    <div className="map-controls">
      <button className="map-control-btn" onClick={() => map.zoomIn()} title="Zoom in">
        <span className="material-symbols-outlined">add</span>
      </button>
      <button className="map-control-btn" onClick={() => map.zoomOut()} title="Zoom out">
        <span className="material-symbols-outlined">remove</span>
      </button>
      <button className="map-control-btn" style={{ marginTop: '16px' }} onClick={onLocate} title="My location">
        <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  );
}

export default function MapView({ incidents = [], onIncidentClick, targetedIncident, center = [12.8995, 77.4964] }) {
  const [userLocation, setUserLocation] = useState(null);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(loc);
    });
  };

  // Auto-locate on mount
  useEffect(() => {
    handleLocate();
  }, []);

  return (
    <div className="map-view">
      <MapContainer center={center} zoom={13} className="map-container" zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {incidents.map((inc, i) => (
          <Marker
            key={inc._id || i}
            position={[inc.location?.lat || 0, inc.location?.lng || 0]}
            icon={createIcon(urgencyColors[inc.urgency] || '#0051d5')}
            eventHandlers={{ click: () => onIncidentClick?.(inc) }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong className="text-label-bold">{inc.title}</strong><br />
                <span className="text-label-md" style={{ color: urgencyColors[inc.urgency] }}>{inc.urgency}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={createIcon('#16a34a')}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {targetedIncident && userLocation && (
          <Routing 
            start={userLocation} 
            end={[targetedIncident.location.lat, targetedIncident.location.lng]} 
          />
        )}

        <MapControls onLocate={handleLocate} />
      </MapContainer>
    </div>
  );
}
