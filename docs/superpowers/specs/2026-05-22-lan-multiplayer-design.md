# 五子棋局域网对战功能设计

## 概述

为现有五子棋游戏新增局域网（LAN）对战模式，两名玩家通过局域网在不同设备上实时对弈。

**架构决策**: 客户端权威 + 服务端转发。局域网熟人场景下作弊风险低，落子零延迟体验优先，服务端只做消息中继和断线重连支持。

**技术栈**: Node.js + Socket.IO，monorepo 结构（`server/` 目录放服务端代码）。

## 项目结构

```
gomoku-game/
  src/                          # 现有前端代码
    network/                    # 新增：前端网络层
      networkManager.ts         # Socket.IO 客户端封装
      useNetworkGame.ts         # 网络对局 Hook
      types.ts                  # 网络消息类型
    components/                 # 新增 UI 组件
      Lobby.tsx                 # 大厅/房间 UI
      ChatPanel.tsx             # 快捷聊天面板
      NetworkStatus.tsx         # 连接状态指示
  server/                       # 新增：服务端
    index.js                    # 服务端入口
    roomManager.js              # 房间管理逻辑
```

## 通信协议

### 房间生命周期

| 阶段 | 客户端 | 服务端 |
|------|--------|--------|
| 创建 | `emit('create-room')` | 生成6位房间号 → `callback({roomId})` |
| 加入 | `emit('join-room', {roomId})` | 校验房间存在+未满 → `callback({success, role:'white'})` |
| 开始 | — | `io.to(roomId).emit('game-start', {blackId, whiteId})` |
| 离开 | `emit('leave-room')` 或断开 | `io.to(roomId).emit('opponent-left')` |

房间号格式：6位大写字母+数字组合（如 `A3F7K2`）。

### 对局消息

所有对局消息由服务端转发给房间内对方，服务端不做校验。

| 事件 | 数据 | 说明 |
|------|------|------|
| `move` | `{row, col}` | 落子通知 |
| `request-undo` | `{}` | 请求悔棋 |
| `respond-undo` | `{accepted: boolean}` | 悔棋响应 |
| `chat` | `{message: string}` | 快捷聊天 |
| `resign` | `{}` | 认输 |

### 断线重连

1. 客户端断线 → 服务端 `emit('opponent-disconnected')` 通知对方
2. 对方 UI 显示"等待对方重连..."倒计时（60秒）
3. 客户端重连 → `emit('reconnect', {roomId})`
4. 服务端校验房间+身份 → `emit('reconnect-success', {gameState})`
5. 服务端 `emit('opponent-reconnected')` 通知对方
6. 60秒内未重连 → 判断线方负 → `emit('opponent-timeout')`

重连时 `gameState` 包含完整棋盘和走子历史，客户端用此恢复状态。

### 服务端房间状态

服务端仅维护断线重连所需的最小状态：

```js
Room {
  roomId: string,           // 6位房间号
  blackId: socketId,        // 黑方 socket ID
  whiteId: socketId,        // 白方 socket ID
  moves: MoveRecord[],      // 所有走子记录（转发时追加）
  status: string,           // 'waiting' | 'playing' | 'finished'
  disconnectedAt: number | null
}
```

## 前端设计

### 模式扩展

- `GameMode` 新增 `'lan'`：`'pvp' | 'ai' | 'lan'`
- `GameState` 新增 `lanState` 字段：

```ts
lanState?: {
  myColor: 'black' | 'white'   // 我的棋色
  roomId: string                // 房间号
  opponentConnected: boolean    // 对手在线
  undoRequested: boolean        // 对方请求悔棋
}
```

### gameReducer 新增 Action

```ts
| { type: 'SET_LAN_STATE', lanState: Partial<LanState> }
| { type: 'OPPONENT_UNDO_REQUEST' }
| { type: 'OPPONENT_MOVE', row: number, col: number }
| { type: 'OPPONENT_LEFT' }
```

### 落子权限控制

| 模式 | 点击条件 |
|------|----------|
| PvP | 任意回合都可点击 |
| AI | `currentPlayer !== 'black'` 时禁用（现有逻辑） |
| LAN | `currentPlayer !== myColor` 时禁用 |

### useNetworkGame Hook

封装所有 Socket.IO 交互，接收 `dispatch` 参数，监听对方事件后 dispatch 对应 action：

```ts
function useNetworkGame(dispatch) {
  // 连接管理
  connect(serverUrl): void
  disconnect(): void
  // 房间操作
  createRoom(): Promise<roomId>
  joinRoom(roomId): Promise<role>
  leaveRoom(): void
  // 对局操作
  sendMove(row, col): void
  requestUndo(): void
  respondUndo(accepted): void
  sendChat(message): void
  resign(): void
}
```

### UI 组件

**ModeSelect 扩展**：新增"局域网对战"按钮。

**Lobby 组件**：左右分栏布局：
- 左侧"创建房间"：点击创建 → 显示6位房间号 + 复制按钮 + 等待对手提示
- 右侧"加入房间"：输入6位房间号 → 点击加入

**NetworkStatus 组件**：棋盘上方状态栏，显示连接状态、房间号、对手在线、当前回合。断线时红色闪烁 + 倒计时。

**ChatPanel 组件**：
- 6个预设快捷消息按钮（好棋 / 请等一下 / 幸运的一步 / 让我想想 / 再来一局 / 我要走了）
- 聊天记录区
- 棋盘上气泡提示（3秒自动消失）

**对局工具栏**：悔棋 / 聊天 / 认输按钮。认输需二次确认弹窗。

### 悔棋流程

1. 点击"悔棋" → `emit('request-undo')` → 按钮变为"等待对方同意..."
2. 对方收到弹窗："对手请求悔棋" → 同意/拒绝
3. 同意 → 双方 gameReducer 执行 UNDO → 回退一步（与 PvP 模式一致，只撤回请求方的落子）
4. 拒绝 → 请求方收到"对方拒绝悔棋"提示

### 执子分配

房主（创建房间者）执黑（先手），加入者执白。

### 录像回放

完全复用现有 replay 系统：
- `GameRecord` 新增 `mode: 'lan'` 字段
- 对局结束后双方各自保存完整 moveHistory 到 localStorage
- 回放逻辑无需改动 replayEngine

## 启动方式

```bash
# 启动服务端（默认端口 3001）
npm run server

# 启动前端开发服务器
npm run dev

# 同时启动前后端
npm run dev:all
```

服务端启动时自动显示本机局域网 IP，方便分享给对方。
