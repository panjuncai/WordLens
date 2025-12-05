import api from '../api';

export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const register = (email, password) => api.post('/api/auth/register', { email, password });
export const me = () => api.get('/api/auth/me');
