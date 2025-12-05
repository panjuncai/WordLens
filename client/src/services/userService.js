import api from '../api';

export const getConfig = () => api.get('/api/user/config');
export const saveConfig = (payload) => api.put('/api/user/config', payload);
