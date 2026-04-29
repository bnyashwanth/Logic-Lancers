import './FilterChips.css';
import Icon from '../ui/Icon';

const filters = [
  { id: 'critical', icon: 'emergency', label: 'Critical First' },
  { id: 'distance', icon: 'near_me', label: 'Distance: < 5km' },
  { id: 'filters', icon: 'filter_list', label: 'Filters' },
];

export default function FilterChips({ activeFilter, onFilterChange }) {
  return (
    <div className="filter-chips hide-scrollbar">
      {filters.map(f => (
        <button
          key={f.id}
          className={`filter-chip ${activeFilter === f.id ? 'filter-chip--active' : ''}`}
          onClick={() => onFilterChange(activeFilter === f.id ? null : f.id)}
        >
          <Icon name={f.icon} size={18} />
          {f.label}
        </button>
      ))}
    </div>
  );
}
