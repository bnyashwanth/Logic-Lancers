import { useState, useEffect, useCallback } from 'react';
import { getIncidents } from '../services/api';
import { connectSocket } from '../services/socket';

export function useIncidents(filters = {}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncidents = useCallback(async () => {
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
    fetchIncidents();
  }, [fetchIncidents]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = connectSocket();
    socket.on('incident:new', (incident) => {
      setIncidents(prev => [incident, ...prev]);
    });
    socket.on('incident:updated', (updated) => {
      setIncidents(prev => prev.map(i => i._id === updated._id ? updated : i));
    });
    return () => {
      socket.off('incident:new');
      socket.off('incident:updated');
    };
  }, []);

  return { incidents, loading, error, refetch: fetchIncidents };
}
