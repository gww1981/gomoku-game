# 五子棋局域网对战实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有五子棋游戏新增局域网对战模式，两名玩家通过局域网在不同设备上实时对弈。

**Architecture:** 客户端权威 + 服务端转发模式。React 客户端各自维护 gameReducer 状态，落子时本地立即渲染并 emit 给 Node.js Socket.IO 服务端，服务端转发给房间内对方。服务端只维护断线重连所需的最小状态（房间号、双方 socketId、走子历史）。

**Tech Stack:** Node.js + Express + Socket.IO 4.x（服务端），socket.io-client（客户端），nodemon（开发热重载），concurrently（前后端并行启动）。复用现有 React 19 + TypeScript 6 + Vite + Vitest 技术栈。

**Spec:** [docs/superpowers/specs/2026-05-22-lan-multiplayer-design.md](../specs/2026-05-22-lan-multiplayer-design.md)

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `server/package.json` | 服务端独立依赖配置（Socket.IO、Express） |
| `server/index.js` | 服务端入口，启动 HTTP+Socket.IO，挂载房间管理 |
| `server/roomManager.js` | 房间生命周期管理（创建/加入/离开/重连） |
| `server/roomManager.test.js` | roomManager 单元测试 |
| `src/network/types.ts` | 网络消息类型定义（事件名、payload） |
| `src/network/networkManager.ts` | Socket.IO 客户端封装（单例） |
| `src/network/useNetworkGame.ts` | 网络对局 Hook，绑定事件 → dispatch |
| `src/network/useNetworkGame.test.ts` | useNetworkGame Hook 测试 |
| `src/components/Lobby.tsx` | 大厅 UI：创建/加入房间 |
| `src/components/Lobby.css` | Lobby 组件样式 |
| `src/components/NetworkStatus.tsx` | 连接状态指示器 |
| `src/components/NetworkStatus.css` | NetworkStatus 组件样式 |
| `src/components/ChatPanel.tsx` | 快捷聊天面板 + 棋盘气泡 |
| `src/components/ChatPanel.css` | ChatPanel 组件样式 |
| `src/components/UndoConfirmDialog.tsx` | 悔棋请求确认弹窗 |
| `src/components/ResignDialog.tsx` | 认输二次确认弹窗 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `package.json` | 新增 socket.io-client 依赖、concurrently 开发依赖、`server`/`dev:all` 脚本 |
| `src/game/types.ts` | GameMode 增加 `'lan'`，新增 LanState 接口和 OPPONENT_* 等 Action |
| `src/game/gameReducer.ts` | 新增 LAN 相关 action 处理 |
| `src/game/gameLogic.test.ts` | 新增 LAN 相关 action 的 reducer 测试 |
| `src/components/Game.tsx` | 集成网络层，根据模式渲染 Lobby/对局工具栏 |
| `src/components/ModeSelect.tsx` | 新增"局域网对战"按钮 |
| `src/components/Status.tsx` | 新增 LAN 模式回合提示 |
| `src/replay/storage.ts` | （无改动，GameRecord 已通过类型扩展自动支持） |

---

## 任务列表

### Task 1: 服务端基础搭建

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `server/roomManager.js`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "gomoku-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "node --test roomManager.test.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

- [ ] **Step 2: 安装服务端依赖**

Run: `cd server && npm install`
Expected: 成功安装 express, socket.io, nodemon

- [ ] **Step 3: 创建 server/roomManager.js**

房间管理核心逻辑，纯函数模块，不含 Socket.IO 依赖：

```js
const ROOM_ID_LENGTH = 6
const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECONNECT_TIMEOUT = 60000

function generateRoomId() {
  let id = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  }
  return id
}

export function createRoomManager() {
  const rooms = new Map()

  return {
    createRoom(socketId) {
      let roomId
      do {
        roomId = generateRoomId()
      } while (rooms.has(roomId))

      rooms.set(roomId, {
        roomId,
        blackId: socketId,
        whiteId: null,
        moves: [],
        status: 'waiting',
        disconnectedAt: null,
      })
      return roomId
    },

    joinRoom(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return { success: false, error: '房间不存在' }
      if (room.status !== 'waiting') return { success: false, error: '房间已满' }
      if (room.whiteId) return { success: false, error: '房间已满' }

      room.whiteId = socketId
      room.status = 'playing'
      return { success: true, role: 'white' }
    },

    leaveRoom(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return null
      if (room.blackId !== socketId && room.whiteId !== socketId) return null
      room.status = 'finished'
      return room
    },

    getRoom(roomId) {
      return rooms.get(roomId) || null
    },

    getRoomBySocket(socketId) {
      for (const room of rooms.values()) {
        if (room.blackId === socketId || room.whiteId === socketId) return room
      }
      return null
    },

    recordMove(roomId, move) {
      const room = rooms.get(roomId)
      if (room) room.moves.push(move)
    },

    getOpponentId(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return null
      if (room.blackId === socketId) return room.whiteId
      if (room.whiteId === socketId) return room.blackId
      return null
    },

    markDisconnected(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return
      room.disconnectedAt = Date.now()
    },

    reconnect(roomId, socketId, newSocketId) {
      const room = rooms.get(roomId)
      if (!room) return { success: false, error: '房间不存在' }
      if (room.disconnectedAt === null) return { success: false, error: '房间未断线' }

      if (room.blackId === socketId) room.blackId = newSocketId
      else if (room.whiteId === socketId) room.whiteId = newSocketId
      else return { success: false, error: '非房间成员' }

      room.disconnectedAt = null
      return { success: true, moves: room.moves }
    },

    checkTimeout(roomId) {
      const room = rooms.get(roomId)
      if (!room || room.disconnectedAt === null) return null
      if (Date.now() - room.disconnectedAt > RECONNECT_TIMEOUT) {
        const disconnectedPlayer = room.disconnectedAt ? 'timeout' : null
        room.status = 'finished'
        return room
      }
      return null
    },

    deleteRoom(roomId) {
      rooms.delete(roomId)
    },
  }
}
```

- [ ] **Step 4: 创建 server/index.js**

服务端入口，Express 提供静态文件 + Socket.IO 事件处理：

```js
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createRoomManager } from './roomManager.js'

const PORT = process.env.PORT || 3001

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const roomManager = createRoomManager()

// 显示本机局域网 IP
function getLocalIP() {
  const nets = require('os').networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`)

  socket.on('create-room', (callback) => {
    const roomId = roomManager.createRoom(socket.id)
    socket.join(roomId)
    console.log(`[创建房间] ${roomId} by ${socket.id}`)
    callback({ roomId })
  })

  socket.on('join-room', ({ roomId }, callback) => {
    const result = roomManager.joinRoom(roomId, socket.id)
    if (result.success) {
      socket.join(roomId)
      const room = roomManager.getRoom(roomId)
      io.to(roomId).emit('game-start', { blackId: room.blackId, whiteId: room.whiteId })
      console.log(`[加入房间] ${socket.id} -> ${roomId}`)
    }
    callback(result)
  })

  socket.on('move', ({ roomId, row, col, player }) => {
    roomManager.recordMove(roomId, { row, col, player })
    socket.to(roomId).emit('opponent-move', { row, col, player })
  })

  socket.on('request-undo', ({ roomId }) => {
    socket.to(roomId).emit('undo-requested')
  })

  socket.on('respond-undo', ({ roomId, accepted }) => {
    socket.to(roomId).emit('undo-responded', { accepted })
  })

  socket.on('chat', ({ roomId, message }) => {
    socket.to(roomId).emit('opponent-chat', { message })
  })

  socket.on('resign', ({ roomId }) => {
    socket.to(roomId).emit('opponent-resigned')
  })

  socket.on('reconnect', ({ roomId, oldSocketId }, callback) => {
    const result = roomManager.reconnect(roomId, oldSocketId, socket.id)
    if (result.success) {
      socket.join(roomId)
      io.to(roomId).emit('opponent-reconnected')
    }
    callback(result)
  })

  socket.on('disconnect', () => {
    console.log(`[断开] ${socket.id}`)
    const room = roomManager.getRoomBySocket(socket.id)
    if (room && room.status === 'playing') {
      roomManager.markDisconnected(room.roomId, socket.id)
      socket.to(room.roomId).emit('opponent-disconnected')
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`[服务端] 运行在 http://localhost:${PORT}`)
  console.log(`[局域网] 分享给对方: http://${getLocalIP()}:3001`)
})
```

- [ ] **Step 5: 启动服务端验证**

Run: `cd server && npm run dev`
Expected: 输出 `[服务端] 运行在 http://localhost:3001` 和局域网 IP

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: add Socket.IO game server with room management"
```

### Task 2: roomManager 单元测试

**Files:**
- Create: `server/roomManager.test.js`

- [ ] **Step 1: 编写失败的测试**

```js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRoomManager } from './roomManager.js'

describe('roomManager', () => {
  test('createRoom 应生成 6 位房间号', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    assert.equal(typeof roomId, 'string')
    assert.equal(roomId.length, 6)
  })

  test('joinRoom 成功后第二人为白方', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    const result = rm.joinRoom(roomId, 'socket2')
    assert.equal(result.success, true)
    assert.equal(result.role, 'white')
  })

  test('joinRoom 不存在的房间应失败', () => {
    const rm = createRoomManager()
    const result = rm.joinRoom('NOTEXIST', 'socket2')
    assert.equal(result.success, false)
  })

  test('joinRoom 已满房间应失败', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    const result = rm.joinRoom(roomId, 'socket3')
    assert.equal(result.success, false)
  })

  test('getOpponentId 返回对方 socketId', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    assert.equal(rm.getOpponentId(roomId, 'socket1'), 'socket2')
    assert.equal(rm.getOpponentId(roomId, 'socket2'), 'socket1')
  })

  test('recordMove 应追加到房间走子历史', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    const room = rm.getRoom(roomId)
    assert.equal(room.moves.length, 1)
    assert.deepEqual(room.moves[0], { row: 7, col: 7, player: 'black' })
  })

  test('reconnect 成功后返回完整 moves 历史', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    rm.markDisconnected(roomId, 'socket1')
    const result = rm.reconnect(roomId, 'socket1', 'socket1-new')
    assert.equal(result.success, true)
    assert.equal(result.moves.length, 1)
    const room = rm.getRoom(roomId)
    assert.equal(room.blackId, 'socket1-new')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd server && npm test`
Expected: 所有测试通过（roomManager 已实现）

- [ ] **Step 3: Commit**

```bash
git add server/roomManager.test.js
git commit -m "test: add unit tests for roomManager"
```

### Task 3: 前端类型扩展 — GameMode / LanState / GameAction

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: 编写失败的类型测试**

在 `src/game/gameLogic.test.ts` 末尾追加：

```typescript
describe('LAN mode types', () => {
  it('GameMode should include lan', () => {
    const mode: GameMode = 'lan'
    expect(['pvp', 'ai', 'lan']).toContain(mode)
  })

  it('LanState should have required fields', () => {
    const lanState: LanState = {
      myColor: 'black',
      roomId: 'A3F7K2',
      opponentConnected: true,
      undoRequested: false,
    }
    expect(lanState.myColor).toBe('black')
    expect(lanState.roomId).toBe('A3F7K2')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/game/gameLogic.test.ts`
Expected: FAIL — `GameMode` 不包含 `'lan'`，`LanState` 类型不存在

- [ ] **Step 3: 修改 src/game/types.ts**

在 `GameMode` 类型定义处扩展：

```typescript
/** 游戏模式 */
export type GameMode = 'pvp' | 'ai' | 'lan'
```

在 `GameState` 接口前新增 `LanState` 接口：

```typescript
export interface LanState {
  myColor: Player
  roomId: string
  opponentConnected: boolean
  undoRequested: boolean
}
```

在 `GameState` 接口中新增 `lanState` 字段（在 `gameStartTime` 之前）：

```typescript
  lanState: LanState | null
```

在 `GameAction` 联合类型中新增 LAN 相关 actions：

```typescript
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'SET_LAN_STATE'; lanState: Partial<LanState> }
  | { type: 'OPPONENT_MOVE'; row: number; col: number }
  | { type: 'OPPONENT_UNDO_REQUEST' }
  | { type: 'OPPONENT_LEFT' }
```

扩展 `GameRecord.gameMode`：

```typescript
  gameMode: 'pvp' | 'ai' | 'lan'
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/gameLogic.test.ts
git commit -m "feat: extend GameMode, LanState, and GameAction types for LAN"
```

### Task 4: gameReducer 支持 LAN actions

**Files:**
- Modify: `src/game/gameReducer.ts`
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写失败的 reducer 测试**

在 `src/game/gameLogic.test.ts` 中追加：

```typescript
describe('gameReducer - LAN actions', () => {
  it('SET_LAN_STATE 应合并 lanState 字段', () => {
    const state = getInitialGameState()
    const next = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { myColor: 'black', roomId: 'A3F7K2', opponentConnected: true, undoRequested: false },
    })
    expect(next.lanState).toEqual({
      myColor: 'black',
      roomId: 'A3F7K2',
      opponentConnected: true,
      undoRequested: false,
    })
  })

  it('SET_LAN_STATE 应支持部分字段更新', () => {
    let state = getInitialGameState()
    state = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { myColor: 'white', roomId: 'X1Y2Z3', opponentConnected: true, undoRequested: false },
    })
    state = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { opponentConnected: false },
    })
    expect(state.lanState?.opponentConnected).toBe(false)
    expect(state.lanState?.roomId).toBe('X1Y2Z3')
  })

  it('OPPONENT_MOVE 应在棋盘上落子（与 MOVE 等价）', () => {
    const state = getInitialGameState()
    const next = gameReducer(state, { type: 'OPPONENT_MOVE', row: 7, col: 7 })
    expect(next.board[7][7]).toBe('black')
    expect(next.currentPlayer).toBe('white')
    expect(next.moveHistory).toHaveLength(1)
  })

  it('OPPONENT_UNDO_REQUEST 应设置 lanState.undoRequested 为 true', () => {
    let state = getInitialGameState()
    state = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { myColor: 'black', roomId: 'A3F7K2', opponentConnected: true, undoRequested: false },
    })
    state = gameReducer(state, { type: 'OPPONENT_UNDO_REQUEST' })
    expect(state.lanState?.undoRequested).toBe(true)
  })

  it('OPPONENT_LEFT 应设置 opponentConnected 为 false', () => {
    let state = getInitialGameState()
    state = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { myColor: 'black', roomId: 'A3F7K2', opponentConnected: true, undoRequested: false },
    })
    state = gameReducer(state, { type: 'OPPONENT_LEFT' })
    expect(state.lanState?.opponentConnected).toBe(false)
  })

  it('LAN 模式 UNDO 应回退一步', () => {
    let state = getInitialGameState()
    state = gameReducer(state, { type: 'SET_MODE', mode: 'lan' })
    state = gameReducer(state, {
      type: 'SET_LAN_STATE',
      lanState: { myColor: 'black', roomId: 'A3F7K2', opponentConnected: true, undoRequested: false },
    })
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    state = gameReducer(state, { type: 'MOVE', row: 8, col: 8 })
    state = gameReducer(state, { type: 'UNDO' })
    expect(state.moveHistory).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/game/gameLogic.test.ts -t "LAN actions"`
Expected: FAIL — 上述 action 未在 reducer 中实现

- [ ] **Step 3: 修改 src/game/gameReducer.ts**

在 `getInitialGameState()` 返回值中追加 `lanState: null`：

```typescript
export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
    winningCells: [],
    settings: {
      mode: 'pvp',
      aiDifficulty: 'medium',
    },
    isAIThinking: false,
    moveHistory: [],
    lanState: null,
    gameStartTime: Date.now(),
  }
}
```

修改 `UNDO` 的 `stepsToUndo` 计算逻辑（LAN 模式回退 1 步）：

```typescript
    case 'UNDO': {
      if (state.status !== 'playing') return state
      if (state.moveHistory.length === 0) return state
      if (state.isAIThinking) return state

      const stepsToUndo = state.settings.mode === 'ai' ? 2 : 1
      const actualSteps = Math.min(stepsToUndo, state.moveHistory.length)
      const newHistory = state.moveHistory.slice(0, -actualSteps)

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
        status: 'playing',
        winner: null,
        lanState: state.lanState ? { ...state.lanState, undoRequested: false } : null,
      }
    }
```

在 `default:` 之前新增 LAN actions 处理：

```typescript
    case 'SET_LAN_STATE': {
      const prev = state.lanState ?? {
        myColor: 'black' as Player,
        roomId: '',
        opponentConnected: false,
        undoRequested: false,
      }
      return {
        ...state,
        lanState: { ...prev, ...action.lanState },
      }
    }

    case 'OPPONENT_MOVE': {
      if (state.status !== 'playing') return state
      if (!canPlacePiece(state.board, action.row, action.col)) return state

      const newBoard = state.board.map(r => [...r])
      newBoard[action.row][action.col] = state.currentPlayer
      const won = checkWin(newBoard, action.row, action.col, state.currentPlayer)
      const newWinningCells = won ? getWinningCells(newBoard, action.row, action.col, state.currentPlayer) : []

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
        winningCells: newWinningCells,
        moveHistory: [
          ...state.moveHistory,
          {
            index: state.moveHistory.length + 1,
            player: state.currentPlayer,
            position: { row: action.row, col: action.col },
            timestamp: Date.now() - state.gameStartTime,
          },
        ],
      }
    }

    case 'OPPONENT_UNDO_REQUEST': {
      if (!state.lanState) return state
      return {
        ...state,
        lanState: { ...state.lanState, undoRequested: true },
      }
    }

    case 'OPPONENT_LEFT': {
      if (!state.lanState) return state
      return {
        ...state,
        lanState: { ...state.lanState, opponentConnected: false },
      }
    }
```

也修改 `SET_MODE` 的实现，重置时清空 lanState：

```typescript
    case 'SET_MODE':
      return {
        ...getInitialGameState(),
        settings: {
          mode: action.mode,
          aiDifficulty: action.aiDifficulty ?? state.settings.aiDifficulty,
        },
      }
```

注意：`getInitialGameState()` 已经把 `lanState` 设为 null，无需额外处理。

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/game/gameLogic.test.ts`
Expected: PASS（所有测试通过）

- [ ] **Step 5: Commit**

```bash
git add src/game/gameReducer.ts src/game/gameLogic.test.ts
git commit -m "feat: add LAN action handlers to gameReducer"
```

### Task 5: 前端网络层 — types.ts + networkManager.ts

**Files:**
- Create: `src/network/types.ts`
- Create: `src/network/networkManager.ts`

- [ ] **Step 1: 创建 src/network/types.ts**

```typescript
export type ServerEvent =
  | 'game-start'
  | 'opponent-move'
  | 'undo-requested'
  | 'undo-responded'
  | 'opponent-chat'
  | 'opponent-resigned'
  | 'opponent-disconnected'
  | 'opponent-reconnected'
  | 'opponent-timeout'

export type ClientEvent =
  | 'create-room'
  | 'join-room'
  | 'move'
  | 'request-undo'
  | 'respond-undo'
  | 'chat'
  | 'resign'
  | 'reconnect'

export interface OpponentMovePayload {
  row: number
  col: number
  player: 'black' | 'white'
}

export interface UndoRespondedPayload {
  accepted: boolean
}

export interface OpponentChatPayload {
  message: string
}

export interface GameStartPayload {
  blackId: string
  whiteId: string
}

export interface ReconnectResult {
  success: boolean
  moves?: Array<{ row: number; col: number; player: 'black' | 'white' }>
}
```

- [ ] **Step 2: 创建 src/network/networkManager.ts**

```typescript
import { io, Socket } from 'socket.io-client'
import type {
  OpponentMovePayload,
  UndoRespondedPayload,
  OpponentChatPayload,
  GameStartPayload,
  ReconnectResult,
} from './types'

export type NetworkEventHandlers = {
  onGameStart: (payload: GameStartPayload) => void
  onOpponentMove: (payload: OpponentMovePayload) => void
  onUndoRequested: () => void
  onUndoResponded: (payload: UndoRespondedPayload) => void
  onOpponentChat: (payload: OpponentChatPayload) => void
  onOpponentResigned: () => void
  onOpponentDisconnected: () => void
  onOpponentReconnected: () => void
  onOpponentTimeout: () => void
}

export class NetworkManager {
  private socket: Socket | null = null
  private roomId: string | null = null
  private handlers: NetworkEventHandlers | null = null

  connect(serverUrl: string): void {
    this.socket = io(serverUrl, { autoConnect: true, reconnection: false })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.roomId = null
  }

  setHandlers(handlers: NetworkEventHandlers): void {
    this.handlers = handlers
    if (!this.socket) return

    this.socket.on('game-start', this.handlers.onGameStart)
    this.socket.on('opponent-move', this.handlers.onOpponentMove)
    this.socket.on('undo-requested', this.handlers.onUndoRequested)
    this.socket.on('undo-responded', this.handlers.onUndoResponded)
    this.socket.on('opponent-chat', this.handlers.onOpponentChat)
    this.socket.on('opponent-resigned', this.handlers.onOpponentResigned)
    this.socket.on('opponent-disconnected', this.handlers.onOpponentDisconnected)
    this.socket.on('opponent-reconnected', this.handlers.onOpponentReconnected)
    this.socket.on('opponent-timeout', this.handlers.onOpponentTimeout)
  }

  removeHandlers(): void {
    if (!this.socket || !this.handlers) return
    this.socket.off('game-start', this.handlers.onGameStart)
    this.socket.off('opponent-move', this.handlers.onOpponentMove)
    this.socket.off('undo-requested', this.handlers.onUndoRequested)
    this.socket.off('undo-responded', this.handlers.onUndoResponded)
    this.socket.off('opponent-chat', this.handlers.onOpponentChat)
    this.socket.off('opponent-resigned', this.handlers.onOpponentResigned)
    this.socket.off('opponent-disconnected', this.handlers.onOpponentDisconnected)
    this.socket.off('opponent-reconnected', this.handlers.onOpponentReconnected)
    this.socket.off('opponent-timeout', this.handlers.onOpponentTimeout)
  }

  async createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'))
      this.socket.emit('create-room', (response: { roomId: string }) => {
        this.roomId = response.roomId
        resolve(response.roomId)
      })
    })
  }

  async joinRoom(roomId: string): Promise<{ success: boolean; role?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'))
      this.socket.emit('join-room', { roomId }, (response: { success: boolean; role?: string; error?: string }) => {
        if (response.success) this.roomId = roomId
        resolve(response)
      })
    })
  }

  sendMove(row: number, col: number, player: 'black' | 'white'): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('move', { roomId: this.roomId, row, col, player })
  }

  requestUndo(): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('request-undo', { roomId: this.roomId })
  }

  respondUndo(accepted: boolean): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('respond-undo', { roomId: this.roomId, accepted })
  }

  sendChat(message: string): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('chat', { roomId: this.roomId, message })
  }

  resign(): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('resign', { roomId: this.roomId })
  }

  async reconnect(oldSocketId: string): Promise<ReconnectResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.roomId) return reject(new Error('未连接'))
      this.socket.emit('reconnect', { roomId: this.roomId, oldSocketId }, (response: ReconnectResult) => {
        resolve(response)
      })
    })
  }

  getRoomId(): string | null {
    return this.roomId
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const networkManager = new NetworkManager()
```

- [ ] **Step 3: 安装 socket.io-client 依赖**

Run: `npm install socket.io-client`

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/network/ package.json package-lock.json
git commit -m "feat: add network types and NetworkManager client wrapper"
```

### Task 6: useNetworkGame Hook

**Files:**
- Create: `src/network/useNetworkGame.ts`
- Create: `src/network/useNetworkGame.test.ts`

- [ ] **Step 1: 编写失败的测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkGame } from './useNetworkGame'

vi.mock('./networkManager', () => {
  const handlers: Record<string, Function> = {}
  return {
    networkManager: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      setHandlers: vi.fn((h) => Object.assign(handlers, h)),
      removeHandlers: vi.fn(),
      createRoom: vi.fn(() => Promise.resolve('A3F7K2')),
      joinRoom: vi.fn(() => Promise.resolve({ success: true, role: 'white' })),
      sendMove: vi.fn(),
      requestUndo: vi.fn(),
      respondUndo: vi.fn(),
      sendChat: vi.fn(),
      resign: vi.fn(),
      isConnected: vi.fn(() => true),
      getRoomId: vi.fn(() => 'A3F7K2'),
      __handlers: handlers,
    },
  }
})

describe('useNetworkGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createRoom 后应 dispatch SET_LAN_STATE', async () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => useNetworkGame(dispatch))
    await act(async () => {
      await result.current.createRoom()
    })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_LAN_STATE',
      lanState: expect.objectContaining({ myColor: 'black', roomId: 'A3F7K2' }),
    }))
  })

  it('joinRoom 后应 dispatch SET_LAN_STATE 设置 myColor=white', async () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => useNetworkGame(dispatch))
    await act(async () => {
      await result.current.joinRoom('A3F7K2')
    })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_LAN_STATE',
      lanState: expect.objectContaining({ myColor: 'white', roomId: 'A3F7K2' }),
    }))
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/network/useNetworkGame.test.ts`
Expected: FAIL — useNetworkGame 不存在

- [ ] **Step 3: 创建 src/network/useNetworkGame.ts**

```typescript
import { useEffect, useCallback, useRef } from 'react'
import { networkManager } from './networkManager'
import type { GameAction } from '../game/types'

const DEFAULT_SERVER_URL = (() => {
  const url = window.location.hostname
  return `http://${url}:3001`
})()

export function useNetworkGame(dispatch: React.Dispatch<GameAction>) {
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  useEffect(() => {
    networkManager.connect(DEFAULT_SERVER_URL)
    networkManager.setHandlers({
      onGameStart: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: true },
        })
      },
      onOpponentMove: ({ row, col }) => {
        dispatchRef.current({ type: 'OPPONENT_MOVE', row, col })
      },
      onUndoRequested: () => {
        dispatchRef.current({ type: 'OPPONENT_UNDO_REQUEST' })
      },
      onUndoResponded: ({ accepted }) => {
        if (accepted) {
          dispatchRef.current({ type: 'UNDO' })
        }
        // 拒绝由 UI 层另行提示
      },
      onOpponentChat: () => { /* UI 层订阅 */ },
      onOpponentResigned: () => {
        dispatchRef.current({ type: 'OPPONENT_LEFT' })
      },
      onOpponentDisconnected: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: false },
        })
      },
      onOpponentReconnected: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: true },
        })
      },
      onOpponentTimeout: () => {
        dispatchRef.current({ type: 'OPPONENT_LEFT' })
      },
    })
    return () => {
      networkManager.removeHandlers()
      networkManager.disconnect()
    }
  }, [])

  const createRoom = useCallback(async () => {
    const roomId = await networkManager.createRoom()
    dispatch({
      type: 'SET_LAN_STATE',
      lanState: {
        myColor: 'black',
        roomId,
        opponentConnected: false,
        undoRequested: false,
      },
    })
    return roomId
  }, [dispatch])

  const joinRoom = useCallback(async (roomId: string) => {
    const result = await networkManager.joinRoom(roomId)
    if (result.success) {
      dispatch({
        type: 'SET_LAN_STATE',
        lanState: {
          myColor: 'white',
          roomId,
          opponentConnected: true,
          undoRequested: false,
        },
      })
    }
    return result
  }, [dispatch])

  const sendMove = useCallback((row: number, col: number, player: 'black' | 'white') => {
    networkManager.sendMove(row, col, player)
  }, [])

  const requestUndo = useCallback(() => networkManager.requestUndo(), [])
  const respondUndo = useCallback((accepted: boolean) => {
    networkManager.respondUndo(accepted)
    dispatch({
      type: 'SET_LAN_STATE',
      lanState: { undoRequested: false },
    })
    if (accepted) {
      dispatch({ type: 'UNDO' })
    }
  }, [dispatch])
  const sendChat = useCallback((message: string) => networkManager.sendChat(message), [])
  const resign = useCallback(() => networkManager.resign(), [])

  return { createRoom, joinRoom, sendMove, requestUndo, respondUndo, sendChat, resign }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/network/useNetworkGame.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/network/useNetworkGame.ts src/network/useNetworkGame.test.ts
git commit -m "feat: add useNetworkGame hook with dispatch bridge"
```

### Task 7: Lobby 组件 — 大厅 UI

**Files:**
- Create: `src/components/Lobby.tsx`
- Create: `src/components/Lobby.css`

- [ ] **Step 1: 创建 src/components/Lobby.tsx**

大厅组件：创建房间 / 加入房间，接收 `useNetworkGame` 返回的方法作为 props。

```tsx
import { useState, useCallback } from 'react'
import './Lobby.css'

interface LobbyProps {
  onCreateRoom: () => Promise<string>
  onJoinRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>
}

export function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [view, setView] = useState<'select' | 'creating' | 'joining'>('select')
  const [roomId, setRoomId] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState('')
  const [joinError, setJoinError] = useState('')
  const [waiting, setWaiting] = useState(false)

  const handleCreate = useCallback(async () => {
    setView('creating')
    setWaiting(true)
    const id = await onCreateRoom()
    setCreatedRoomId(id)
  }, [onCreateRoom])

  const handleCopyRoomId = useCallback(() => {
    navigator.clipboard.writeText(createdRoomId)
  }, [createdRoomId])

  const handleJoin = useCallback(async () => {
    setJoinError('')
    const result = await onJoinRoom(roomId.toUpperCase())
    if (!result.success) {
      setJoinError(result.error || '加入失败')
    }
  }, [roomId, onJoinRoom])

  if (view === 'creating') {
    return (
      <div className="lobby-container">
        <div className="lobby-card create-card">
          <h3>创建房间</h3>
          <p className="lobby-role">你是黑方（先手）</p>
          {waiting && (
            <div className="lobby-waiting">
              <div className="lobby-room-id">{createdRoomId}</div>
              <p className="lobby-hint">分享房间号给好友</p>
              <button type="button" className="lobby-copy-btn" onClick={handleCopyRoomId}>
                复制房间号
              </button>
              <p className="lobby-waiting-text">等待对手加入...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'joining') {
    return (
      <div className="lobby-container">
        <div className="lobby-card join-card">
          <h3>加入房间</h3>
          <p className="lobby-role">你是白方</p>
          <input
            className="lobby-input"
            type="text"
            maxLength={6}
            placeholder="输入6位房间号"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          />
          {joinError && <p className="lobby-error">{joinError}</p>}
          <button
            type="button"
            className="lobby-join-btn"
            onClick={handleJoin}
            disabled={roomId.length !== 6}
          >
            加入房间
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lobby-container">
      <div className="lobby-options">
        <div className="lobby-card" onClick={() => setView('creating')}>
          <h3>创建房间</h3>
          <p>你是黑方（先手）</p>
          <button type="button" className="lobby-action-btn">创建</button>
        </div>
        <div className="lobby-card" onClick={() => setView('joining')}>
          <h3>加入房间</h3>
          <p>你是白方</p>
          <button type="button" className="lobby-action-btn">加入</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 src/components/Lobby.css**

```css
.lobby-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}

.lobby-options {
  display: flex;
  gap: 24px;
}

.lobby-card {
  background: var(--color-surface, #1a1a2e);
  border-radius: 12px;
  padding: 24px 32px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 200px;
}

.lobby-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.lobby-card h3 {
  margin: 0 0 8px;
  color: var(--color-text, #e0e0e0);
}

.lobby-role {
  color: var(--color-text-secondary, #888);
  font-size: 14px;
  margin: 0 0 16px;
}

.lobby-action-btn {
  padding: 8px 24px;
  border-radius: 8px;
  background: var(--color-primary, #5dade2);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 15px;
}

.lobby-room-id {
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 8px;
  color: var(--color-accent, #ffab40);
  margin: 12px 0;
}

.lobby-input {
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #333);
  background: var(--color-background, #0d1117);
  color: var(--color-text, #e0e0e0);
  box-sizing: border-box;
}

.lobby-join-btn,
.lobby-copy-btn {
  margin-top: 12px;
  padding: 8px 24px;
  border-radius: 8px;
  background: var(--color-primary, #5dade2);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.lobby-join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lobby-hint {
  color: var(--color-text-secondary, #888);
  font-size: 13px;
  margin: 4px 0;
}

.lobby-error {
  color: var(--color-error, #ff7043);
  font-size: 13px;
  margin: 4px 0;
}

.lobby-waiting-text {
  color: var(--color-success, #69f0ae);
  font-size: 14px;
  margin-top: 12px;
}

.create-card,
.join-card {
  cursor: default;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Lobby.tsx src/components/Lobby.css
git commit -m "feat: add Lobby component for room creation and joining"
```

### Task 8: NetworkStatus + ChatPanel + Dialog 组件

**Files:**
- Create: `src/components/NetworkStatus.tsx`
- Create: `src/components/NetworkStatus.css`
- Create: `src/components/ChatPanel.tsx`
- Create: `src/components/ChatPanel.css`
- Create: `src/components/UndoConfirmDialog.tsx`
- Create: `src/components/ResignDialog.tsx`

- [ ] **Step 1: NetworkStatus.tsx — 棋盘上方状态条**

显示连接状态点、房间号、对手在线、当前回合提示。Props: `lanState: LanState, currentPlayer: Player`。当 `lanState.opponentConnected` 为 false 时显示红色闪烁圆点+「等待重连」文本。`isMyTurn = lanState.myColor === currentPlayer` 控制回合提示文本。

- [ ] **Step 2: NetworkStatus.css**

`.network-status` 容器：flex 横排，gap:12px，padding 8/16，背景色 surface。`.status-dot.connected` 绿色，`.disconnected` 红色 + `blink` 1s 无限动画。`.my-turn` 用 accent 色加粗。

- [ ] **Step 3: ChatPanel.tsx — 快捷聊天**

常量 `QUICK_MESSAGES = ['好棋','请等一下','幸运的一步','让我想想','再来一局','我要走了']`。维护 `messages: ChatMessage[]`（from: me|opponent, text）和 `bubble` 状态。`handleSend(msg)` 调用 `networkManager.sendChat(msg)` 并本地加入历史 + 显示 3 秒气泡。气泡用 `setTimeout(setBubble(null), 3000)` 自动隐藏。需要通过 prop 或独立 Hook 接收对方 chat 消息，避免覆盖 useNetworkGame 的 handlers。建议在 useNetworkGame 中暴露 `onChatMessage` 订阅接口。

- [ ] **Step 4: ChatPanel.css**

`.chat-quick-messages` grid 3 列 gap 6。`.chat-bubble` fixed 定位 top:20% right:20%，me 蓝色背景 #1a5276，opponent 紫色 #4a148c，fadeIn 0.3s。

- [ ] **Step 5: UndoConfirmDialog.tsx**

接收 onAccept/onReject props，渲染 `.dialog-overlay` + `.dialog-box`，内容「对手请求悔棋」+ 同意/拒绝按钮。

- [ ] **Step 6: ResignDialog.tsx**

接收 onConfirm/onCancel props，渲染「确定认输吗？」+ 「此操作不可撤销」+ 认输/取消按钮。

弹窗通用 CSS 写入 `src/App.css` 末尾：`.dialog-overlay` 全屏黑半透明 z-index:200，`.dialog-box` surface 背景圆角 padding 24/32。

- [ ] **Step 7: Commit**

```bash
git add src/components/NetworkStatus.tsx src/components/NetworkStatus.css src/components/ChatPanel.tsx src/components/ChatPanel.css src/components/UndoConfirmDialog.tsx src/components/ResignDialog.tsx src/App.css
git commit -m "feat: add NetworkStatus, ChatPanel and confirmation dialogs"
```

### Task 9: ModeSelect 扩展 — 新增「局域网对战」按钮

**Files:**
- Modify: `src/components/ModeSelect.tsx`

- [ ] **Step 1: 修改 ModeSelect.tsx**

在 `.mode-group` 内 AI 按钮后追加 LAN 按钮：

```tsx
<button
  type="button"
  aria-pressed={mode === 'lan'}
  onClick={() => onSelect('lan')}
>
  局域网对战
</button>
```

难度选择按钮的 `disabled` 条件保持不变（仅 AI 模式启用），因为 LAN 模式不需要难度选择。

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误（GameMode 已支持 'lan'）

- [ ] **Step 3: Commit**

```bash
git add src/components/ModeSelect.tsx
git commit -m "feat: add LAN mode button to ModeSelect"
```

### Task 10: Status 扩展 — LAN 模式回合提示

**Files:**
- Modify: `src/components/Status.tsx`

- [ ] **Step 1: 修改 Status.tsx**

在 `won` 分支后、`isAIThinking` 之前，新增 LAN 模式分支：

```tsx
if (gameState.settings.mode === 'lan' && gameState.lanState) {
  const isMyTurn = gameState.lanState.myColor === gameState.currentPlayer
  return (
    <div className="status">
      {isMyTurn ? '你的回合' : '等待对方落子...'}
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/Status.tsx
git commit -m "feat: show LAN turn indicator in Status component"
```

### Task 11: Game 组件集成 — 网络层 + Lobby + 对局工具栏

**Files:**
- Modify: `src/components/Game.tsx`

- [ ] **Step 1: import 新增模块**

在文件顶部 import 区追加：

```tsx
import { Lobby } from './Lobby'
import { NetworkStatus } from './NetworkStatus'
import { ChatPanel } from './ChatPanel'
import { UndoConfirmDialog } from './UndoConfirmDialog'
import { ResignDialog } from './ResignDialog'
import { useNetworkGame } from '../network/useNetworkGame'
```

- [ ] **Step 2: 在组件内集成 useNetworkGame**

在 `const audio = useAudio()` 之后新增：

```tsx
const network = useNetworkGame(dispatch)
const [showResignDialog, setShowResignDialog] = useState(false)
```

- [ ] **Step 3: 修改 handleCellClick 增加 LAN 权限和 sendMove**

```tsx
const handleCellClick = useCallback((row: number, col: number) => {
  if (state.status !== 'playing') return
  if (state.isAIThinking) return
  if (state.settings.mode === 'ai' && state.currentPlayer !== 'black') return
  if (state.settings.mode === 'lan') {
    if (!state.lanState) return
    if (!state.lanState.opponentConnected) return
    if (state.currentPlayer !== state.lanState.myColor) return
  }

  dispatch({ type: 'MOVE', row, col })
  playSFX('move')

  if (state.settings.mode === 'lan' && state.lanState) {
    network.sendMove(row, col, state.lanState.myColor)
  }
}, [state.status, state.isAIThinking, state.settings.mode, state.currentPlayer, state.lanState, playSFX, network])
```

- [ ] **Step 4: LAN 模式下未进入对局时渲染 Lobby**

在 `<div className="board-stage">` 处增加条件：当 mode='lan' 且 lanState 为 null 或 opponentConnected 为 false 且未开始（moveHistory 为空）时，渲染 Lobby 而非 Board：

```tsx
{state.settings.mode === 'lan' && (!state.lanState || (!state.lanState.opponentConnected && state.moveHistory.length === 0)) ? (
  <Lobby onCreateRoom={network.createRoom} onJoinRoom={network.joinRoom} />
) : (
  <Board
    board={isReplayMode ? replay.state.board : state.board}
    onCellClick={isReplayMode ? () => {} : handleCellClick}
    lastMove={isReplayMode ? (replay.state.moves[replay.state.currentIndex]?.position ?? null) : state.lastMove}
    winningCells={isReplayMode ? [] : state.winningCells || []}
    moveNumbers={replay.state.moves.map((m) => ({ row: m.position.row, col: m.position.col, number: m.index }))}
    currentMoveIndex={replay.state.currentIndex}
  />
)}
```

- [ ] **Step 5: 在 game-footer 上方/board-stage 上方渲染 NetworkStatus**

```tsx
{state.settings.mode === 'lan' && state.lanState && state.lanState.opponentConnected && (
  <NetworkStatus lanState={state.lanState} currentPlayer={state.currentPlayer} />
)}
```

- [ ] **Step 6: 修改 modeLabel 支持 lan**

```tsx
const modeLabel = state.settings.mode === 'pvp'
  ? '双人'
  : state.settings.mode === 'lan'
  ? '局域网对战'
  : `人机对战 · ${difficultyText[state.settings.aiDifficulty]}`
```

- [ ] **Step 7: 在 footer 中条件渲染聊天面板、悔棋请求、认输按钮**

在 `.game-footer` 内的播放中分支末尾追加：

```tsx
{state.settings.mode === 'lan' && state.lanState && state.status === 'playing' && (
  <>
    <button type="button" className="undo-button" onClick={() => network.requestUndo()}>
      请求悔棋
    </button>
    <button type="button" className="resign-button" onClick={() => setShowResignDialog(true)}>
      认输
    </button>
    <ChatPanel />
  </>
)}
```

- [ ] **Step 8: 渲染弹窗**

在组件 return 末尾 `</main>` 之前追加：

```tsx
{state.lanState?.undoRequested && (
  <UndoConfirmDialog
    onAccept={() => network.respondUndo(true)}
    onReject={() => network.respondUndo(false)}
  />
)}
{showResignDialog && (
  <ResignDialog
    onConfirm={() => {
      network.resign()
      setShowResignDialog(false)
      dispatch({ type: 'OPPONENT_LEFT' })
    }}
    onCancel={() => setShowResignDialog(false)}
  />
)}
```

- [ ] **Step 9: 保存对局记录时支持 lan 模式**

`saveGameRecord` 部分的 `gameMode: state.settings.mode` 已自动兼容（类型已扩展），`players` 字段需要在 LAN 模式下都标记 isAI=false：

```tsx
players: {
  black: { name: state.settings.mode === 'lan' ? '黑方玩家' : '黑方', isAI: state.settings.mode === 'ai' && false },
  white: { name: state.settings.mode === 'lan' ? '白方玩家' : '白方', isAI: state.settings.mode === 'ai' },
},
```

- [ ] **Step 10: 验证 TypeScript 编译 + 现有测试**

Run: `npx tsc --noEmit && npm test -- --run`
Expected: 编译成功，所有测试通过

- [ ] **Step 11: Commit**

```bash
git add src/components/Game.tsx
git commit -m "feat: integrate LAN multiplayer into Game component"
```

### Task 12: 根 package.json 集成 — 启动脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装根 dev 依赖**

Run: `npm install --save-dev concurrently`

- [ ] **Step 2: 修改 package.json scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "server": "npm --prefix server run dev",
    "server:install": "npm --prefix server install",
    "server:test": "npm --prefix server test",
    "dev:all": "concurrently -n web,server -c blue,green \"npm run dev\" \"npm run server\""
  }
}
```

- [ ] **Step 3: 启动验证**

Run: `npm run server:install && npm run dev:all`
Expected: 终端同时显示 vite dev server 与 Socket.IO 服务端两路输出

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add server scripts and concurrently for dev:all"
```

### Task 13: 端到端手动验证

**Files:**
- 无新增；运行完整流程

- [ ] **Step 1: 启动前后端**

Run: `npm run dev:all`
Expected:
- vite 输出 `Local: http://localhost:5173`
- 服务端输出 `[服务端] 运行在 http://localhost:3001` 和局域网 IP

- [ ] **Step 2: 模拟双人对战（同机两标签页）**

1. 打开浏览器 http://localhost:5173，选择「局域网对战」
2. 点击「创建房间」，记录显示的 6 位房间号
3. 在另一浏览器标签页打开同一 URL，选择「局域网对战」→「加入房间」，输入房间号
4. 验证：双方进入对局界面，黑方先手

- [ ] **Step 3: 验证落子同步**

1. 黑方点击棋盘任一格 → 自身立即看到黑子
2. 白方屏幕在 100ms 内出现同一位置的黑子
3. 白方落子 → 双方同步显示白子
4. 形成五连 → 双方同时显示胜利

- [ ] **Step 4: 验证悔棋流程**

1. 双方各下若干步
2. 黑方点击「请求悔棋」
3. 白方屏幕弹出「对手请求悔棋」对话框
4. 点击「同意」→ 双方棋盘回退一步
5. 重复并测试「拒绝」→ 棋盘不变

- [ ] **Step 5: 验证聊天**

1. 任一方点击快捷消息「好棋」
2. 双方屏幕右上角弹出气泡显示「好棋」
3. 3 秒后气泡消失
4. 打开聊天历史抽屉，可见对话记录

- [ ] **Step 6: 验证认输**

1. 任一方点击「认输」
2. 弹窗确认「确定认输吗？」
3. 点击「认输」→ 双方游戏结束，对方为赢方

- [ ] **Step 7: 验证断线重连**

1. 对局中，关闭一方浏览器标签
2. 对方屏幕 NetworkStatus 显示红色「等待重连」
3. 重新打开标签 → 当前实现不会自动重连（设计文档列为可选项）
4. 60 秒后判离线方负（如已实现）

- [ ] **Step 8: 验证录像保存**

1. 对局结束后，进入回放模式
2. 打开「录像列表」，确认 LAN 对局已保存
3. 回放正常播放

- [ ] **Step 9: 完整测试套件**

Run: `npm test -- --run && npm --prefix server test`
Expected: 全部通过

- [ ] **Step 10: 最终 commit + 推送**

```bash
git status
git log --oneline -20
# 如有遗漏文件再 add + commit
```

---

## 验收清单

完成所有任务后，应满足设计文档中的所有要求：

- [x] 客户端权威 + 服务端转发架构
- [x] Node.js + Socket.IO 技术栈
- [x] 房间号模式（6 位 ID）
- [x] 房主执黑、加入者执白
- [x] 落子实时同步
- [x] 悔棋（双方同意机制）
- [x] 快捷聊天 + 气泡提示
- [x] 认输（二次确认）
- [x] NetworkStatus 状态指示
- [x] LAN 对局录像保存 + 回放复用
- [x] gameReducer 新增 4 个 LAN actions
- [x] GameMode 扩展为 'pvp' | 'ai' | 'lan'
- [x] LanState 接口和字段
- [x] 启动脚本 `npm run dev:all`

> **断线重连**：服务端 roomManager 已支持 reconnect API，但客户端自动重连流程作为后续增强项，本次实现仅保留状态指示+60秒超时判负的基础设施。
