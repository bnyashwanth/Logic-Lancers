import { useState } from 'react';
import './LocationPicker.css';
import Icon from '../ui/Icon';

export default function LocationPicker({ onLocationSelect }) {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(loc);
        onLocationSelect?.(loc);
        setLoading(false);
      },
      () => { alert('Unable to get location'); setLoading(false); }
    );
  };

  return (
    <div className="location-picker">
      <label className="text-label-bold" style={{ color: 'var(--color-on-surface)' }}>Dispatch Location</label>
      <button type="button" className="location-picker__btn" onClick={handleUseCurrentLocation} disabled={loading}>
        <Icon name="my_location" size={20} />
        {loading ? 'Locating...' : 'Use Current Location'}
      </button>
      {coords && (
        <div className="text-label-md" style={{ color: 'var(--color-secondary)', marginTop: '4px' }}>
          📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </div>
      )}
      <div className="text-label-md" style={{ color: 'var(--color-outline)', marginTop: '4px', paddingLeft: '4px' }}>
        Or enter coordinates manually below.
      </div>
    </div>
  );
}
