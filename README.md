# 五子棋 Web 游戏

基于 React + TypeScript + Vite 构建的现代五子棋 Web 游戏，支持双人对战、AI 对战、悔棋、录像回放，以及可切换的背景音乐和音效系统。

## 功能特性

- **15x15 标准棋盘**：完整五子棋棋盘，支持最后一手和获胜连线高亮。
- **双人对战**：本地双人轮流落子，黑棋先手。
- **AI 对战**：提供简单、中等、困难三档 AI。
- **胜负判断**：检测横向、纵向、左斜、右斜四个方向的五子连线。
- **悔棋功能**：对局中可撤回最近落子。
- **录像回放**：对局结束后保存录像，可播放、暂停、单步前进/后退、跳到开头/结尾和调节速度。
- **录像列表**：历史对局保存在 localStorage，可从列表中选择回放。
- **背景音乐**：内置合成 BGM 和 5 首 SoundHelix 远程预设曲目。
- **自定义音频**：支持选择本地音频文件作为背景音乐。
- **音效系统**：落子、胜利、平局、AI 思考、UI 点击均有独立音效。
- **浏览器音频兼容**：用户交互后恢复 AudioContext，远程 MP3 使用 HTMLAudioElement 播放以避开 CORS 解码限制。

## 背景音乐预设

| 曲目 | 来源 |
| --- | --- |
| 宁静森林 | `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3` |
| 古典时光 | `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3` |
| 东方禅意 | `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3` |
| 暮光之城 | `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3` |
| 夏日午后 | `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3` |

## 技术栈

| 技术 | 说明 |
| --- | --- |
| React 19 | 前端 UI 框架 |
| TypeScript | 类型安全 |
| Vite | 开发服务器和构建工具 |
| Vitest | 单元测试 |
| Web Audio API | 合成 BGM 和音效 |
| HTMLAudioElement | 远程 MP3 背景音乐播放 |

## 项目结构

```text
src/
├─ game/                 # 游戏核心逻辑、AI 和 reducer
├─ replay/               # 录像回放引擎、Hook 和 localStorage 存储
├─ audio/                # BGM、SFX、AudioProvider 和音频控制类型
├─ components/           # 棋盘、状态、音频面板、回放控制栏等 React 组件
├─ test/                 # 测试配置
├─ App.tsx
├─ App.css
└─ index.css
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

默认访问 `http://localhost:5173`。

### 运行测试

```bash
npm run test:run
```

### 构建生产版本

```bash
npm run build
```

## 音频系统说明

音频系统由 `BGMManager`、`AudioProvider` 和 `useAudio` 统一调度。

- 合成 BGM 使用 Web Audio API 实时生成。
- 远程预设 MP3 使用 `HTMLAudioElement` 加载和循环播放，避免第三方站点缺少 CORS 响应头时 `fetch + decodeAudioData` 失败。
- 本地自定义音频继续使用 Web Audio 解码播放，并管理 blob URL 生命周期。
- 切换曲目、加载失败、静音和音量调整都会同步到 UI 状态。

## 测试覆盖

当前测试覆盖游戏逻辑、AI、回放引擎、音频管理器、音频面板和主要游戏 UI。

已验证：

- `npm run test:run`：78 个测试通过
- `npm run build`：生产构建通过

## License

MIT
