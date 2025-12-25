import { Button, Input, InputNumber, Modal, Space, Switch, Typography } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

export default function ConfigModal({
  open,
  onClose,
  onSave,
  loading,
  azureKey,
  azureRegion,
  azureVoice,
  setAzureKey,
  setAzureRegion,
  setAzureVoice,
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
      title="Azure TTS 配置"
      onCancel={onClose}
      onOk={onSave}
      confirmLoading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input placeholder="AZURE_SPEECH_KEY" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} />
        <Input placeholder="AZURE_REGION (例如 eastasia)" value={azureRegion} onChange={(e) => setAzureRegion(e.target.value)} />
        <Input placeholder="AZURE_VOICE (例如 fr-FR-DeniseNeural)" value={azureVoice} onChange={(e) => setAzureVoice(e.target.value)} />
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
