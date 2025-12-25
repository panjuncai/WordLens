import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, InputNumber, Space, Switch, Typography, Tooltip } from 'antd';
import {
  EllipsisOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FormOutlined,
  RedoOutlined,
  RetweetOutlined,
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ShrinkOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onToggleMode = () => {},
  showCloze,
  onReadAll,
  onTogglePause,
  isPlaying,
  isPaused,
  onMoveShortcut,
  autoPlayCount,
  setAutoPlayCount,
  autoPlayCountCn = 1,
  setAutoPlayCountCn = () => {},
  autoPlayIntervalSeconds = 1,
  setAutoPlayIntervalSeconds = () => {},
  isSentenceLooping = false,
  onToggleSentenceLoop = () => {},
  isForeignLooping = false,
  onToggleForeignLoop = () => {},
  shadowingEnabled = false,
  onToggleShadowing = () => {},
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
  onOpenShadowingConfig = () => {},
  onOpenStudyStats = () => {},
  onLogout = () => {},
  onMenuConfig = null,
}) {
  const prefetchAudioRef = useRef(prefetchAudio);
  const prefetchChineseRef = useRef(prefetchChinese);
  const prefetchImagesRef = useRef(prefetchImages);
  const openConfigRef = useRef(onOpenConfig);
  const openStudyStatsRef = useRef(onOpenStudyStats);
  const logoutRef = useRef(onLogout);
  const controlPulseRef = useRef(null);
  const [activeControl, setActiveControl] = useState(null);
  const [navPanelOpen, setNavPanelOpen] = useState(false);

  useEffect(() => { prefetchAudioRef.current = prefetchAudio; }, [prefetchAudio]);
  useEffect(() => { prefetchChineseRef.current = prefetchChinese; }, [prefetchChinese]);
  useEffect(() => { prefetchImagesRef.current = prefetchImages; }, [prefetchImages]);
  useEffect(() => { openConfigRef.current = onOpenConfig; }, [onOpenConfig]);
  useEffect(() => { openStudyStatsRef.current = onOpenStudyStats; }, [onOpenStudyStats]);
  useEffect(() => { logoutRef.current = onLogout; }, [onLogout]);
  useEffect(() => () => {
    if (controlPulseRef.current) {
      clearTimeout(controlPulseRef.current);
      controlPulseRef.current = null;
    }
  }, []);

  const controlSize = isMobile ? 'middle' : 'large';
  const switchSize = isMobile ? 'default' : 'large';
  const handleToggleMode = useCallback((checked) => {
    onToggleMode(checked);
  }, [onToggleMode]);
  const menuItems = useMemo(() => {
    const base = [
      {
        key: 'count-cn',
        label: (
          <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
            <Text>自动中文发音次数</Text>
            <InputNumber
              size="small"
              min={0}
              max={20}
              value={autoPlayCountCn}
              onChange={(v) => setAutoPlayCountCn(v || 0)}
              style={{ width: 80 }}
            />
          </div>
        ),
      },
      {
        key: 'count',
        label: (
          <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
            <Text>自动外语发音次数</Text>
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
              <Switch
                size="small"
                checked={blurWords}
                onChange={setBlurWords}
                checkedChildren={<EyeInvisibleOutlined />}
                unCheckedChildren={<EyeOutlined />}
              />
            </div>
          ),
        },
        {
          key: 'shadowing',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>影子跟读</Text>
              <Switch
                size="small"
                checked={shadowingEnabled}
                onChange={onToggleShadowing}
                checkedChildren={<ShrinkOutlined />}
                unCheckedChildren={<ShrinkOutlined />}
              />
            </div>
          ),
        },
        {
          key: 'carousel',
          label: (
            <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
              <Text>图片轮播</Text>
              <Switch
                size="small"
                checked={autoCarousel}
                onChange={setAutoCarousel}
                checkedChildren={<RetweetOutlined />}
                unCheckedChildren={<RetweetOutlined />}
              />
            </div>
          ),
        },
      );
      // keep this divider only when we later add mobile-specific sections
    }
    return base;
  }, [
    accentCheck,
    autoCarousel,
    autoPlayCount,
    autoPlayCountCn,
    autoPlayIntervalSeconds,
    blurWords,
    handleToggleMode,
    imagePrefetching,
    isMobile,
    prefetching,
    prefetchingCn,
    onToggleShadowing,
    setAccentCheck,
    setAutoCarousel,
    setAutoPlayCount,
    setAutoPlayCountCn,
    setAutoPlayIntervalSeconds,
    setBlurWords,
    shadowingEnabled,
    showCloze,
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
    if (key === 'shadowing-config') onOpenShadowingConfig();
    if (key === 'logout') logoutRef.current();
  }, [onOpenShadowingConfig]);
  const menuProps = useMemo(() => ({
    items: wrappedMenuItems,
    onClick: handleMenuClick,
  }), [handleMenuClick, wrappedMenuItems]);
  const menuPropsRef = useRef(menuProps);
  useEffect(() => {
    menuPropsRef.current = menuProps;
  }, [menuProps]);
  const menuSignature = useMemo(() => JSON.stringify({
    autoPlayCount,
    autoPlayCountCn,
    autoPlayIntervalSeconds,
    prefetching,
    prefetchingCn,
    imagePrefetching,
    accentCheck,
    showCloze,
    blurWords,
    shadowingEnabled,
    autoCarousel,
    isMobile,
  }), [
    accentCheck,
    autoCarousel,
    autoPlayCount,
    autoPlayCountCn,
    autoPlayIntervalSeconds,
    blurWords,
    imagePrefetching,
    isMobile,
    prefetching,
    prefetchingCn,
    shadowingEnabled,
    showCloze,
  ]);

  useEffect(() => {
    if (!onMenuConfig) return;
    if (isMobile) onMenuConfig(menuPropsRef.current);
    else onMenuConfig(null);
  }, [isMobile, menuSignature, onMenuConfig]);

  const isActivePlaying = isPlaying && !isPaused;
  const showReadAll = false;
  const pulseControl = useCallback((key, handler) => {
    if (controlPulseRef.current) {
      clearTimeout(controlPulseRef.current);
      controlPulseRef.current = null;
    }
    setActiveControl(key);
    handler();
    controlPulseRef.current = setTimeout(() => {
      setActiveControl((prev) => (prev === key ? null : prev));
      controlPulseRef.current = null;
    }, 320);
  }, []);
  const handleOpenNavPanel = useCallback(() => {
    setNavPanelOpen(true);
  }, []);
  const handleCloseNavPanel = useCallback(() => {
    setNavPanelOpen(false);
  }, []);
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
          unCheckedChildren={<RetweetOutlined />}
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
              {showReadAll && (
                <Tooltip title={isActivePlaying ? '暂停' : (isPaused ? '继续' : '全文朗读')}>
                  <Button
                    size={controlSize}
                    type="text"
                    icon={isActivePlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                    onClick={handlePrimaryAction}
                  />
                </Tooltip>
              )}
              <div className={`hero-loop-group ${navPanelOpen ? 'collapsed' : ''}`}>
                <Tooltip title={isSentenceLooping ? '停止单句循环' : '单句循环'}>
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<RetweetOutlined />}
                    className={isSentenceLooping || activeControl === 'loop-sentence' ? 'hero-loop-active hero-control-active' : ''}
                    onClick={() => pulseControl('loop-sentence', onToggleSentenceLoop)}
                  />
                </Tooltip>
                <Tooltip title={isForeignLooping ? '停止外语循环' : '外语循环'}>
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<SwapOutlined />}
                    className={isForeignLooping || activeControl === 'loop-foreign' ? 'hero-loop-active hero-control-active' : ''}
                    onClick={() => pulseControl('loop-foreign', onToggleForeignLoop)}
                  />
                </Tooltip>
                <Tooltip title="影子跟读">
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<ShrinkOutlined />}
                    className={shadowingEnabled || activeControl === 'shadowing' ? 'hero-control-active' : ''}
                    onClick={() => pulseControl('shadowing', () => onToggleShadowing(!shadowingEnabled))}
                  />
                </Tooltip>
                <Button
                  size={controlSize}
                  type="text"
                  icon={<DoubleRightOutlined />}
                  className={activeControl === 'nav-open' ? 'hero-control-active' : ''}
                  onClick={() => pulseControl('nav-open', handleOpenNavPanel)}
                />
              </div>
              <div className={`hero-nav-group ${navPanelOpen ? 'expanded' : ''}`}>
                <Button
                  size={controlSize}
                  type="text"
                  icon={<DoubleLeftOutlined />}
                  className={activeControl === 'nav-close' ? 'hero-control-active' : ''}
                  onClick={() => pulseControl('nav-close', handleCloseNavPanel)}
                />
                <Tooltip title="上一个外语词块(快捷键:↑)">
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<ArrowUpOutlined />}
                    className={activeControl === 'arrow-up' ? 'hero-control-active' : ''}
                    onClick={() => pulseControl('arrow-up', () => onMoveShortcut(-1, 'foreign'))}
                  />
                </Tooltip>
                <Tooltip title="下一个外语词块(快捷键:↓)">
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<ArrowDownOutlined />}
                    className={activeControl === 'arrow-down' ? 'hero-control-active' : ''}
                    onClick={() => pulseControl('arrow-down', () => onMoveShortcut(1, 'foreign'))}
                  />
                </Tooltip>
                <Tooltip title="上一个词块(快捷键:←)">
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    className={activeControl === 'arrow-left' ? 'hero-control-active' : ''}
                    onClick={() => pulseControl('arrow-left', () => onMoveShortcut(-1, 'all'))}
                  />
                </Tooltip>
                <Tooltip title="下一个词块(快捷键:→)">
                  <Button
                    size={controlSize}
                    type="text"
                    icon={<ArrowRightOutlined />}
                    className={activeControl === 'arrow-right' ? 'hero-control-active' : ''}
                    onClick={() => pulseControl('arrow-right', () => onMoveShortcut(1, 'all'))}
                  />
                </Tooltip>
              </div>
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
