import { useState, useEffect, useCallback } from 'react';
import { getIncidents } from '../services/api';
import { connectSocket } from '../services/socket';

export function useIncidents(filters = {}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncidents = useCallback(async () => {
    if (filters.skip) return;
    try {
      setLoading(true);
      const res = await getIncidents(filters);
      setIncidents(res.data.incidents);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (!filters.skip) {
      fetchIncidents();
    }
  }, [fetchIncidents, filters.skip]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = connectSocket();
    socket.on('incident:new', (incident) => {
      // Filter logic for real-time updates
      let matches = true;
      
      // Robust ID comparison
      const incidentRequesterId = incident.requesterId?._id || incident.requesterId;
      const filterRequesterId = filters.requesterId;

      if (filterRequesterId && String(incidentRequesterId) !== String(filterRequesterId)) {
        matches = false;
      }
      
      if (filters.urgency && incident.urgency !== filters.urgency) matches = false;
      if (filters.type && incident.type !== filters.type) matches = false;
      if (filters.status && incident.status !== filters.status) matches = false;

      if (matches) {
        setIncidents(prev => [incident, ...prev]);
      }
    });
    socket.on('incident:updated', (updated) => {
      setIncidents(prev => prev.map(i => i._id === updated._id ? updated : i));
    });
    return () => {
      socket.off('incident:new');
      socket.off('incident:updated');
    };
  }, [JSON.stringify(filters)]);

  return { incidents, loading, error, refetch: fetchIncidents };
}
