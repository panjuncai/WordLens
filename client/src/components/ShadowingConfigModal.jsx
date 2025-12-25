import { Button, InputNumber, Modal, Space, Switch, Typography } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

export default function ShadowingConfigModal({
  open,
  onClose,
  shadowingEnabled,
  setShadowingEnabled,
  shadowingSequence,
  setShadowingSequence,
}) {
  const updateSequence = (next) => {
    setShadowingSequence(next.filter((v) => typeof v === 'number' && Number.isFinite(v)));
  };

  const handleChangeItem = (idx, val) => {
    const next = [...shadowingSequence];
    next[idx] = Number(val);
    updateSequence(next);
  };

  const handleAdd = () => {
    updateSequence([...shadowingSequence, 1.0]);
  };

  const handleRemove = (idx) => {
    const next = shadowingSequence.filter((_, i) => i !== idx);
    updateSequence(next);
  };

  return (
    <Modal
      open={open}
      title="影子跟读配置"
      onCancel={onClose}
      onOk={onClose}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Typography.Text>影子跟读</Typography.Text>
          <Switch checked={shadowingEnabled} onChange={setShadowingEnabled} />
        </div>
        <div>
          <Typography.Text type="secondary">速率序列</Typography.Text>
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
            {shadowingSequence.map((val, idx) => (
              <div key={`rate-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InputNumber
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={val}
                  onChange={(v) => handleChangeItem(idx, v)}
                  style={{ width: 120 }}
                />
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => handleRemove(idx)}
                  disabled={shadowingSequence.length <= 1}
                />
              </div>
            ))}
            <Button icon={<PlusOutlined />} onClick={handleAdd}>
              添加速率
            </Button>
          </Space>
        </div>
      </Space>
    </Modal>
  );
}
