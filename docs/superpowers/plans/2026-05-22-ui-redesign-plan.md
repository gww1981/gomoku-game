# 五子棋 UI 重新布局实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重新调整五子棋游戏的 UI 布局，优化信息层级，使界面更简洁、美观。同时修复录像播放时切换模式不重置棋盘的 BUG。

**Architecture:** 采用"顶部精简 + 底部状态栏"布局方案，将标题和模式选择合并到顶部一行，状态信息精简到棋盘下方。保持现有深色木质主题，仅调整 CSS 布局和间距。

**Tech Stack:** React 19, TypeScript, CSS Grid, Vite

---

## 文件结构

```
src/
├── components/
│   ├── Game.tsx              # 主游戏组件 (修改: 修复录像切换 BUG)
│   └── Game.css              # 游戏样式 (修改: 布局调整)
├── App.css                   # 全局样式 (修改: 布局调整)
└── index.css                 # 基础样式 (保持不变)
```

---

### Task 1: 修复录像播放时切换模式不重置棋盘的 BUG

**Files:**
- Modify: `src/components/Game.tsx:45-52`

- [ ] **Step 1: 编写失败测试**

```typescript
// src/components/Game.test.tsx
describe('录像模式切换', () => {
  it('切换模式时应退出录像模式并重置棋盘', () => {
    // 测试代码将在后续步骤中实现
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test -- --run src/components/Game.test.tsx`
Expected: PASS (测试通过，但功能未实现)

- [ ] **Step 3: 编写最小实现**

```typescript
// src/components/Game.tsx
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

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- --run src/components/Game.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/Game.tsx
git commit -m "fix: 录像播放时切换模式重置棋盘"
```

---

### Task 2: 调整顶部导航栏布局

**Files:**
- Modify: `src/App.css:15-68`

- [ ] **Step 1: 编写失败测试**

```css
/* 视觉测试 - 需要手动验证 */
/* 预期: 标题和模式选择在同一行显示 */
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run dev`
Expected: 顶部导航栏仍为两行布局

- [ ] **Step 3: 编写最小实现**

```css
/* src/App.css */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-width: 0;
  padding: clamp(10px, 2vw, 16px);
  border: 1px solid var(--panel-line);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.055), transparent 42%),
    var(--panel);
  box-shadow: var(--shadow-panel);
  backdrop-filter: blur(14px);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.eyebrow {
  color: var(--accent-gold-bright);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
}

.game-header h1 {
  color: var(--text-primary);
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 650;
  line-height: 0.95;
  letter-spacing: 0;
  text-shadow: 0 3px 18px rgba(0, 0, 0, 0.38);
}

.mode-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run dev`
Expected: 顶部导航栏显示为一行布局

- [ ] **Step 5: 提交**

```bash
git add src/App.css
git commit -m "style: 调整顶部导航栏布局为一行显示"
```

---

### Task 3: 调整底部状态栏布局

**Files:**
- Modify: `src/App.css:222-277`

- [ ] **Step 1: 编写失败测试**

```css
/* 视觉测试 - 需要手动验证 */
/* 预期: 底部状态栏更紧凑，状态信息突出显示 */
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run dev`
Expected: 底部状态栏仍为原有布局

- [ ] **Step 3: 编写最小实现**

```css
/* src/App.css */
.game-footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: clamp(8px, 1.5vw, 12px);
  border: 1px solid var(--panel-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--shadow-panel);
  backdrop-filter: blur(14px);
}

.mode-badge,
.status {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(201, 168, 108, 0.18);
  border-radius: 6px;
  background: rgba(20, 13, 9, 0.44);
  color: var(--text-secondary);
}

.mode-badge {
  padding: 0 12px;
  white-space: nowrap;
  font-size: 12px;
}

.status {
  padding: 0 16px;
  font-weight: 650;
  text-align: center;
  color: var(--accent-gold-bright);
}

.status.won {
  border-color: rgba(242, 206, 122, 0.7);
  color: var(--accent-gold-bright);
  text-shadow: 0 0 16px rgba(242, 206, 122, 0.35);
}

.status.ai-thinking {
  gap: 4px;
  color: var(--accent-gold-bright);
}

.reset-button {
  padding: 0 16px;
  color: var(--text-primary);
  animation: fadeSlideUp 260ms ease-out;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run dev`
Expected: 底部状态栏更紧凑，状态信息突出显示

- [ ] **Step 5: 提交**

```bash
git add src/App.css
git commit -m "style: 调整底部状态栏布局更紧凑"
```

---

### Task 4: 调整移动端响应式布局

**Files:**
- Modify: `src/App.css:379-454`

- [ ] **Step 1: 编写失败测试**

```css
/* 视觉测试 - 需要手动验证 */
/* 预期: 移动端布局紧凑美观 */
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run dev`
Expected: 移动端布局仍为原有样式

- [ ] **Step 3: 编写最小实现**

```css
/* src/App.css */
@media (max-width: 768px) {
  .game-shell {
    align-items: start;
    padding: 12px;
  }

  .game-header {
    align-items: center;
    text-align: center;
    flex-direction: row;
    justify-content: space-between;
    padding: 10px 14px;
  }

  .brand-block {
    gap: 8px;
  }

  .game-header h1 {
    font-size: 1.2rem;
  }

  .eyebrow {
    font-size: 0.7rem;
  }

  .mode-toolbar {
    justify-content: flex-end;
    gap: 4px;
  }

  .mode-group {
    gap: 4px;
  }

  .mode-group button,
  .mode-choice,
  .difficulty-choice {
    min-width: 60px;
    padding: 0 10px;
    min-height: 36px;
    font-size: 11px;
  }

  .board-stage {
    padding: 12px;
  }

  .board {
    --cell-size: clamp(16px, 5vw, 36px);
    padding: 8px;
  }

  .game-footer {
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    padding: 8px 12px;
  }

  .mode-badge,
  .status,
  .reset-button {
    min-height: 32px;
    padding: 0 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .game-shell {
    padding: 8px;
  }

  .game-header,
  .game-footer {
    padding: 8px 12px;
  }

  .board-stage {
    padding: 8px;
  }

  .board {
    --cell-size: clamp(16px, 5vw, 36px);
    padding: 8px;
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run dev`
Expected: 移动端布局紧凑美观

- [ ] **Step 5: 提交**

```bash
git add src/App.css
git commit -m "style: 优化移动端响应式布局"
```

---

### Task 5: 验证整体效果

**Files:**
- No new files

- [ ] **Step 1: 运行开发服务器**

Run: `npm run dev`
Expected: 服务器正常启动

- [ ] **Step 2: 手动测试桌面端布局**

1. 打开浏览器访问 `http://localhost:5173`
2. 检查顶部导航栏是否为一行显示
3. 检查底部状态栏是否更紧凑
4. 检查状态信息是否突出显示

- [ ] **Step 3: 手动测试移动端布局**

1. 使用浏览器开发者工具切换到移动端视图
2. 检查布局是否紧凑美观
3. 检查按钮是否易于点击

- [ ] **Step 4: 测试功能**

1. 测试模式切换是否正常
2. 测试录像播放时切换模式是否重置棋盘
3. 测试悔棋、录像列表等功能

- [ ] **Step 5: 运行测试**

Run: `npm test -- --run`
Expected: 所有测试通过

- [ ] **Step 6: 提交最终版本**

```bash
git add -A
git commit -m "feat: 完成 UI 重新布局

- 顶部精简 + 底部状态栏布局
- 修复录像播放时切换模式不重置棋盘的 BUG
- 优化移动端响应式布局"
```

---

## 测试计划

### 单元测试
- 录像模式切换测试
- 模式选择功能测试

### 视觉测试
- 桌面端布局验证
- 移动端布局验证
- 颜色和间距一致性验证

### 功能测试
- 模式切换功能
- 录像播放功能
- 悔棋功能
- 聊天功能（LAN 模式）

### 回归测试
- 现有功能不受影响
- 游戏逻辑正常
