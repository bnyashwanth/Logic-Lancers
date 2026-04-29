import './IncidentOverlay.css';
import Icon from '../ui/Icon';

export default function IncidentOverlay({ incidents = [] }) {
  const criticalCount = incidents.filter(i => i.urgency === 'CRITICAL').length;

  return (
    <div className="incident-overlay animate-fade-in">
      <div className="incident-overlay__header">
        <span className="text-label-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-container)' }}>
          Active Incidents
        </span>
        {criticalCount > 0 && (
          <span className="incident-overlay__critical-badge">
            {criticalCount} CRITICAL
          </span>
        )}
      </div>
      <div className="incident-overlay__divider" />
      {incidents.slice(0, 3).map((inc, i) => (
        <div key={inc._id || i} className="incident-overlay__item">
          <span className="incident-overlay__dot" style={{ backgroundColor: inc.urgency === 'CRITICAL' ? 'var(--color-error)' : 'var(--color-secondary)' }} />
          {inc.title}
        </div>
      ))}
    </div>
  );
}
