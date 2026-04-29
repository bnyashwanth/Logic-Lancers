import './CoordinationModal.css';
import Icon from '../ui/Icon';
import VolunteerProgress from './VolunteerProgress';
import DetailRow from './DetailRow';
import { volunteerForIncident } from '../../services/api';
import { useState } from 'react';

export default function CoordinationModal({ incident, onClose, onNavigate }) {
  const [loading, setLoading] = useState(false);
  if (!incident) return null;

  const isFull = incident.volunteers?.length >= incident.requiredVolunteers;

  const handleVolunteer = async () => {
    setLoading(true);
    try {
      await volunteerForIncident(incident._id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to volunteer');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="coordination-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="coordination-modal__header">
          <div>
            <span className="coordination-modal__badge">
              <Icon name="priority_high" filled size={16} />
              {incident.urgency}
            </span>
            <h1 className="coordination-modal__title">{incident.title}</h1>
          </div>
          <button className="coordination-modal__close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {/* Warning Banner */}
        {isFull && (
          <div className="coordination-modal__warning">
            <Icon name="warning" filled size={20} />
            <p>Warning: {incident.requiredVolunteers} volunteers are already heading to this location. Your help might be needed elsewhere.</p>
          </div>
        )}

        {/* Progress */}
        <VolunteerProgress current={incident.volunteers?.length || 0} max={incident.requiredVolunteers || 10} />

        {/* Details */}
        <div className="coordination-modal__details">
          {incident.image && (
            <div style={{ marginBottom: '16px' }}>
              <img src={incident.image} alt="Incident Situation" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-outline)' }} />
            </div>
          )}
          {incident.specificItems?.length > 0 && (
            <DetailRow icon="medical_services" label="Specific items" value={incident.specificItems.join(', ')} />
          )}
          <div onClick={() => onNavigate?.(incident)} style={{ cursor: 'pointer' }}>
            <DetailRow icon="location_on" label="Location" value={incident.location?.address || `${incident.location?.lat}, ${incident.location?.lng}`} />
          </div>
          {incident.description && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--color-surface-variant)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: '1.5' }}>
              {incident.description}
            </div>
          )}
          {incident.contactPerson?.name && (
            <DetailRow icon="person" label="Contact person" value={incident.contactPerson.name} subtitle={incident.contactPerson.role} />
          )}
        </div>

        {/* Footer */}
        <div className="coordination-modal__footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Find another nearby</button>
          <button
            className={`btn ${isFull ? 'btn-disabled' : 'btn-primary'}`}
            style={{ width: '100%' }}
            disabled={isFull || loading}
            onClick={handleVolunteer}
          >
            {isFull ? "I'm on my way (Capacity Reached)" : loading ? 'Joining...' : "I'm on my way"}
          </button>
        </div>
      </div>
    </div>
  );
}
