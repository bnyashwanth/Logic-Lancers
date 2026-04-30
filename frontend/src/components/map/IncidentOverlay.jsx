import './IncidentOverlay.css';
import Icon from '../ui/Icon';

export default function IncidentOverlay(props) {
  const { incidents = [], onIncidentSelect } = props;
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
        <div 
          key={inc._id || i} 
          className="incident-overlay__item"
          onClick={() => onIncidentSelect?.(inc)}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="incident-overlay__dot" style={{ backgroundColor: inc.urgency === 'CRITICAL' ? 'var(--color-error)' : 'var(--color-secondary)' }} />
            <span style={{ fontWeight: '500' }}>{inc.title}</span>
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginLeft: '16px' }}>
            Volunteers en route: {inc.volunteers?.length || 0}/10
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginLeft: '16px', textDecoration: 'underline' }}>
            Tap to view details & route
          </div>
        </div>
      ))}
    </div>
  );
}
