import { useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import LoginScreen from './components/LoginScreen';
import DashboardPage from './pages/DashboardPage';
import useAuthStore from './stores/useAuthStore';
import useConfigStore from './stores/useConfigStore';
import './App.css';

function App() {
  const {
    user,
    mode: authMode,
    setMode: setAuthMode,
    loading: authLoading,
    login,
    register,
    checkAuth,
    initDone,
  } = useAuthStore();
  const { themeMode } = useConfigStore();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const handleAuthSubmit = async () => {
    if (authMode === 'login') await login(authEmail, authPassword);
    else await register(authEmail, authPassword);
  };

  if (!initDone) return null;

  if (!user) {
    return (
      <LoginScreen
        mode={authMode}
        setMode={setAuthMode}
        email={authEmail}
        password={authPassword}
        onChangeEmail={setAuthEmail}
        onChangePassword={setAuthPassword}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
      />
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#2563eb' },
      }}
    >
      <DashboardPage />
    </ConfigProvider>
  );
}

export default App;
