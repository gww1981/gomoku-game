# 人机对战功能设计文档

**日期：** 2026-05-18
**版本：** v2.0
**状态：** 已确认

---

## 1. 需求概述

### 1.1 功能需求

| 需求 | 描述 |
|------|------|
| 模式选择 | 游戏开始前显示菜单：双人对战 / 人机对战（选难度） |
| 难度级别 | 三种难度：简单（随机）、中等（威胁评估）、困难（Minimax+Alpha-Beta），默认中难度 |
| AI 思考延迟 | AI 落子前等待 300-500ms，模拟思考过程 |
| AI 思考状态 | 显示"AI 正在思考..."状态提示 |
| 人机对战 | 玩家执黑棋先手，AI 执白棋后手 |

### 1.2 非功能需求

- AI 算法在主线程实现（不引入 Web Worker）
- 复用现有游戏逻辑和胜负判断
- 保持现有 UI 风格一致性

---

## 2. 技术方案

### 2.1 架构设计

采用**分层 AI 架构**，将 AI 算法独立到 `game/ai/` 目录：

```
src/
├── game/
│   ├── types.ts              # 扩展：增加 GameMode, AIDifficulty, GameSettings, isAIThinking
│   ├── gameReducer.ts        # 扩展：支持 AI 模式动作（SET_MODE, SET_AI_THINKING, AI_MOVE）
│   └── ai/
│       ├── types.ts          # AI 类型定义（PatternType, PATTERN_SCORES, AIDecision）
│       ├── aiEasy.ts         # 简单 AI：随机落子
│       ├── aiMedium.ts       # 中等 AI：威胁评估评分
│       ├── aiHard.ts         # 困难 AI：Minimax + Alpha-Beta 剪枝
│       └── index.ts          # AI 统一入口
├── components/
│   ├── ModeSelect.tsx        # 新增：模式选择菜单
│   ├── Status.tsx            # 扩展：支持 AI 思考状态显示
│   └── Game.tsx              # 扩展：支持人机对战逻辑
```

### 2.2 AI 算法设计

#### 简单 AI（随机落子）

从所有空位中随机选择一个位置落子。

**评分策略：** 无（纯随机）

#### 中等 AI（威胁评估）

对每个空位进行评分，综合考虑攻防两端：

**棋型评分表：**

| 棋型 | 分数 | 说明 |
|------|------|------|
| 五连 | 100000 | 最高优先级 |
| 四（活四） | 10000 | 直接获胜 |
| 四（眠四） | 8000 | 阻挡四 |
| 活三 | 5000 | 双向扩展 |
| 阻挡活三 | 1000 | 防守优先 |
| 活二 | 500 | 发展潜力 |
| 阻挡活二 | 100 | 中等防守 |
| 一 | 10 | 基础分数 |

**评分计算：**
1. 扫描四个方向（横、纵、左斜、右斜）
2. 对每个方向，统计连续相同棋子数和空端数
3. 确定棋型并累加分数
4. 同时评估对手的威胁（分数 × 0.9）
5. 中心位置附加加成

**候选选择：** 取前 5 个高分候选，随机选择（增加变化性）

#### 困难 AI（Minimax + Alpha-Beta）

使用博弈树搜索寻找最优落子：

**搜索深度：** 3 层

**剪枝策略：** Alpha-Beta 剪枝，减少搜索节点

**评估函数：**
- 活四：10000 分
- 眠四：5000 分
- 活三：1000 分
- 眠三：300 分
- 活二：100 分
- 眠二：20 分
- 五连：100000 分（直接获胜）

**候选位置优化：** 只考虑已有棋子周围 1 格范围内的空位，减少搜索空间

### 2.3 状态管理

扩展 `GameState` 类型：

```typescript
interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
  settings: GameSettings   // 新增
  isAIThinking: boolean    // 新增
}

interface GameSettings {
  mode: GameMode           // 'pvp' | 'ai'
  aiDifficulty: AIDifficulty  // 'easy' | 'medium' | 'hard'
}

type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
```

### 2.4 AI 落子流程

```
玩家落子（黑棋）
    ↓
状态更新，轮到白棋
    ↓
检测到 AI 模式 + 白棋回合
    ↓
设置 isAIThinking = true（显示"AI 正在思考..."）
    ↓
延迟 400ms
    ↓
调用 AI 算法获取落子位置
    ↓
派发 AI_MOVE 动作
    ↓
状态更新，轮到黑棋
```

---

## 3. 组件设计

### 3.1 ModeSelect.tsx（模式选择菜单）

**位置：** 游戏启动时显示

**功能：**
- 显示游戏标题
- 提供"双人对战"按钮
- 提供"人机对战"子菜单（三个难度按钮）
- 默认难度高亮显示

**Props：**
```typescript
interface ModeSelectProps {
  onSelect: (mode: GameMode, aiDifficulty?: AIDifficulty) => void
}
```

### 3.2 Status.tsx（状态显示扩展）

**新增状态：**

| 状态 | 显示内容 |
|------|----------|
| AI 思考中 | "AI 正在思考..."（带动画） |
| AI 回合 | "白棋 (AI) 回合" |

### 3.3 Game.tsx（游戏主容器扩展）

**新增逻辑：**
1. 模式选择前的条件渲染（ModeSelect vs 游戏界面）
2. AI 落子自动触发（useEffect 监听 currentPlayer 变化）
3. 人机模式下玩家只能落黑棋
4. 显示当前模式和难度徽章

---

## 4. UI 设计

### 4.1 模式选择界面

```
+----------------------------------+
|                                  |
|           五子棋                  |
|                                  |
|        [ 双人对战 ]              |
|                                  |
|         人机对战                  |
|    [简单] [中等] [困难]          |
|                                  |
+----------------------------------+
```

### 4.2 游戏界面（人机模式）

```
+----------------------------------+
|           五子棋                  |
|      [人机·中等]                  |  ← 模式徽章
|                                  |
|      [白棋 (AI) 回合]            |  ← 或 "AI 正在思考..."
|                                  |
|    +--------------------+        |
|    |                    |        |
|    |    15×15 棋盘     |        |
|    |                    |        |
|    +--------------------+        |
|                                  |
|       [ 重新开始 ]               |
+----------------------------------+
```

### 4.3 AI 思考动画

```css
.status.ai-thinking {
  color: #ffd700;  /* 金色提示 */
}

.thinking-dots {
  animation: pulse 1.5s infinite;
}
```

---

## 5. 测试策略

### 5.1 AI 单元测试

| 测试项 | 覆盖内容 |
|--------|----------|
| aiEasy | 空棋盘落子、部分填充棋盘、满棋盘 |
| aiMedium | 基础评分、威胁识别、防守选择 |
| aiHard | 基础搜索、必胜检测、Alpha-Beta 剪枝 |

### 5.2 集成测试

- AI 模式正确切换
- AI 落子延迟生效
- 思考状态正确显示
- 重新开始保持模式

---

## 6. 版本计划

### v2.0（本期实现）

- [x] 模式选择菜单
- [x] 简单 AI（随机）
- [x] 中等 AI（威胁评估）
- [x] 困难 AI（Minimax）
- [x] AI 思考延迟和状态显示

### 未来扩展

- 禁手规则
- AI 难度微调
- 悔棋功能
- 棋谱回放

---

## 7. 确认决策

| 决策点 | 选择 |
|--------|------|
| 难度级别 | 三种（简单/中等/困难），默认中等 |
| 模式入口 | 主页菜单 |
| AI 思考延迟 | 400ms |
| AI 状态提示 | 显示"AI 正在思考..." |
| 实现方式 | 主线程直接实现 |
| 中等 AI 策略 | 威胁评估 + 评分系统 |
| 困难 AI 策略 | Minimax + Alpha-Beta（深度3） |
