import { useState } from 'react';
import { Button, Card, Input, Modal, Space, Typography, Popconfirm } from 'antd';

const { Text } = Typography;

export default function ArticleList({
  items,
  loading,
  saving,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
  activeId,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const openModal = (item = null) => {
    setEditing(item);
    setTitle(item?.title || '');
    setContent(item?.content || '');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    if (editing) {
      const updated = await onUpdate(editing.id, title, content);
      if (updated) onSelect(updated);
    } else {
      const created = await onCreate(title, content);
      if (created) onSelect(created);
    }
    setModalOpen(false);
  };

  return (
    <Card
      title="我的文章"
      extra={<Button type="primary" size="small" onClick={() => openModal()}>新增</Button>}
      loading={loading}
    >
      <div className="article-list">
        {items.length === 0 && <Text type="secondary">暂无文章，点击新增创建</Text>}
        {items.map((item) => (
          <div
            key={item.id}
            className="article-row"
            style={{ background: activeId === item.id ? 'rgba(37,99,235,0.08)' : 'transparent' }}
            onClick={() => onSelect(item)}
          >
            <div className="article-meta">
              <Text strong>{item.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>更新于 {item.updated_at || ''}</Text>
            </div>
            <Space size="small">
              <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openModal(item); }}>编辑</Button>
              <Popconfirm
                title="确认删除？"
                onConfirm={(e) => { e?.stopPropagation(); onDelete(item.id); }}
              >
                <Button type="link" danger size="small" onClick={(e) => e.stopPropagation()}>删除</Button>
              </Popconfirm>
            </Space>
          </div>
        ))}
      </div>

      <Modal
        title={editing ? '编辑文章' : '新增文章'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input.TextArea
            placeholder="文章内容"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Space>
      </Modal>
    </Card>
  );
}
