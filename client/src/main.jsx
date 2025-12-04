import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorBgContainer: '#ffffff',
          colorText: '#0f172a',
          colorTextSecondary: '#475569',
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
