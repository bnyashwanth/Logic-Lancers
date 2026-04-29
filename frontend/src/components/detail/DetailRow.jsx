import './DetailRow.css';
import Icon from '../ui/Icon';

export default function DetailRow({ icon, label, value, subtitle }) {
  return (
    <div className="detail-row">
      <div className="detail-row__left">
        <Icon name={icon} size={24} className="detail-row__icon" />
        <span className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
      </div>
      <div className="detail-row__right">
        <span className="text-label-bold" style={{ color: 'var(--color-primary)' }}>{value}</span>
        {subtitle && <span className="text-label-md" style={{ color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>{subtitle}</span>}
      </div>
    </div>
  );
}
