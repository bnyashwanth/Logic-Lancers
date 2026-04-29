import TriageCard from './TriageCard';
import './FeedList.css';

export default function FeedList({ incidents, onCardClick }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="feed-list__empty">
        <p>No active incidents in your area.</p>
      </div>
    );
  }

  return (
    <div className="feed-list">
      {incidents.map((incident, index) => (
        <TriageCard
          key={incident._id || index}
          incident={incident}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
