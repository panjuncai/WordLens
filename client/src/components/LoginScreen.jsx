import { Button, Card, Input, Space, Typography } from 'antd';

const { Text } = Typography;

export default function LoginScreen({
  mode,
  setMode,
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  loading,
}) {
  return (
    <div className="auth-wrap">
      <Card className="auth-card">
        <div className="auth-header">
          <Text strong>{mode === 'login' ? '登录' : '注册'}</Text>
          <Button type="link" onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}>
            {mode === 'login' ? '去注册' : '去登录'}
          </Button>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="邮箱" value={email} onChange={(e) => onChangeEmail(e.target.value)} />
          <Input.Password placeholder="密码" value={password} onChange={(e) => onChangePassword(e.target.value)} />
          <Button type="primary" block loading={loading} onClick={onSubmit}>
            {mode === 'login' ? '登录' : '注册'}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
