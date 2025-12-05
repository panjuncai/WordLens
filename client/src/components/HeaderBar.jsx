import { Button, Dropdown, Switch } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export default function HeaderBar({ onOpenConfig, onLogout, themeMode, onToggleTheme }) {
  const items = [
    { key: 'config', label: 'TTS 配置' },
    {
      key: 'theme',
      label: (
        <div className="menu-switch">
          <span>暗色模式</span>
          <Switch
            size="small"
            checked={themeMode === 'dark'}
            onClick={(e) => e.stopPropagation()}
            onChange={(checked) => onToggleTheme(checked ? 'dark' : 'light')}
          />
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'logout', label: '退出登录' },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'config') {
      onOpenConfig();
    } else if (key === 'logout') {
      onLogout();
    }
  };

  return (
    <div className="topbar">
      <div className="brand">场景记单词</div>
      <Dropdown menu={{ items, onClick: handleMenuClick }} placement="bottomRight">
        <Button type="text" icon={<UserOutlined />} />
      </Dropdown>
    </div>
  );
}
