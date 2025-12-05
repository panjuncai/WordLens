import { create } from 'zustand';
import { message } from 'antd';
import { setAuthToken } from '../api';
import { login as loginApi, register as registerApi, me as meApi } from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || '',
  loading: false,
  mode: 'login',
  initDone: false,
  setMode: (mode) => set({ mode }),
  checkAuth: async () => {
    const existing = localStorage.getItem('token');
    if (!existing) {
      set({ initDone: true });
      return;
    }
    setAuthToken(existing);
    try {
      const { data } = await meApi();
      set({ user: data.user, token: existing, initDone: true });
    } catch (error) {
      setAuthToken('');
      set({ user: null, token: '', initDone: true });
    }
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await loginApi(email, password);
      setAuthToken(data.token);
      set({ user: data.user, token: data.token });
      message.success('登录成功');
    } catch (error) {
      message.error(error.response?.data?.error || '登录失败');
    } finally {
      set({ loading: false });
    }
  },
  register: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await registerApi(email, password);
      setAuthToken(data.token);
      set({ user: data.user, token: data.token });
      message.success('注册成功');
    } catch (error) {
      message.error(error.response?.data?.error || '注册失败');
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    setAuthToken('');
    set({ user: null, token: '' });
  },
}));

export default useAuthStore;
