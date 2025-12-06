import { Button, Dropdown, InputNumber, Space, Switch, Typography } from 'antd';
import { EllipsisOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onExtract,
  onReset,
  autoPlayCount,
  setAutoPlayCount,
  prefetchAudio,
  prefetching,
  prefetchProgress,
  prefetchImages,
  imagePrefetching,
  imagePrefetchProgress,
  autoCarousel,
  blurWords,
  accentCheck,
  setAutoCarousel,
  setBlurWords,
  setAccentCheck,
}) {
  const menuItems = [
    {
      key: 'count',
      label: (
        <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
          <Text>自动发音次数</Text>
          <InputNumber
            size="small"
            min={0}
            max={20}
            value={autoPlayCount}
            onChange={(v) => setAutoPlayCount(v || 0)}
            style={{ width: 80 }}
          />
        </div>
      ),
    },
    {
      key: 'audio',
      label: '拉取声音',
      disabled: prefetching,
    },
    {
      key: 'image',
      label: '拉取图片',
      disabled: imagePrefetching,
    },
    {
      key: 'accent',
      label: (
        <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
          <Text>重音检查</Text>
          <Switch size="small" checked={accentCheck} onChange={setAccentCheck} />
        </div>
      ),
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'audio') prefetchAudio();
    if (key === 'image') prefetchImages();
  };

  return (
    <div className="hero-header">
      <div className="hero-toolbar">
        <Space size="middle" className="hero-center" wrap>
          <Button type="primary" onClick={onExtract}>
            填空练习
          </Button>
          <Button icon={<UndoOutlined />} onClick={onReset}>
            恢复原文
          </Button>
          <Space size="small" align="center">
            <Text type="secondary">自动轮播</Text>
            <Switch size="small" checked={autoCarousel} onChange={setAutoCarousel} />
          </Space>
          <Space size="small" align="center">
            <Text type="secondary">高斯模糊</Text>
            <Switch size="small" checked={blurWords} onChange={setBlurWords} />
          </Space>
          <div className="hero-progress">
            {prefetching && (
              <Text type="secondary" style={{ marginRight: 12 }}>
                声音 {prefetchProgress.done}/{prefetchProgress.total}
              </Text>
            )}
            {imagePrefetching && (
              <Text type="secondary">
                图片 {imagePrefetchProgress.done}/{imagePrefetchProgress.total}
              </Text>
            )}
          </div>
        </Space>

        <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
          <Button icon={<EllipsisOutlined />} />
        </Dropdown>
      </div>
      
    </div>
  );
}
