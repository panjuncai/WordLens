import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button, Dropdown, InputNumber, Space, Switch, Typography, Tooltip } from 'antd';
import {
  EllipsisOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FormOutlined,
  RedoOutlined,
  RetweetOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onExtract,
  onReset,
  showCloze,
  onReadAll,
  onTogglePause,
  isPlaying,
  isPaused,
  onMoveShortcut,
  autoPlayCount,
  setAutoPlayCount,
  autoPlayIntervalSeconds = 1,
  setAutoPlayIntervalSeconds = () => {},
  isSentenceLooping = false,
  onToggleSentenceLoop = () => {},
  prefetchAudio,
  prefetching,
  prefetchProgress,
  prefetchChinese,
  prefetchingCn,
  prefetchProgressCn,
  prefetchImages,
  imagePrefetching,
  imagePrefetchProgress,
  autoCarousel,
  blurWords,
  accentCheck,
  setAutoCarousel,
  setBlurWords,
  setAccentCheck,
  isMobile = false,
  onOpenConfig = () => {},
  onOpenStudyStats = () => {},
  onToggleTheme = () => {},
  setThemeMode = () => {},
  onLogout = () => {},
  themeMode = 'light',
  onMenuConfig = null,
}) {
  const extractRef = useRef(onExtract);
  const resetRef = useRef(onReset);
  const prefetchAudioRef = useRef(prefetchAudio);
  const prefetchChineseRef = useRef(prefetchChinese);
  const prefetchImagesRef = useRef(prefetchImages);
  const openConfigRef = useRef(onOpenConfig);
  const openStudyStatsRef = useRef(onOpenStudyStats);
  const toggleThemeRef = useRef(onToggleTheme);
  const logoutRef = useRef(onLogout);

  useEffect(() => { extractRef.current = onExtract; }, [onExtract]);
  useEffect(() => { resetRef.current = onReset; }, [onReset]);
  useEffect(() => { prefetchAudioRef.current = prefetchAudio; }, [prefetchAudio]);
  useEffect(() => { prefetchChineseRef.current = prefetchChinese; }, [prefetchChinese]);
  useEffect(() => { prefetchImagesRef.current = prefetchImages; }, [prefetchImages]);
  useEffect(() => { openConfigRef.current = onOpenConfig; }, [onOpenConfig]);
  useEffect(() => { openStudyStatsRef.current = onOpenStudyStats; }, [onOpenStudyStats]);
  useEffect(() => { toggleThemeRef.current = onToggleTheme; }, [onToggleTheme]);
  useEffect(() => { logoutRef.current = onLogout; }, [onLogout]);

  const controlSize = isMobile ? 'middle' : 'large';
  const switchSize = isMobile ? 'default' : 'large';
  const handleToggleMode = useCallback((checked) => {
    if (checked) extractRef.current();
    else resetRef.current();
  }, []);
  const menuItems = useMemo(() => {
    const base = [
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
        key: 'interval',
        label: (
          <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
            <Text>自动发音间隔(秒)</Text>
            <InputNumber
              size="small"
              min={0}
              max={300}
              value={autoPlayIntervalSeconds}
              onChange={(v) => setAutoPlayIntervalSeconds(v ?? 0)}
              style={{ width: 80 }}
            />
          </div>
        ),
      },
      {
        key: 'audio',
        label: '缓存外语音频',
        disabled: prefetching,
        tip: '缓存当前文章所有外语音频',
      },
      {
        key: 'audio-cn',
        label: '缓存中文音频',
        disabled: prefetchingCn,
        tip: '缓存当前文章所有中文音频',
      },
      {
        key: 'image',
        label: '缓存轮播图',
        disabled: imagePrefetching,
        tip: '缓存当前文章所有轮播图',
      },
      {
        key: 'accent',
        label: (
          <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
            <Text>重音检查</Text>
            <Switch size="small" checked={accentCheck} onChange={setAccentCheck} />
          </div>
        ),
        tip: '用于控制填写练习是否检查法语重音符',
      },
    ];
    if (isMobile) {
      base.unshift(
        {
          key: 'mode',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>练习模式</Text>
              <Switch
                size="small"
                checked={showCloze}
                onChange={handleToggleMode}
                checkedChildren={<FormOutlined />}
                unCheckedChildren={<RedoOutlined />}
              />
            </div>
          ),
        },
        {
          key: 'blur',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>单词遮挡</Text>
              <Switch size="small" checked={blurWords} onChange={setBlurWords} />
            </div>
          ),
        },
        {
          key: 'carousel',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>图片轮播</Text>
              <Switch size="small" checked={autoCarousel} onChange={setAutoCarousel} />
            </div>
          ),
        },
      );
      base.push(
        { type: 'divider' },
        { key: 'stats', label: '学习统计' },
        { key: 'config', label: 'TTS 配置' },
        {
          key: 'theme-toggle',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>暗色模式</Text>
              <Switch
                size="small"
                checked={themeMode === 'dark'}
                onChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
              />
            </div>
          ),
        },
        { key: 'logout', label: '退出登录' },
      );
    }
    return base;
  }, [
    accentCheck,
    autoCarousel,
    autoPlayCount,
    autoPlayIntervalSeconds,
    blurWords,
    handleToggleMode,
    imagePrefetching,
    isMobile,
    prefetching,
    prefetchingCn,
    setAccentCheck,
    setAutoCarousel,
    setAutoPlayCount,
    setAutoPlayIntervalSeconds,
    setBlurWords,
    setThemeMode,
    showCloze,
    themeMode,
  ]);

  const wrappedMenuItems = useMemo(() => menuItems.map((item) => {
    if (!item.tip) return item;
    return {
      ...item,
      label: (
        <Tooltip title={item.tip} placement="left">
          <span>{item.label}</span>
        </Tooltip>
      ),
    };
  }), [menuItems]);

  const handleMenuClick = useCallback(({ key }) => {
    if (key === 'audio') prefetchAudioRef.current();
    if (key === 'audio-cn') prefetchChineseRef.current();
    if (key === 'image') prefetchImagesRef.current();
    if (key === 'stats') openStudyStatsRef.current();
    if (key === 'config') openConfigRef.current();
    if (key === 'logout') logoutRef.current();
  }, []);
  const menuProps = useMemo(() => ({
    items: wrappedMenuItems,
    onClick: handleMenuClick,
  }), [handleMenuClick, wrappedMenuItems]);

  useEffect(() => {
    if (!onMenuConfig) return;
    if (isMobile) onMenuConfig(menuProps);
    else onMenuConfig(null);
  }, [isMobile, menuProps, onMenuConfig]);

  const isActivePlaying = isPlaying && !isPaused;
  const handlePrimaryAction = useCallback(() => {
    if (isActivePlaying) {
      onTogglePause();
      return;
    }
    if (isPaused) {
      onTogglePause();
      return;
    }
    onReadAll();
  }, [isActivePlaying, isPaused, onReadAll, onTogglePause]);

  const switchBlock = isMobile ? null : (
    <Space size="small" wrap align="center" className="hero-switches">
      <Tooltip title="练习模式(听写/原文)">
        <Switch
          size={switchSize}
          checked={showCloze}
          onChange={handleToggleMode}
          checkedChildren={<FormOutlined />}
          unCheckedChildren={<RedoOutlined />}
        />
      </Tooltip>
      <Tooltip title="图片轮播">
        <Switch
          size={switchSize}
          checked={autoCarousel}
          onChange={setAutoCarousel}
          checkedChildren={<RetweetOutlined />}
          unCheckedChildren={<PoweroffOutlined />}
        />
      </Tooltip>
      <Tooltip title="单词遮挡">
        <Switch
          size={switchSize}
          checked={blurWords}
          onChange={setBlurWords}
          checkedChildren={<EyeInvisibleOutlined />}
          unCheckedChildren={<EyeOutlined />}
        />
      </Tooltip>
    </Space>
  );

  return (
    <div className={`hero-header ${isMobile ? 'hero-mobile' : ''}`}>
      <div className="hero-toolbar">
        {!isMobile && <div className="hero-section hero-section-start" />}
        <div className="hero-section hero-section-center">
          <Space
            size={isMobile ? 'large' : 'large'}
            wrap={!isMobile}
            direction="horizontal"
            align="center"
            className="hero-control-space"
          >
            <Space size="small" wrap align="center" className="hero-control-buttons">
              <Tooltip title={isActivePlaying ? '暂停' : (isPaused ? '继续' : '全文朗读')}>
                <Button
                  size={controlSize}
                  type="text"
                  icon={isActivePlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePrimaryAction}
                />
              </Tooltip>
              <Tooltip title={isSentenceLooping ? '停止单句循环' : '单句循环'}>
                <Button
                  size={controlSize}
                  type="text"
                  icon={<RetweetOutlined />}
                  className={isSentenceLooping ? 'hero-loop-active' : ''}
                  onClick={onToggleSentenceLoop}
                />
              </Tooltip>
              <Tooltip title="上一个外语词块(快捷键:↑)">
                <Button size={controlSize} type="text" icon={<ArrowUpOutlined />} onClick={() => onMoveShortcut(-1, 'foreign')} />
              </Tooltip>
              <Tooltip title="下一个外语词块(快捷键:↓)">
                <Button size={controlSize} type="text" icon={<ArrowDownOutlined />} onClick={() => onMoveShortcut(1, 'foreign')} />
              </Tooltip>
              <Tooltip title="上一个词块(快捷键:←)">
                <Button size={controlSize} type="text" icon={<ArrowLeftOutlined />} onClick={() => onMoveShortcut(-1, 'all')} />
              </Tooltip>
              <Tooltip title="下一个词块(快捷键:→)">
                <Button size={controlSize} type="text" icon={<ArrowRightOutlined />} onClick={() => onMoveShortcut(1, 'all')} />
              </Tooltip>
            </Space>
            {switchBlock}
            <div className="hero-progress">
              {prefetching && (
                <Text type="secondary" style={{ marginRight: 12 }}>
                  外语 {prefetchProgress.done}/{prefetchProgress.total}
                </Text>
              )}
              {prefetchingCn && (
                <Text type="secondary" style={{ marginRight: 12 }}>
                  中文 {prefetchProgressCn.done}/{prefetchProgressCn.total}
                </Text>
              )}
              {imagePrefetching && (
                <Text type="secondary">
                  图片 {imagePrefetchProgress.done}/{imagePrefetchProgress.total}
                </Text>
              )}
            </div>
          </Space>
        </div>

        {!isMobile && (
          <div className="hero-section hero-section-end">
            <Dropdown menu={menuProps} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<EllipsisOutlined />} />
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
}
