import api from '../api';

export const listArticles = () => api.get('/api/articles');
export const getArticle = (id) => api.get(`/api/articles/${id}`);
export const createArticle = (title, content) => api.post('/api/articles', { title, content });
export const updateArticle = (id, title, content) => api.put(`/api/articles/${id}`, { title, content });
export const deleteArticle = (id) => api.delete(`/api/articles/${id}`);
