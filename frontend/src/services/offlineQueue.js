const QUEUE_KEY = 'smart_relief_offline_incidents';

export const saveToOfflineQueue = (incidentData) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      id: `offline-${Date.now()}`,
      data: incidentData,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save to offline queue', err);
  }
};

export const getOfflineQueue = () => {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const removeOfflineIncident = (id) => {
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove from offline queue', err);
  }
};
