import { useState } from 'react';
import './RequestForm.css';
import UrgencySelector from './UrgencySelector';
import LocationPicker from './LocationPicker';
import Icon from '../ui/Icon';
import { createIncident } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const categories = [
  { value: '', label: 'Select category...' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'FOOD', label: 'Food & Water' },
  { value: 'RESCUE', label: 'Rescue Operations' },
  { value: 'SUPPLIES', label: 'Other Supplies' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'POWER', label: 'Power' },
  { value: 'PERSONNEL', label: 'Personnel' },
];

export default function RequestForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: '', title: '', description: '', urgency: 'MEDIUM', location: null, image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.title) { alert('Fill required fields'); return; }
    if (!form.location) { alert('Location is required'); return; }
    
    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      urgency: form.urgency,
      location: form.location,
      image: form.image,
      tags: [categories.find(c => c.value === form.type)?.label || form.type],
    };

    if (!navigator.onLine) {
      import('../../services/offlineQueue').then(({ saveToOfflineQueue }) => {
        saveToOfflineQueue(payload);
        alert('⚠️ You are offline. Your request has been securely saved and will sync automatically once connectivity is restored.');
        navigate('/feed');
      });
      return;
    }

    setLoading(true);
    try {
      await createIncident(payload);
      navigate('/feed');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create request');
    } finally { setLoading(false); }
  };

  return (
    <div className="request-form-page">
      <div className="request-form-page__header">
        <h1 className="text-headline-lg">Request Resources</h1>
        <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
          Submit an immediate request to dispatch coordination.
        </p>
      </div>
      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="text-label-bold" htmlFor="request_type">Request Type</label>
          <div className="select-wrapper">
            <select className="select" id="request_type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {categories.map(c => (
                <option key={c.value} value={c.value} disabled={c.value === ''}>{c.label}</option>
              ))}
            </select>
            <Icon name="expand_more" size={20} className="select-icon" />
          </div>
        </div>
        <div className="form-field">
          <label className="text-label-bold" htmlFor="title">Title</label>
          <input className="input" id="title" placeholder="Brief title for the request..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="text-label-bold" htmlFor="description">Description & Quantity</label>
          <textarea className="textarea" id="description" rows={4} placeholder="Detail specific needs, quantities, and current situational status..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="text-label-bold">Live Picture</label>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ marginBottom: '8px' }} />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-outline)' }} />
          )}
        </div>
        <UrgencySelector value={form.urgency} onChange={u => setForm({ ...form, urgency: u })} />
        <LocationPicker onLocationSelect={loc => setForm({ ...form, location: loc })} />
        <div style={{ marginTop: '12px', paddingBottom: '12px' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <Icon name="send" size={20} />
            {loading ? 'Posting...' : 'Post Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
