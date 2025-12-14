import api from '../api';

export const getConfig = () => api.get('/api/user/config');
export const saveConfig = (payload) => api.put('/api/user/config', payload);

export const getStudyStats = (tzOffsetMinutes) => api.get('/api/user/stats', {
  params: { tz_offset_minutes: tzOffsetMinutes },
});

export const addStudyTime = (deltaMs, tzOffsetMinutes) => api.post('/api/user/stats/time', {
  delta_ms: deltaMs,
  tz_offset_minutes: tzOffsetMinutes,
});
