import L from 'leaflet'

export const MARKER_COLORS = {
  BLOOD: '#dc2626', // red
  MEDICINE: '#2563eb', // blue
  RESCUE: '#f97316', // orange
  SUPPLIES: '#16a34a', // green
}

export function getMarkerColor(type) {
  return MARKER_COLORS[type] || '#e11d48'
}

export function createIncidentIcon(type) {
  const color = getMarkerColor(type)
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: ${color};
        box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.85);
      "></div>
    `,
  })
}

