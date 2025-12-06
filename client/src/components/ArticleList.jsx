import { useState } from 'react';
import { Button, Card, Dropdown, Input, Modal, Space, Typography, Popconfirm, Switch, Avatar, Tooltip, Checkbox, message } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ArticleList({
  items,
  loading,
  saving,
  onCreate,
  onCreateStart = () => {},
  onUpdate,
  onDelete,
  onSelect,
  activeId,
  collapsed = false,
  onToggleCollapse = () => {},
  userEmail = '',
  themeMode = 'light',
  onToggleTheme = () => {},
  onOpenConfig = () => {},
  onLogout = () => {},
  fetchItem = null,
  onLogoClick = () => {},
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [collapseHover, setCollapseHover] = useState(false);

  const openModal = async (item = null) => {
    if (!item) return;
    setEditing(item);
    setTitle(item?.title || '');
    setContent(item?.content || '');
    setModalOpen(true);
    if (!item?.content && fetchItem) {
      setDetailLoading(true);
      try {
        const detail = await fetchItem(item.id);
        if (detail) {
          setEditing(detail);
          setTitle(detail.title || item.title || '');
          setContent(detail.content || '');
        }
      } finally {
        setDetailLoading(false);
      }
    }
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

  const userMenuItems = [
    { key: 'config', label: 'TTS 配置' },
    {
      key: 'theme',
      label: (
        <div className="menu-switch">
          <span>暗色模式</span>
          <Switch size="small" checked={themeMode === 'dark'} onChange={(checked) => onToggleTheme(checked ? 'dark' : 'light')} />
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'logout', label: '退出登录' },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'config') onOpenConfig();
    if (key === 'logout') onLogout();
  };

  const startBulk = () => {
    setBulkMode(true);
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const handleBulkToggle = async () => {
    if (!bulkMode) {
      startBulk();
      return;
    }
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      setBulkMode(false);
      return;
    }
    Modal.confirm({
      title: '确认删除选中的文章？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        for (let i = 0; i < ids.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await onDelete(ids[i]);
        }
        message.success('批量删除完成');
        setBulkMode(false);
        setSelectedIds(new Set());
      },
    });
  };

  const toggleOne = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Card
      className={`sidebar-card ${collapsed ? 'collapsed' : ''}`}
      title={collapsed ? null : (
        <button type="button" className="logo-button" onClick={onLogoClick}>
          <img src="/Sola.svg" alt="logo" className="sidebar-logo" />
        </button>
      )}
      variant="outlined"
      extra={(
        <Space size="small">
          {!collapsed && (
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={handleBulkToggle} />
          )}
          {!collapsed && <Button type="text" size="small" onClick={onCreateStart}>＋</Button>}
          <Button
            type="text"
            size="small"
            className="collapse-btn"
            icon={collapsed ? (
              collapseHover ? <MenuUnfoldOutlined /> : <img src="/Sola.svg" alt="logo" className="collapse-logo" />
            ) : <MenuFoldOutlined />}
            onClick={onToggleCollapse}
            onMouseEnter={() => setCollapseHover(true)}
            onMouseLeave={() => setCollapseHover(false)}
          />
        </Space>
      )}
      loading={loading}
    >
      {!collapsed && (
        <div className="sidebar-scroll" style={{ overflowX: 'hidden' }}>
          <div className="article-list">
            {items.length === 0 && <Text type="secondary">暂无文章，点击新增创建</Text>}
            {items.map((item) => (
              <div
                key={item.id}
                className={`article-row ${activeId === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item)}
              >
                {bulkMode && (
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleOne(item.id, e.target.checked);
                    }}
                  />
                )}
                <Text className="article-title" ellipsis={{ tooltip: item.title }}>{item.title}</Text>
                <Space size={2} className="article-actions">
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); openModal(item); }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="确认删除？"
                    onConfirm={(e) => { e?.stopPropagation(); onDelete(item.id); }}
                  >
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="topLeft" trigger={['click']}>
        <div className="sidebar-footer">
          <Avatar size="small" icon={<UserOutlined />} />
          {!collapsed && (
            <div className="sidebar-footer-text">
              <Text strong>{userEmail || '未登录'}</Text>
            </div>
          )}
        </div>
      </Dropdown>

      <Modal
        title={editing ? '编辑文章' : '新增文章'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        confirmLoading={saving || detailLoading}
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
