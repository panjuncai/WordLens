import { Button, Card, Input, Space, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const messages = useMemo(() => [
    '想场景化背单词吗？',
    '想体验AI加速背单词快感吗？',
    '还不快来试试！',
    '请把想背单词场景化并粘贴到下面',
    '进入文章后可以用Tab、上下左右键快速点读',
  ], []);
  const [typed, setTyped] = useState('');
  const introStateRef = useRef({ line: 0, char: 0 });

  useEffect(() => {
    let timer = null;
    const typeNext = () => {
      const { line, char } = introStateRef.current;
      const current = messages[line];
      if (!current) return;
      if (char < current.length) {
        setTyped(current.slice(0, char + 1));
        introStateRef.current = { line, char: char + 1 };
        timer = setTimeout(typeNext, 70);
      } else if (line < messages.length - 1) {
        timer = setTimeout(() => {
          introStateRef.current = { line: line + 1, char: 0 };
          setTyped('');
          typeNext();
        }, 900);
      } else {
        setTyped(current);
        introStateRef.current = { line, char: current.length };
      }
    };
    typeNext();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [messages]);

  return (
    <div className="auth-wrap">
      <Card className="auth-card">
        <div className="auth-typing typing-text">{typed || '\u00a0'}</div>
        <div className="auth-header">
          <Text strong>{mode === 'login' ? '登录' : '注册'}</Text>
          <Button type="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
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
