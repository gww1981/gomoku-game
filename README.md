# 五子棋 Web 游戏

基于 React + TypeScript + Vite 构建的现代五子棋 Web 游戏，支持双人对战、AI 对战、局域网联机对战、悔棋、落子超时判负、录像回放，以及可切换的背景音乐和音效系统。

## 功能特性

- **15x15 标准棋盘**：完整五子棋棋盘，支持最后一手和获胜连线高亮。
- **双人对战**：本地双人轮流落子，黑棋先手。
- **AI 对战**：提供简单、中等、困难三档 AI。
- **局域网对战**：基于 Socket.IO 的房间制联机，6 位房间号匹配，支持悔棋协商、认输、断线 60 秒重连和快捷聊天气泡。
- **落子超时判负**：LAN 模式下每步限时 30 秒，超时自动判负并弹出确认对话框，双方确认后可直接重置棋盘开始新一局。
- **对手离开检测**：对手主动离开房间时自动判留在方获胜，避免卡死在无效对局中。
- **胜负判断**：检测横向、纵向、左斜、右斜四个方向的五子连线。
- **悔棋功能**：对局中可撤回最近落子；LAN 模式下需对方同意。
- **录像回放**：对局结束后保存录像，可播放、暂停、单步前进/后退、跳到开头/结尾和调节速度。
- **录像列表**：历史对局保存在 localStorage，可从列表中选择回放。
- **背景音乐**：内置合成 BGM、3 首本地原创五声音阶曲目和 5 首 SoundHelix 远程预设曲目。
- **自定义音频**：支持选择本地音频文件作为背景音乐。
- **音效系统**：落子、胜利、平局、AI 思考、UI 点击均有独立音效。
- **浏览器音频兼容**：用户交互后恢复 AudioContext，远程 MP3 使用 HTMLAudioElement 播放以避开 CORS 解码限制。

## 背景音乐预设

| 曲目 | 来源 |
| --- | --- |
| 古韵合成 | Web Audio API 实时合成 |
| 山水清音 | 本地原创五声音阶生成 (`public/audio/shanshui.mp3`) |
| 竹林幽径 | 本地原创五声音阶生成 (`public/audio/zhulin.mp3`) |
| 月下棋声 | 本地原创五声音阶生成 (`public/audio/yuexia.mp3`) |
| 宁静森林 | SoundHelix 远程预设 |
| 古典时光 | SoundHelix 远程预设 |
| 东方禅意 | SoundHelix 远程预设 |
| 暮光之城 | SoundHelix 远程预设 |
| 夏日午后 | SoundHelix 远程预设 |

## 技术栈

| 技术 | 说明 |
| --- | --- |
| React 19 | 前端 UI 框架 |
| TypeScript | 类型安全 |
| Vite | 开发服务器和构建工具 |
| Vitest | 单元测试 |
| Express + Socket.IO | 局域网对战信令服务端 |
| Web Audio API | 合成 BGM 和音效 |
| HTMLAudioElement | 远程 MP3 背景音乐播放 |

## 项目结构

```text
src/
├─ game/                 # 游戏核心逻辑、AI 和 reducer
├─ replay/               # 录像回放引擎、Hook 和 localStorage 存储
├─ audio/                # BGM、SFX、AudioProvider 和音频控制类型
├─ network/              # Socket.IO 客户端封装与 useNetworkGame hook
├─ components/           # 棋盘、状态、大厅、聊天、音频面板、超时对话框等 React 组件
├─ test/                 # 测试配置
├─ App.tsx
├─ App.css
└─ index.css

server/
├─ index.js              # Socket.IO 信令服务入口
└─ roomManager.js        # 房间状态和断线重连管理
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

仅前端：

```bash
npm run dev
```

默认访问 `http://localhost:5173`。

前端 + 局域网服务端一起启动（局域网对战必备）：

```bash
npm run dev:all
```

服务端运行在 `http://localhost:3001`，启动时会在控制台输出本机局域网 IP，可分享给同一网络下的好友。

### 运行测试

```bash
npm run test:run
```

### 构建生产版本

```bash
npm run build
```

## 局域网对战

1. 双方设备处于同一局域网。
2. 启动 `npm run dev:all`，将控制台显示的 `http://<局域网IP>:5173` 分享给对方。
3. 选择「局域网对战」模式：
   - 房主点击「创建房间」→ 复制 6 位房间号给对方 → 等待加入。
   - 加入方输入房间号 → 加入即开始对局，房主执黑先手。
4. 对局中支持：悔棋请求/同意、认输、快捷聊天气泡、断线 60 秒内自动重连。
5. 每步落子限时 30 秒，超时自动判负。超时后弹出确认对话框，双方确认后即可重置棋盘开始新一局。

## 音频系统说明

音频系统由 `BGMManager`、`AudioProvider` 和 `useAudio` 统一调度。

- 合成 BGM 使用 Web Audio API 实时生成。
- 远程预设 MP3 使用 `HTMLAudioElement` 加载和循环播放，避免第三方站点缺少 CORS 响应头时 `fetch + decodeAudioData` 失败。
- 本地自定义音频继续使用 Web Audio 解码播放，并管理 blob URL 生命周期。
- 切换曲目、加载失败、静音和音量调整都会同步到 UI 状态。

## 测试覆盖

当前测试覆盖游戏逻辑、AI、回放引擎、音频管理器、音频面板、主要游戏 UI、LAN reducer、网络管理器与房间管理器。

已验证：

- `npm run test:run`：102 个测试通过
- `npm run build`：生产构建通过

## License

MIT
