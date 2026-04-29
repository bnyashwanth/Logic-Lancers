import './TriageCard.css';
import Icon from '../ui/Icon';

const urgencyConfig = {
  CRITICAL: { label: 'CRITICAL', colorClass: 'triage-card--critical', borderColor: 'var(--color-error)' },
  HIGH: { label: 'URGENT', colorClass: 'triage-card--urgent', borderColor: 'var(--color-tertiary)' },
  MEDIUM: { label: 'URGENT', colorClass: 'triage-card--urgent', borderColor: 'var(--color-tertiary)' },
  LOW: { label: 'STABLE', colorClass: 'triage-card--stable', borderColor: 'var(--color-secondary)' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TriageCard({ incident, onClick }) {
  const config = urgencyConfig[incident.urgency] || urgencyConfig.LOW;

  return (
    <div
      className={`triage-card ${config.colorClass}`}
      style={{ borderLeftColor: config.borderColor }}
      onClick={() => onClick?.(incident)}
      role="button"
      tabIndex={0}
    >
      <div className="triage-card__header">
        <span className="triage-card__urgency">{config.label}</span>
        <div className="triage-card__meta">
          <span className="triage-card__distance">
            <Icon name="location_on" size={16} />
            {incident.distance || '—'}
          </span>
          <span>•</span>
          <span>{timeAgo(incident.createdAt)}</span>
        </div>
      </div>

      <h3 className="triage-card__title">{incident.title}</h3>

      <div className="triage-card__tags">
        {incident.tags?.map((tag, i) => (
          <span key={i} className="triage-card__tag">{tag}</span>
        ))}
        {incident.type && (
          <span className="triage-card__tag">{incident.type}</span>
        )}
      </div>
    </div>
  );
}
