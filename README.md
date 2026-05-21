# 五子棋 Web 游戏

基于 React + TypeScript + Vite 构建的现代化五子棋 Web 游戏，支持双人对战与 AI 对战，配备沉浸式多曲目音效系统。

## 功能特性

- **15×15 标准棋盘** — 完整五子棋棋盘，深色檀木主题
- **双人对战** — 单机双人对战，黑棋先手
- **AI 对战** — 三档难度（简单/中等/困难），基于评分算法的 AI 对手
- **智能胜负判断** — 横/纵/左斜/右斜四方向五子连线检测
- **多曲目背景音乐** — 4 首内置曲目（合成古风/山水/竹林/月下），支持自定义本地音频
- **BGM 淡入淡出** — 曲目切换时平滑过渡，自定义音频加载状态与错误回退
- **全功能音效系统** — 落子/胜利/平局/AI思考/UI点击音效
- **音频控制面板** — 浮动面板，曲目选择、静音切换、BGM/SFX 音量独立调节
- **浏览器 Autoplay 降级** — 自动处理浏览器音频播放限制
- **游戏保护** — 不可重复落子，获胜后禁止继续
- **五连高亮** — 获胜时高亮显示连线棋子
- **最后一手标记** — 高亮显示最近落子位置
- **重新开始** — 随时重置游戏

## 技术栈

| 技术 | 说明 |
|------|------|
| React 19 | 前端框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Vitest | 单元测试 |
| Web Audio API | 音效播放引擎 |

## 项目结构

```
src/
├── game/                      # 游戏核心逻辑（纯函数，无 React 依赖）
│   ├── types.ts              # 类型定义
│   ├── gameLogic.ts          # 落子、胜负判断
│   ├── gameReducer.ts        # 状态管理
│   ├── gameLogic.test.ts     # 单元测试
│   └── ai/                   # AI 对战引擎
│       ├── index.ts          # AI 入口
│       ├── aiEasy.ts         # 简单 AI
│       ├── aiMedium.ts       # 中等 AI
│       └── aiHard.ts         # 困难 AI
├── audio/                     # 音效系统
│   ├── types.ts              # 音频类型、BGMTrack 接口、曲目 ID 常量
│   ├── bgmTracks.ts          # 内置曲目定义与 localStorage 恢复工具
│   ├── bgmEngine.ts          # 合成 BGM 引擎（五声音阶旋律，Web Audio API）
│   ├── fileBGMEngine.ts      # 文件 BGM 引擎（MP3 解码播放，淡入淡出）
│   ├── bgmManager.ts         # BGM 管理器（统一调度、曲目切换、竞态防护）
│   ├── soundEffects.ts       # SFX 播放引擎（Web Audio API）
│   ├── AudioContext.tsx       # AudioProvider + Context
│   └── useAudio.ts           # 自定义 Hook
├── components/                # React UI 组件
│   ├── Cell.tsx              # 单个交叉点
│   ├── Board.tsx             # 棋盘组件
│   ├── Status.tsx            # 状态显示
│   ├── Game.tsx              # 游戏主容器
│   ├── ModeSelect.tsx        # 模式选择工具栏
│   ├── AudioPanel.tsx        # 音频控制浮动面板（曲目选择/音量/自定义音频）
│   └── AudioPanel.css        # 面板样式
├── App.tsx                   # 应用入口
├── App.css                   # 主样式
├── index.css                 # 全局样式与 CSS 变量
└── test/
    └── setup.ts              # 测试配置
public/
└── audio/                     # 内置 BGM 音频资源
    ├── shanshui.mp3           # 山水
    ├── zhulin.mp3             # 竹林
    ├── yuexia.mp3             # 月下
    └── LICENSES.md            # 音频授权说明
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看游戏。

### 运行测试

```bash
npm test
```

### 类型检查

```bash
npx tsc --noEmit
```

### 构建生产版本

```bash
npm run build
```

## 音效系统

音效系统采用 BGMManager + Context + useAudio Hook 架构，与游戏 reducer 完全解耦：

### 背景音乐（BGM）

- **多曲目选择** — 4 首内置曲目：合成古风旋律、山水、竹林、月下
- **双引擎架构** — 合成引擎（Web Audio API 振荡器实时合成）+ 文件引擎（MP3 解码播放）
- **淡入淡出** — 曲目切换、开始/停止时 0.5s 平滑过渡
- **自定义音频** — 支持加载本地音频文件（格式/大小校验，blob URL 生命周期管理）
- **错误回退** — 网络加载失败自动回退到合成 BGM，UI 显示错误提示
- **竞态防护** — 快速切换曲目时通过 requestId 机制丢弃过期异步结果
- **持久化** — 当前曲目和音量保存到 localStorage，刷新后恢复

### 音效（SFX）

- 通过 Web Audio API 播放，预加载到 AudioBuffer 缓存池
- BGM 与 SFX 音量独立控制，互不影响
- 自动处理浏览器 Autoplay 限制 — 首次用户交互后自动恢复播放

## 测试覆盖

66 个单元测试覆盖游戏核心逻辑与 UI 组件：

- 游戏逻辑：横向/纵向/左斜/右斜胜利判断、非法落子拒绝、获胜后禁止继续、重置
- AI 引擎：三档难度 AI 落子决策
- BGM 管理器：引擎切换、加载状态、网络失败回退、自定义文件验证、blob URL 清理
- 音频系统：SFX 预加载/播放/音量控制、AudioProvider 状态管理与持久化、AudioPanel 交互
- UI 组件：游戏仪表盘渲染、模式切换、AI 对战流程

## 游戏规则

1. **落子** — 点击棋盘空白交叉点放置棋子
2. **回合** — 黑棋先手，双方交替落子
3. **AI 对战** — 选择 AI 模式后，黑棋由玩家操控，白棋由 AI 自动落子
4. **胜利** — 横/竖/左斜/右斜方向形成五子连线获胜
5. **结束** — 产生获胜者后游戏结束，显示重新开始按钮

## 后续扩展

- [ ] 禁手规则（长连禁手，双三禁手等）
- [ ] 联机对战（WebSocket / WebRTC）
- [ ] 悔棋功能
- [ ] 棋谱回放
- [ ] 自定义主题
- [ ] BGM 曲目在线扩展

## License

MIT
