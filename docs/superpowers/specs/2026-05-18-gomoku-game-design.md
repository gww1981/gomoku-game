# 五子棋 Web 游戏设计文档

**日期：** 2026-05-18
**版本：** v1.0
**状态：** 已确认

---

## 1. 需求范围

### 1.1 功能需求

| 需求 | 描述 |
|------|------|
| 棋盘 | 15×15 标准棋盘 |
| 对战模式 | 单机双人对战 |
| 先手规则 | 黑棋先手 |
| 落子方式 | 点击交叉点落子 |
| 重复落子 | 已有棋子的位置不能重复落子 |
| 胜利条件 | 横/竖/左斜/右斜五子连线 |
| 结束规则 | 获胜后禁止继续落子 |
| 重新开始 | 支持重置游戏 |

### 1.2 非功能需求（本期不实现）

- 禁手规则
- 人机 AI
- 联机对战

---

## 2. 技术选型

### 2.1 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 测试框架 | Vitest + @testing-library/react |
| 样式方案 | CSS（原生，无框架） |

### 2.2 状态管理

使用 React useReducer 管理游戏状态，无需引入 Redux/Zustand 等外部状态库。

---

## 3. 目录架构

```
src/
├── game/                    # 游戏核心逻辑（纯 TypeScript，无 React 依赖）
│   ├── types.ts            # 类型定义
│   ├── gameLogic.ts        # 落子、胜负判断
│   ├── gameReducer.ts      # useReducer 的 reducer
│   └── gameLogic.test.ts   # 单元测试
├── components/             # React UI 组件
│   ├── Board.tsx          # 棋盘组件
│   ├── Cell.tsx           # 单个交叉点组件
│   ├── Status.tsx         # 回合/胜负状态显示
│   └── Game.tsx           # 游戏主容器
├── App.tsx
├── main.tsx
└── test/
    └── setup.ts           # Vitest 测试配置
```

---

## 4. 核心类型定义

### 4.1 类型文件 (src/game/types.ts)

```typescript
/** 玩家类型 */
export type Player = 'black' | 'white'

/** 棋盘类型：15×15 二维数组，null 表示无棋子 */
export type Board = (Player | null)[][]

/** 落子位置 */
export interface Position {
  row: number
  col: number
}

/** 游戏状态 */
export type GameStatus = 'playing' | 'won' | 'draw'

/** 游戏状态完整结构 */
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
}

/** 游戏动作类型 */
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
```

---

## 5. 游戏核心 API

### 5.1 src/game/gameLogic.ts

```typescript
/** 创建初始空棋盘 */
export function createEmptyBoard(): Board

/** 检查指定位置是否可以落子 */
export function canPlacePiece(board: Board, row: number, col: number): boolean

/** 检查是否获胜（检查四个方向） */
export function checkWin(board: Board, row: number, col: number, player: Player): boolean

/** 获取获胜的五子连线位置（用于高亮） */
export function getWinningLine(board: Board, row: number, col: number, player: Player): Position[] | null
```

### 5.2 src/game/gameReducer.ts

```typescript
/** 游戏状态 Reducer */
export function gameReducer(state: GameState, action: GameAction): GameState

/** 初始游戏状态 */
export function getInitialGameState(): GameState
```

---

## 6. 胜负判断算法

### 6.1 检查逻辑

以最新落子位置为中心，向四个方向检查：

1. **横向（row 固定）**
2. **纵向（col 固定）**
3. **左斜（row 和 col 同方向变化）**
4. **右斜（row 和 col 反方向变化）**

### 6.2 实现伪代码

```
对每个方向：
    向正方向统计连续相同棋子数
    向反方向统计连续相同棋子数
    如果 总数 >= 5，返回获胜
返回未获胜
```

---

## 7. 组件设计

### 7.1 Game.tsx（游戏主容器）

- 使用 useReducer 管理游戏状态
- 渲染 Status、Board 组件
- 处理重新开始按钮点击

### 7.2 Board.tsx（棋盘组件）

- 使用 CSS Grid 布局 15×15 网格
- 渲染 225 个 Cell 组件
- 接收 board、onCellClick 属性

### 7.3 Cell.tsx（交叉点组件）

- 渲染单个交叉点
- 显示黑棋/白棋/空
- 接收 onClick、piece 属性
- 处理 hover 效果（可选）

### 7.4 Status.tsx（状态显示）

- 显示当前回合："黑棋回合" / "白棋回合"
- 或显示胜负结果："黑棋获胜!" / "白棋获胜!"
- 接收 gameState 属性

---

## 8. UI 设计规范

### 8.1 视觉风格

**现代玻璃风格：**
- 渐变背景
- 细格线（1px 浅灰色）
- 纯色扁平棋子
- 半透明胜负覆盖层

### 8.2 颜色方案

| 元素 | 颜色 |
|------|------|
| 背景渐变 | #667eea → #764ba2 |
| 棋盘背景 | rgba(255,255,255,0.1) |
| 格线 | rgba(255,255,255,0.3) |
| 黑棋 | #1a1a1a |
| 白棋 | #ffffff |
| 文字 | #ffffff |

### 8.3 布局

```
+----------------------------------+
|          五子棋                  |
|                                  |
|    [状态显示：黑棋回合]          |
|                                  |
|    +--------------------+        |
|    |                    |        |
|    |    15×15 棋盘     |        |
|    |                    |        |
|    +--------------------+        |
|                                  |
|    [重新开始]                    |
+----------------------------------+
```

---

## 9. 测试策略

### 9.1 测试覆盖要求

**必须覆盖：**
1. 横向五子胜利判断
2. 纵向五子胜利判断
3. 左斜五子胜利判断
4. 右斜五子胜利判断
5. 非五子（不足五子）不获胜
6. 非法落子（已有棋子位置）拒绝
7. 重复落子测试
8. 重置游戏恢复初始状态
9. 获胜后禁止继续落子

### 9.2 测试文件

- `src/game/gameLogic.test.ts`：测试 gameLogic 纯函数
- 使用 Vitest + @testing-library/react

---

## 10. 版本计划

### v1.0（本期实现）

- 15×15 棋盘
- 双人对战
- 五子胜利判断
- 重新开始

### v2.0（后续扩展）

- 禁手规则
- 人机 AI
- 联机对战

---

## 11. 确认决策

| 决策点 | 选择 |
|--------|------|
| UI 风格 | 现代玻璃风格 |
| 格线样式 | 细实线（1px） |
| 棋子样式 | 纯色扁平 |
| 胜负提示 | 居中文字 + 遮罩 |
| 回合指示 | 文字提示 |
