# 五子棋 UI 重新布局设计文档

## 概述

重新调整五子棋游戏的 UI 布局，优化信息层级，使界面更简洁、美观。同时修复录像播放时切换模式不重置棋盘的 BUG。

## 设计目标

1. **重新组织信息层级** — 让重要信息更突出，次要信息弱化
2. **简化布局结构** — 减少垂直空间占用，让棋盘更突出
3. **保持现有风格** — 保留深色木质主题和金线装饰

## 布局方案：顶部精简 + 底部状态栏

### 桌面端布局 (>768px)

```
┌─────────────────────────────────────────────────────────────┐
│  五子棋 | GOMOKU          [双人] [AI 对战] [局域网]        │  ← 顶部导航栏
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────────┐                      │
│                    │                 │                      │
│                    │    15×15 棋盘   │                      │  ← 棋盘区域
│                    │                 │                      │
│                    └─────────────────┘                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  双人模式        黑方落子        [悔棋] [录像]              │  ← 底部状态栏
└─────────────────────────────────────────────────────────────┘
```

### 移动端布局 (<768px)

```
┌───────────────────────────────┐
│  五子棋    [双人] [AI] [局域网]│  ← 顶部导航栏（紧凑）
├───────────────────────────────┤
│       ┌─────────────────┐     │
│       │   15×15 棋盘    │     │  ← 棋盘区域
│       └─────────────────┘     │
├───────────────────────────────┤
│  双人    黑方落子    [悔棋]   │  ← 底部状态栏（紧凑）
└───────────────────────────────┘
```

## 组件修改

### 1. 顶部导航栏 (game-header)

**当前状态：**
- 标题和模式选择分两行显示
- 占用较多垂直空间

**优化后：**
- 品牌名 "五子棋" + 英文 "GOMOKU" 合并到一行左侧
- 模式选择按钮紧凑排列到右侧
- 减少 padding 和 margin

**CSS 变更：**
```css
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(10px, 2vw, 16px);
  /* 移除 align-items: end，改为 center */
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 改为水平排列 */
}

.game-header h1 {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  /* 减小标题字号 */
}

.mode-toolbar {
  gap: 6px;
  /* 减小按钮间距 */
}
```

### 2. 底部状态栏 (game-footer)

**当前状态：**
- 模式标签、状态信息、操作按钮分三列
- 占用空间较大

**优化后：**
- 三列布局保持，但更紧凑
- 状态信息视觉突出（使用 accent-gold 颜色）
- 操作按钮分组清晰

**CSS 变更：**
```css
.game-footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: clamp(8px, 1.5vw, 12px);
}

.status {
  font-weight: 600;
  color: var(--accent-gold-bright);
  /* 突出当前状态 */
}
```

### 3. 棋盘区域 (board-stage)

**保持现有设计**，仅调整 margin 以适应新布局。

## BUG 修复：录像播放时切换模式重置棋盘

### 问题描述

在录像播放模式下，如果用户切换到双人或人机模式，棋盘不会重置，仍显示录像内容。

### 修复方案

在 `handleModeSelect` 回调中，检测是否处于录像模式，如果是则退出录像并重置棋盘。

**代码变更 (Game.tsx)：**
```typescript
const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
  // 如果正在录像播放，退出录像模式
  if (isReplayMode) {
    setIsReplayMode(false)
    savedTerminalGameRef.current = null
  }
  
  // 离开 LAN 模式或切换到不同模式时清理网络房间状态
  if (state.settings.mode === 'lan' && mode !== 'lan' && state.lanState) {
    network.leaveRoom()
  }
  
  dispatch({ type: 'SET_MODE', mode, aiDifficulty })
  playSFX('click')
}, [state.settings.mode, state.lanState, isReplayMode, network, playSFX])
```

## 响应式断点

- **桌面端**: > 768px — 宽松布局
- **平板端**: 481px - 768px — 适中布局
- **移动端**: ≤ 480px — 紧凑布局

## 颜色主题

保持现有深色木质主题：
- 背景: `#130f0b` (深棕)
- 面板: `rgba(42, 27, 18, 0.86)` (半透明棕)
- 强调色: `#c9a86c` (金线)
- 文字: `#f2eadc` (暖白)

## 测试计划

1. **视觉测试**
   - 桌面端布局是否符合设计稿
   - 移动端布局是否紧凑美观
   - 颜色和间距是否一致

2. **功能测试**
   - 模式切换是否正常
   - 录像播放时切换模式是否重置棋盘
   - 响应式布局在不同屏幕尺寸下是否正常

3. **回归测试**
   - 现有功能是否受影响
   - 游戏逻辑是否正常
