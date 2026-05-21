# 五子棋录像回放功能设计

## 概述

为五子棋游戏添加录像回放功能。游戏结束后自动进入回放模式，支持播放/暂停、步进/步退、进度条拖拽、多档速度切换和步数标注。历史对局保存到 localStorage，最多 50 局，通过右侧抽屉列表浏览和回放。

## 架构：独立回放引擎

新建独立的 `ReplayEngine`（含自己的 reducer 和 state），与游戏引擎完全解耦。游戏结束后从 `moveHistory` 生成 `GameRecord` 导入回放引擎，`Game` 组件根据模式渲染不同 UI。

选择独立引擎的理由：职责清晰，游戏逻辑和回放逻辑互不干扰，易于测试和维护。

## 1. 数据结构

### MoveRecord - 单步落子记录

```typescript
interface MoveRecord {
  index: number               // 手数（从1开始）
  player: 'black' | 'white'
  position: { row: number; col: number }
  timestamp: number           // 距游戏开始的毫秒数
}
```

### GameRecord - 完整对局记录

```typescript
interface GameRecord {
  id: string                  // crypto.randomUUID()
  version: 1                  // 数据格式版本
  createdAt: string           // ISO 8601
  boardSize: 15
  gameMode: 'pvp' | 'ai'
  aiDifficulty?: 'easy' | 'medium' | 'hard'
  players: {
    black: { name: string; isAI: boolean }
    white: { name: string; isAI: boolean }
  }
  result: {
    winner: 'black' | 'white' | 'draw' | null
    winningCells?: Position[]
  }
  moves: MoveRecord[]
}
```

线性 `moves[]` 数组，不需要 SGF 的树形分支。`timestamp` 记录思考时间，支持真实节奏回放。225 手的五子棋约 2-3KB，localStorage 无压力。

## 2. 回放引擎

### ReplayState

```typescript
interface ReplayState {
  moves: MoveRecord[]           // 完整落子序列
  currentIndex: number          // 当前回放到第几手（-1 = 空棋盘）
  board: Board                  // 当前棋盘快照
  isPlaying: boolean            // 是否自动播放中
  speed: number                 // 毫秒/步（500/1000/2000/4000）
}
```

### ReplayAction

```typescript
type ReplayAction =
  | { type: 'LOAD_RECORD'; record: GameRecord }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACKWARD' }
  | { type: 'JUMP_TO_START' }
  | { type: 'JUMP_TO_END' }
  | { type: 'JUMP_TO'; index: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TICK' }            // 自动播放定时器触发
```

### 核心算法

| 操作 | 复杂度 | 实现 |
|------|--------|------|
| 前进一步 | O(1) | 在当前棋盘上放置一颗棋子 |
| 后退一步 | O(1) | 从当前棋盘上移除最后一颗棋子 |
| 跳转到第N步 | O(N) | 从空棋盘重放前N步（最多225步，毫秒级） |
| 自动播放 | O(1)/tick | useEffect + setInterval 驱动 TICK |

### 文件结构

```
src/replay/
  ├── types.ts          # MoveRecord, GameRecord, ReplayState, ReplayAction
  ├── replayEngine.ts   # 纯函数：forward, backward, jumpTo, replayReducer
  ├── replayEngine.test.ts
  └── useReplay.ts      # React Hook：封装 useReducer + 自动播放定时器
```

## 3. 游戏状态扩展（数据收集）

### GameState 扩展

```typescript
interface GameState {
  // ... 现有字段不变
  moveHistory: MoveRecord[]     // 新增：落子历史
  gameStartTime: number         // 新增：游戏开始时间戳（Date.now()）
}
```

### gameReducer 修改点

仅在 `MOVE` 和 `AI_MOVE` 的处理中追加记录：

```typescript
const moveRecord: MoveRecord = {
  index: state.moveHistory.length + 1,
  player: state.currentPlayer,
  position: { row, col },
  timestamp: Date.now() - state.gameStartTime,
}
// 加入新状态：
moveHistory: [...state.moveHistory, moveRecord]
```

`RESET` 和 `SET_MODE` 时清空 `moveHistory` 并重置 `gameStartTime`。

### 悔棋（UNDO）

新增 `UNDO` action，利用 `moveHistory` 实现悔棋：

```typescript
// gameReducer 新增 action
| { type: 'UNDO' }
```

**规则**：
- PvP 模式：回退一步（当前对手的最后一手）
- AI 模式：回退两步（AI 的一手 + 玩家的一手），确保悔棋后轮到玩家
- 游戏结束后（status !== 'playing'）不能悔棋
- 空棋盘（moveHistory 为空）时不能悔棋
- AI 思考中（isAIThinking）时不能悔棋

**实现逻辑**：

```typescript
case 'UNDO': {
  if (state.status !== 'playing' || state.moveHistory.length === 0 || state.isAIThinking) {
    return state
  }
  const stepsToUndo = state.settings.mode === 'ai' ? 2 : 1
  const actualSteps = Math.min(stepsToUndo, state.moveHistory.length)
  const newHistory = state.moveHistory.slice(0, -actualSteps)
  // 从空棋盘重放 newHistory 重建棋盘
  const newBoard = createEmptyBoard()
  let lastMove: Position | null = null
  for (const move of newHistory) {
    newBoard[move.position.row][move.position.col] = move.player
    lastMove = move.position
  }
  const currentPlayer = newHistory.length % 2 === 0 ? 'black' : 'white'
  return {
    ...state,
    board: newBoard,
    moveHistory: newHistory,
    currentPlayer,
    lastMove,
    winningCells: [],
  }
}
```

游戏结束时（`status` 变为 `'won'` 或 `'draw'`），从 `GameState` 生成完整的 `GameRecord` 并存入 localStorage。这一步在 `Game` 组件的 `useEffect` 中完成，不侵入 reducer。

影响范围：改 `types.ts`（加2个字段 + UNDO action 类型）和 `gameReducer.ts`（加 moveHistory 记录逻辑 + UNDO 处理），不改变任何现有行为。

## 4. UI 组件与交互

### 新增组件

```
src/components/
  ├── ReplayBar.tsx        # 回放控制栏（进度条 + 按钮 + 速度）
  ├── ReplayBar.css
  ├── GameRecordList.tsx   # 历史对局列表抽屉
  └── GameRecordList.css
```

### 组件层级

```
Game
  ├─ header（现有）
  ├─ board-stage
  │    └─ Board
  │         └─ Cell（回放模式接收 moveNumber 属性显示步数标注）
  ├─ footer
  │    ├─ Status（现有）
  │    ├─ UndoButton（游戏中显示，PvP回退1步/AI回退2步）
  │    └─ ReplayBar（游戏结束后显示，替代"重新开始"按钮位置）
  ├─ GameRecordList（右侧抽屉，点击"📜 录像列表"按钮打开）
  └─ AudioPanel（现有，不受影响）
```

### 模式切换流程

```
游戏中 → 游戏结束 → 自动进入回放模式
                      ↓
              显示 ReplayBar + 步数标注
              隐藏落子交互（点击棋盘无效）
                      ↓
              点"再来一局" → 回到游戏模式（RESET）
              点"录像列表" → 打开抽屉 → 选对局 → 加载回放
```

### ReplayBar 交互细节

| 控件 | 行为 |
|------|------|
| 进度条 | 拖拽跳转到任意步，显示"第N手 / 共M手" |
| ⏮ | 跳到空棋盘（currentIndex = -1） |
| ⏪ | 后退一步 |
| ▶/⏸ | 切换自动播放 |
| ⏩ | 前进一步 |
| ⏭ | 跳到最后一手 |
| 速度选择 | 0.5x(2s) / 1x(1s) / 2x(0.5s) / 4x(0.25s) |

### 步数标注

回放模式下，每个 `Cell` 显示该位置棋子的落子序号（小字体叠在棋子中央）。当前步的棋子额外高亮（脉冲动画复用现有的 `winningCells` 动画样式）。

### 回放音效

回放前进时播放落子音效，到最后一步时播放胜利/平局音效。通过 `useReplay` hook 监听 `currentIndex` 变化触发。

## 5. localStorage 存储

### 存储结构

```typescript
const STORAGE_KEY = 'gomoku-game-records'
const MAX_RECORDS = 50
// Value: GameRecord[]（按 createdAt 降序）
```

### 操作

| 操作 | 实现 |
|------|------|
| 保存对局 | 游戏结束时追加到数组，超过50局时删除最旧的 |
| 读取列表 | 从 localStorage 读取并解析 |
| 删除单局 | 按id过滤后写回 |
| 清空全部 | 移除整个key |

### 数据流

```
游戏结束 → GameRecord 生成 → 追加到 localStorage → 列表自动刷新
打开抽屉 → 读取 localStorage → 渲染列表
点击对局 → 加载 GameRecord → replayReducer LOAD_RECORD
点删除   → 从 localStorage 移除 → 列表刷新
```

不做导出/导入文件功能，保持简单。

## 不在范围内

- SGF 导出/导入
- 变招分支
- 真实节奏回放（按思考时间间隔播放）
- 录像分享
