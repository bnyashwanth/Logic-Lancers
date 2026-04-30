import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getNearbyVolunteers } from '../../services/api';
import { useIncidents } from '../../hooks/useIncidents';
import Icon from '../ui/Icon';

const volunteerIcon = new L.DivIcon({
  className: 'custom-volunteer-icon',
  html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="color: white; font-size: 16px;">security</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function AdminMap() {
  const { incidents } = useIncidents();
  const [volunteers, setVolunteers] = useState([]);
  
  // Base center for map if no incidents exist
  const defaultCenter = [12.9716, 77.5946]; 
  const center = incidents.length > 0 ? [incidents[0].location.lat, incidents[0].location.lng] : defaultCenter;

  useEffect(() => {
    fetchVolunteers();
  }, [incidents]);

  const fetchVolunteers = async () => {
    try {
      const res = await getNearbyVolunteers();
      let fetchedVols = res.data.volunteers || [];
      
      // Demo Mode: Scatter volunteers who have 0,0 location around the incidents
      if (incidents.length > 0) {
        fetchedVols = fetchedVols.map(v => {
          if (v.location?.lat === 0 || !v.location) {
            const baseLoc = incidents[Math.floor(Math.random() * incidents.length)].location;
            return {
              ...v,
              location: {
                lat: baseLoc.lat + (Math.random() - 0.5) * 0.04,
                lng: baseLoc.lng + (Math.random() - 0.5) * 0.04,
              }
            };
          }
          return v;
        });
      }
      setVolunteers(fetchedVols);
    } catch (err) {
      console.error('Failed to fetch volunteers', err);
    }
  };

  const getZoneOptions = (urgency) => {
    switch(urgency) {
      case 'CRITICAL': return { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, radius: 800 };
      case 'HIGH': return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.2, radius: 500 };
      default: return { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, radius: 300 };
    }
  };

  return (
    <div style={{ height: '600px', width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-outline)' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Render Incident Zones */}
        {incidents.filter(i => i.status !== 'RESOLVED' && i.location).map(inc => {
          const opts = getZoneOptions(inc.urgency);
          return (
            <Circle 
              key={`zone-${inc._id}`}
              center={[inc.location.lat, inc.location.lng]} 
              radius={opts.radius}
              pathOptions={{ color: opts.color, fillColor: opts.fillColor, fillOpacity: opts.fillOpacity }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="warning" size={16} filled style={{ color: opts.color }} />
                    {inc.urgency} ZONE
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{inc.title}</div>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Render Volunteers */}
        {volunteers.map(vol => (
          <Marker 
            key={`vol-${vol._id}`} 
            position={[vol.location.lat, vol.location.lng]}
            icon={volunteerIcon}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="security" size={16} filled style={{ color: '#3b82f6' }} />
                  Responder Unit
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>{vol.name}</div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                  Status: {vol.isAvailable ? 'Available' : 'En Route'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend Overlay */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'var(--color-surface)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid var(--color-outline)' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tactical Legend</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', opacity: 0.5 }}></span> Critical Zone</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', opacity: 0.5 }}></span> High Risk Zone</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', opacity: 0.5 }}></span> Medium Risk / Safe</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div style={{ backgroundColor: '#3b82f6', width: '14px', height: '14px', borderRadius: '50%', border: '1px solid white' }}></div> Volunteer Unit
          </div>
        </div>
      </div>
    </div>
  );
}
