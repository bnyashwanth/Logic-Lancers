import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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

function LocationButton() {
  const map = useMap();
  const handleClick = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };
  return (
    <div className="map-controls">
      <button className="map-control-btn" onClick={() => map.zoomIn()} title="Zoom in">
        <span className="material-symbols-outlined">add</span>
      </button>
      <button className="map-control-btn" onClick={() => map.zoomOut()} title="Zoom out">
        <span className="material-symbols-outlined">remove</span>
      </button>
      <button className="map-control-btn" style={{ marginTop: '16px' }} onClick={handleClick} title="My location">
        <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  );
}

export default function MapView({ incidents = [], onIncidentClick, center = [19.076, 72.8777] }) {
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
              <strong>{inc.title}</strong><br />
              <span style={{ color: urgencyColors[inc.urgency] }}>{inc.urgency}</span>
            </Popup>
          </Marker>
        ))}
        <LocationButton />
      </MapContainer>
    </div>
  );
}
