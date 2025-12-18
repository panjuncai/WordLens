import { useState } from 'react';
import {
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Modal,
  Space,
  Typography,
  Switch,
  Avatar,
  Checkbox,
  message,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  MoreOutlined,
  RollbackOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const MAX_TITLE_LEN = 20;
const MAX_CONTENT_LEN = 20000;

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
  onOpenStudyStats = () => {},
  backgroundPlaybackEnabled = true,
  onToggleBackgroundPlayback = () => {},
  sleepTimerMinutes = 0,
  onSleepTimerMinutesChange = () => {},
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
    setTitle((item?.title || '').slice(0, MAX_TITLE_LEN));
    setContent((item?.content || '').slice(0, MAX_CONTENT_LEN));
    setModalOpen(true);
    if (!item?.content && fetchItem) {
      setDetailLoading(true);
      try {
        const detail = await fetchItem(item.id);
        if (detail) {
          setEditing(detail);
          setTitle((detail.title || item.title || '').slice(0, MAX_TITLE_LEN));
          setContent((detail.content || '').slice(0, MAX_CONTENT_LEN));
        }
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    if (content.length > MAX_CONTENT_LEN) {
      message.warning(`内容最多 ${MAX_CONTENT_LEN} 个字符`);
      setContent(content.slice(0, MAX_CONTENT_LEN));
      return;
    }
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
    {
      key: 'background',
      label: (
        <div className="menu-switch" onClick={(e) => e.stopPropagation()}>
          <span>后台播放</span>
          <Switch size="small" checked={backgroundPlaybackEnabled} onChange={onToggleBackgroundPlayback} />
        </div>
      ),
    },
    {
      key: 'sleep-timer',
      label: (
        <div className="menu-switch" onClick={(e) => e.stopPropagation()}>
          <span>定时关闭</span>
          <Select
            size="small"
            value={sleepTimerMinutes}
            style={{ width: 110 }}
            onChange={(v) => onSleepTimerMinutesChange(v)}
            options={[
              { value: 0, label: '不关闭' },
              { value: 15, label: '15 分钟' },
              { value: 30, label: '30 分钟' },
              { value: 60, label: '60 分钟' },
            ]}
          />
        </div>
      ),
    },
    { key: 'stats', label: '学习统计' },
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
    if (key === 'stats') onOpenStudyStats();
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
        await Promise.all(ids.map((id) => onDelete(id)));
        message.success('批量删除完成');
        setBulkMode(false);
        setSelectedIds(new Set());
        const remaining = items.filter((item) => !ids.includes(item.id));
        if (remaining.length) {
          onSelect(remaining[0]);
        } else {
          onCreateStart();
        }
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

  const handleToggleAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
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
        <>
          <div className="sidebar-quick-actions">
            <Button
              type="text"
              block
              className="quick-action-btn"
              icon={<PlusOutlined />}
              onClick={onCreateStart}
            >
              新增文章
            </Button>
            <Button
              type="text"
              block
              className={`quick-action-btn ${bulkMode ? (selectedIds.size ? 'danger' : 'cancel') : ''}`}
              icon={bulkMode ? <RollbackOutlined /> : <DeleteOutlined />}
              onClick={handleBulkToggle}
            >
              {bulkMode
                ? (selectedIds.size ? '完成批量删除' : '取消批量删除')
                : '批量删除'}
            </Button>
            {bulkMode && (
              <div className="bulk-toggle-all">
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                >
                  全选
                </Checkbox>
              </div>
            )}
          </div>
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
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    items: [
                      { key: 'edit', label: '编辑', icon: <EditOutlined /> },
                      { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'edit') {
                        openModal(item);
                      } else if (key === 'delete') {
                        Modal.confirm({
                          title: '确认删除？',
                          okText: '删除',
                          okType: 'danger',
                          cancelText: '取消',
                          onOk: () => onDelete(item.id),
                        });
                      }
                    },
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    className="article-more-btn"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            ))}
          </div>
          </div>
        </>
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
          <Input
            placeholder="标题"
            value={title}
            maxLength={MAX_TITLE_LEN}
            onChange={(e) => setTitle((e.target.value || '').slice(0, MAX_TITLE_LEN))}
          />
          <Input.TextArea
            placeholder="文章内容"
            rows={8}
            value={content}
            maxLength={MAX_CONTENT_LEN}
            onChange={(e) => setContent((e.target.value || '').slice(0, MAX_CONTENT_LEN))}
          />
        </Space>
      </Modal>
    </Card>
  );
}
