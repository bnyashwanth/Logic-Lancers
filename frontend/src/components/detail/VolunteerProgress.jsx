import './VolunteerProgress.css';

export default function VolunteerProgress({ current, max }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="volunteer-progress">
      <div className="volunteer-progress__header">
        <span className="text-label-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>
          Volunteers En Route
        </span>
        <span className="text-status-number" style={{ color: 'var(--color-primary)' }}>
          {current}/{max}
        </span>
      </div>
      <div className="volunteer-progress__bar">
        <div className="volunteer-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
