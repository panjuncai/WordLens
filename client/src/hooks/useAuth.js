import { useEffect, useState } from 'react';
import { message } from 'antd';
import { setAuthToken } from '../api';
import { login as loginApi, register as registerApi, me as meApi } from '../services/authService';

export default function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken('');
    }
  }, [token]);

  useEffect(() => {
    const existing = localStorage.getItem('token');
    if (!existing) {
      setInitDone(true);
      return;
    }
    setAuthToken(existing);
    meApi()
      .then((res) => {
        setUser(res.data.user);
        setToken(existing);
      })
      .catch(() => {
        setAuthToken('');
        setToken('');
        setUser(null);
      })
      .finally(() => setInitDone(true));
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await loginApi(email, password);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      message.success('登录成功');
    } catch (error) {
      const detail = error.response?.data?.error || error.message;
      message.error(detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await registerApi(email, password);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      message.success('注册成功');
    } catch (error) {
      const detail = error.response?.data?.error || error.message;
      message.error(detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken('');
    setToken('');
    setUser(null);
  };

  return {
    token,
    user,
    loading,
    mode,
    setMode,
    initDone,
    login: handleLogin,
    register: handleRegister,
    logout,
    setUser,
  };
}
