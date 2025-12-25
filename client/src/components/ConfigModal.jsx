import { Input, Modal, Space } from 'antd';

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
}) {
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
      </Space>
    </Modal>
  );
}
