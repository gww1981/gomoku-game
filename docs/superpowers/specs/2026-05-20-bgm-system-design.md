# 五子棋背景音乐（BGM）系统设计

## 概述

为五子棋游戏添加多曲目背景音乐选择功能。用户可在4首内置曲目（含1首现有合成BGM + 3首网络免费古风音乐）和自定义本地音频文件之间切换。扩展现有 AudioPanel 浮动面板，新增曲目选择列表。使用统一 BGMManager 管理合成引擎和文件播放引擎。

## 数据模型

### 曲目类型

```typescript
interface BGMTrack {
  id: string;             // 'synthetic' | 'shanshui' | 'zhulin' | 'yuexia' | 'custom'
  name: string;           // 显示名称
  type: 'synthetic' | 'file';
  source?: string;        // type=file 时的音频 URL / objectURL
  emoji: string;          // 列表显示的图标
}
```

### 内置曲目

| ID | 名称 | 类型 | 来源 |
|----|------|------|------|
| synthetic | 古韵合成 | synthetic | 现有 Web Audio API 五声音阶 |
| shanshui | 山水清音 | file | public/audio/shanshui.mp3 |
| zhulin | 竹林幽径 | file | public/audio/zhulin.mp3 |
| yuexia | 月下棋声 | file | public/audio/yuexia.mp3 |

### 自定义曲目

- 自定义曲目 ID 固定为 `'custom'`
- 用户通过文件选择器选择本地音频文件
- 用 `URL.createObjectURL()` 生成临时 URL
- 单文件模式，选择新文件自动替换旧的（更新 customTrack.source）
- 页面刷新后丢失（浏览器安全限制），恢复时回退到 synthetic

### AudioState 扩展

```typescript
interface AudioState {
  bgmVolume: number;        // 0-1，默认 0.5
  sfxVolume: number;        // 0-1，默认 0.7
  muted: boolean;           // 默认 false
  currentTrackId: string;   // 新增：当前曲目 ID，默认 'synthetic'
  customTrack: BGMTrack | null;  // 新增：自定义本地文件曲目
  isTrackLoading: boolean;  // 新增：曲目加载中状态
}

interface AudioControls {
  toggleMute(): void;
  setBGMVolume(v: number): void;
  setSFXVolume(v: number): void;
  playSFX(name: SFXName): void;
  resumeBGM(): void;
  stopBGM(): void;
  switchTrack(trackId: string): void;     // 新增
  loadCustomFile(file: File): void;       // 新增
}
```

## 架构：BGMManager 统一管理器

### 接口

```typescript
interface BGMManager {
  start(audioCtx: AudioContext): void;
  stop(): void;
  switchTrack(trackId: string): void;
  setVolume(v: number): void;
  getAvailableTracks(): BGMTrack[];
  getCurrentTrack(): BGMTrack;
  loadCustomFile(file: File): void;
}
```

### 内部实现

- 持有两个引擎实例：`SyntheticBGMEngine`（封装现有 bgmEngine）和 `FileBGMEngine`（基于 AudioBufferSourceNode）
- `switchTrack` 根据曲目 type 选择对应引擎：stop 旧引擎 → 初始化新引擎 → start 新引擎
- `FileBGMEngine` 流程：`fetch` 加载 → `audioCtx.decodeAudioData()` 解码 → `AudioBufferSourceNode` 循环播放
- 所有曲目切换支持淡入淡出（0.5s 线性渐变），合成引擎也补上淡入淡出

### 文件预加载

- 3首网络音乐放在 `public/audio/` 目录
- 首次播放时按需加载，不阻塞页面初始化
- 加载中状态通过 `isTrackLoading` 通知 UI

## AudioProvider 改动

- 引入 BGMManager 实例替代直接使用 bgmEngine
- 保留现有的 resumeBGM/stopBGM 游戏状态联动逻辑（playing → resume，won/draw → stop）
- 新增 switchTrack / loadCustomFile 方法

## AudioPanel UI 扩展

- 在音量滑块区域下方新增「选择曲目」分区
- 紧凑列表式布局，每项显示 emoji + 曲目名
- 当前播放曲目高亮（金色背景 #c9a96e）
- 最后一项为「📁 选择本地文件...」，点击触发隐藏的 `<input type="file" accept="audio/*">`
- 加载中状态显示旋转指示器
- 面板高度自适应

## localStorage 持久化

- `bgm-track-id`：记住用户选择的曲目 ID
- `bgm-volume` / `sfx-volume` / `muted`：一并持久化现有音量设置
- 页面加载时从 localStorage 恢复，首次访问使用默认值
- 自定义本地文件无法持久化，恢复时回退到 synthetic

## 免费音乐资源

- 从 Pixabay Music、Free Music Archive 等平台搜索 "chinese traditional"、"guqin"、"zen meditation"
- 格式：MP3，单文件 < 3MB
- 许可证：CC0 或免费可商用
- 备选方案：Web Audio API 合成3种不同风格旋律（古筝拨弦、笛子长音、古琴泛音）

## 错误处理

- 网络音频加载失败 → 显示错误提示，自动回退到合成BGM
- 本地文件格式不支持 → 提示「不支持的音频格式」
- 文件过大（>20MB）→ 提示「文件过大，请选择较小的音频文件」
- AudioContext 被浏览器暂停 → 保持现有交互恢复逻辑

## 测试策略

- `bgmManager.test.ts`：曲目切换、引擎选择、淡入淡出、错误回退
- `AudioContext.test.tsx`：扩展测试 switchTrack / loadCustomFile
- `AudioPanel.test.tsx`：扩展测试曲目列表渲染、本地文件选择
