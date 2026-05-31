# gomoku-game 新手指南

基于 React + TypeScript + Vite 构建的现代五子棋 Web 游戏。

## 项目概览

**技术栈：** React 19 · TypeScript · Vite · Vitest · Express · Socket.IO · Web Audio API

**支持功能：** 双人对战 · AI 对战（简单/中等/困难）· 局域网联机对战 · 悔棋 · 落子超时判负 · 录像回放 · BGM / 音效

---

## 架构分层

```
入口层 (entry)
    └── src/main.tsx / App.tsx / index.html

UI 层 (ui)
    └── components/ — 棋盘、状态、大厅、聊天、音频面板等 React 组件

服务层 (service)
    └── game/ — 游戏核心逻辑、AI 算法
    └── audio/ — BGM 和音效引擎
    └── network/ — Socket.IO 客户端封装
    └── replay/ — 录像回放引擎

服务端层 (server)
    └── server/ — Express + Socket.IO 信令服务器

配置层 (config)
    └── tsconfig.json / vite.config.ts / vitest.config.ts / eslint.config.js

文档层 (documentation)
    └── docs/superpowers/ — 设计文档和实施计划
```

---

## 导览学习路径（12 步）

| 步骤 | 标题 | 核心文件 |
|------|------|----------|
| 1 | 项目概览 | README.md |
| 2 | 应用入口与根组件 | src/main.tsx, src/App.tsx |
| 3 | 游戏类型定义 | src/game/types.ts |
| 4 | 游戏核心逻辑 | src/game/gameLogic.ts |
| 5 | 游戏状态管理器 | src/game/gameReducer.ts |
| 6 | AI 三档难度 | src/game/ai/index.ts, aiEasy.ts, aiMedium.ts, aiHard.ts |
| 7 | 棋盘 UI 组件 | src/components/Board.tsx, Cell.tsx |
| 8 | 音频系统 | src/audio/AudioContext.tsx, bgmManager.ts, soundEffects.ts |
| 9 | 局域网网络对战 | src/network/networkManager.ts, useNetworkGame.ts, server/index.js |
| 10 | 录像回放系统 | src/replay/replayEngine.ts, useReplay.ts, storage.ts |
| 11 | 游戏主组件 | src/components/Game.tsx |
| 12 | 构建配置与测试 | vite.config.ts, vitest.config.ts, tsconfig.app.json |

---

## 关键概念

### 游戏状态机
`src/game/gameReducer.ts` 使用 Redux 模式管理游戏状态转换（落子、悔棋、AI 移动、超时判负）。

### AI 难度层级
- **aiEasy**：随机落子，fan-out 最低
- **aiMedium**：位置评估启发式算法
- **aiHard**：Minimax + Alpha-Beta 剪枝，搜索深度最大

### 音频系统
- `AudioContext.tsx` — 全局 Context 提供者
- `bgmManager.ts` — 协调合成引擎（bgmEngine.ts）和文件引擎（fileBGMEngine.ts）
- Web Audio API 用于实时合成，HTMLAudioElement 用于远程 MP3

### 局域网对战
- 客户端：`networkManager.ts`（Socket.IO 管理器）+ `useNetworkGame.ts`（React Hook）
- 服务端：`server/index.js`（Socket.IO 服务器）+ `roomManager.js`（房间状态管理）
- 落子超时计时 30 秒

### 录像回放
- `replayEngine.ts` — reducer 模式，支持时间旅行（时间跳转、步进、倍速播放）
- `storage.ts` — localStorage 持久化

---

## 文件地图

### 入口
| 文件 | 说明 |
|------|------|
| `src/main.tsx` | React 应用入口，挂载到 DOM |
| `src/App.tsx` | 根组件，渲染 Game 并提供 AudioProvider |
| `index.html` | HTML 入口文件 |

### 游戏核心
| 文件 | 说明 |
|------|------|
| `src/game/types.ts` | 核心类型定义（GameState、Player、Mode、Position 等），被 20 个文件依赖 |
| `src/game/gameLogic.ts` | 五子棋规则（createEmptyBoard、canPlacePiece、checkWin） |
| `src/game/gameReducer.ts` | 游戏状态 Reducer，处理所有 Action |
| `src/game/ai/index.ts` | AI 模块统一入口 |
| `src/game/ai/aiEasy.ts` | 简单 AI（随机） |
| `src/game/ai/aiMedium.ts` | 中等 AI（位置评估） |
| `src/game/ai/aiHard.ts` | 困难 AI（Minimax + Alpha-Beta 剪枝） |

### 网络层
| 文件 | 说明 |
|------|------|
| `src/network/networkManager.ts` | Socket.IO 封装，管理房间和信令 |
| `src/network/useNetworkGame.ts` | React Hook，封装网络游戏状态 |
| `src/network/types.ts` | 网络相关类型 |
| `server/index.js` | Socket.IO 服务器入口，含 startMoveTimer |
| `server/roomManager.js` | 房间状态管理（createRoomManager 工厂函数） |

### 音频
| 文件 | 说明 |
|------|------|
| `src/audio/AudioContext.tsx` | Context 提供者，分发音频状态 |
| `src/audio/bgmManager.ts` | BGM 管理器，协调合成/文件引擎 |
| `src/audio/bgmEngine.ts` | 合成 BGM 引擎（Web Audio API 双振荡器） |
| `src/audio/fileBGMEngine.ts` | 文件 BGM 引擎 |
| `src/audio/bgmTracks.ts` | 内置曲目列表（合成 + SoundHelix 远程） |
| `src/audio/soundEffects.ts` | 游戏音效（落子、胜利、平局等） |

### 录像回放
| 文件 | 说明 |
|------|------|
| `src/replay/replayEngine.ts` | 回放 Reducer（LOAD_RECORD、PLAY/PAUSE、STEP 等） |
| `src/replay/useReplay.ts` | 回放 Hook（自动播放逻辑） |
| `src/replay/storage.ts` | localStorage 持久化（loadGameRecords、saveGameRecord） |

### UI 组件
| 文件 | 说明 |
|------|------|
| `src/components/Game.tsx` | fan-out 最高的组件（24），集成所有子模块 |
| `src/components/Board.tsx` | 棋盘渲染（15x15） |
| `src/components/Cell.tsx` | 单个格子（落子序号、键盘支持） |
| `src/components/Lobby.tsx` | 房间创建/加入大厅 |
| `src/components/ChatPanel.tsx` | 聊天消息气泡 |
| `src/components/AudioPanel.tsx` | 音频控制面板 |
| `src/components/ReplayBar.tsx` | 录像回放控制条 |
| `src/components/GameRecordList.tsx` | 历史录像列表 |

---

## 复杂度热点（需谨慎）

| 文件 | 复杂度 | 说明 |
|------|--------|------|
| `src/components/Game.tsx` | complex | fan-out=24，集成最多模块 |
| `src/game/gameReducer.ts` | complex | 游戏状态机核心，Action 种类多 |
| `src/game/ai/aiHard.ts` | complex | Minimax + Alpha-Beta 剪枝，逻辑最深 |
| `src/game/ai/aiMedium.ts` | complex | 位置评估算法 |
| `src/game/gameLogic.test.ts` | complex | 测试覆盖最广 |
| `src/audio/AudioContext.tsx` | complex | Web Audio API 集成复杂 |
| `src/network/networkManager.ts` | complex | Socket.IO 封装，房间状态管理 |
| `src/network/useNetworkGame.ts` | complex | 网络状态 Hook，useReducer 状态机 |
| `server/roomManager.js` | complex | 房间状态、断线重连逻辑 |
| `src/replay/replayEngine.ts` | complex | 时间旅行 reducer |

---

## 快速开始

```bash
# 仅前端开发
npm run dev

# 前端 + 局域网服务端一起启动
npm run dev:all

# 运行测试
npm run test:run

# 生产构建
npm run build
```

服务端运行在 `http://localhost:3001`，启动时会在控制台输出本机局域网 IP。