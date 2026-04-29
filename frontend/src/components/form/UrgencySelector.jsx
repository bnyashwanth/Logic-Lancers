import './UrgencySelector.css';

const levels = [
  { value: 'LOW', label: 'Low', variant: 'default' },
  { value: 'MEDIUM', label: 'Medium', variant: 'default' },
  { value: 'HIGH', label: 'High', variant: 'danger' },
  { value: 'CRITICAL', label: 'CRITICAL', variant: 'critical' },
];

export default function UrgencySelector({ value, onChange }) {
  return (
    <div className="urgency-selector">
      <label className="text-label-bold" style={{ color: 'var(--color-on-surface)', marginBottom: '4px' }}>Urgency Level</label>
      <div className="urgency-grid">
        {levels.map(l => (
          <label key={l.value} className={`urgency-option urgency-option--${l.variant} ${value === l.value ? 'urgency-option--selected' : ''}`}>
            <input type="radio" name="urgency" value={l.value} checked={value === l.value} onChange={() => onChange(l.value)} className="sr-only" />
            {l.label}
          </label>
        ))}
      </div>
    </div>
  );
}
