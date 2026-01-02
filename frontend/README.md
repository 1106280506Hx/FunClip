# VibeClip 前端

AI 智能视频剪辑工具 - 现代化 React 前端界面

## 🚀 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **路由**: React Router 6
- **图标**: Lucide React
- **动画**: Framer Motion

## 📦 安装

```bash
cd frontend
npm install
```

## 🛠️ 开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── components/      # React 组件
│   │   ├── editor/      # 编辑器相关组件
│   │   │   ├── AIDirectorPanel.tsx    # AI 导演控制台
│   │   │   ├── ExportModal.tsx        # 导出弹窗
│   │   │   ├── SemanticPanel.tsx      # 语义分析面板
│   │   │   ├── Timeline.tsx           # 时间轴组件
│   │   │   └── VideoPreview.tsx       # 视频预览
│   │   └── layout/      # 布局组件
│   │       ├── Header.tsx
│   │       └── Layout.tsx
│   ├── data/            # Mock 数据
│   │   └── mockData.ts
│   ├── pages/           # 页面组件
│   │   ├── Dashboard.tsx
│   │   └── Editor.tsx
│   ├── store/           # Zustand 状态管理
│   │   └── index.ts
│   ├── types/           # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/           # 工具函数
│   │   └── helpers.ts
│   ├── App.tsx          # 根组件
│   ├── main.tsx         # 入口文件
│   └── index.css        # 全局样式
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🎨 设计特点

### 深色模式
专业的深色主题设计，符合视频剪辑软件行业标准，减少视觉疲劳。

### 经典布局
- **左侧**: 语义分析面板（智能标签云、关键帧）
- **中间**: 视频预览窗口
- **右侧**: AI 导演控制台（情感、风格、音乐、指令）
- **底部**: 智能时间轴（多轨道、节拍标记、波形）

## 🧩 核心功能模块

### 1. Dashboard (首页/工作台)
- 拖拽上传区域
- 项目库卡片展示
- 素材库管理
- 处理状态显示

### 2. 语义分析面板
- 智能标签云（场景、物体、情绪等）
- 语义搜索功能
- 关键帧缩略图展示
- 标签筛选功能

### 3. AI 导演控制台
- **情感罗盘**: 可视化选择目标基调
- **风格模板**: Vlog、电影感、快节奏混剪等
- **音乐配置**: AI 生成 / 上传 / 音乐库
- **Prompt 输入**: 自然语言指令交互

### 4. 智能时间轴
- 多轨道展示（视频、音频、字幕）
- 波形可视化
- 黄色节拍标记 (Beat Markers)
- 自动吸附节奏点
- 缩放控制

### 5. 视频预览
- 实时预览窗口
- 播放控制
- 质量切换（720p/1080p/4K）
- 字幕叠加显示

### 6. 导出模块
- 多平台版本生成（抖音、B站、小红书、YouTube）
- 格式 / 分辨率 / 质量选择
- AI 质量检查报告
- 导出进度显示

## 🔧 配置说明

### 代理配置
开发环境下，API 请求会代理到后端服务：

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:7860',
      changeOrigin: true,
    },
  },
}
```

### 主题定制
主要颜色变量定义在 `tailwind.config.js`:

```javascript
colors: {
  dark: { /* 深色模式色阶 */ },
  accent: {
    primary: '#6366f1',    // 主色调 (Indigo)
    secondary: '#8b5cf6',  // 次色调 (Violet)
    // ...
  },
  beat: {
    marker: '#facc15',     // 节拍标记颜色
  }
}
```

## 📝 Mock 数据说明

当前版本使用 Mock 数据进行开发和演示，数据定义在 `src/data/mockData.ts`:

- `mockVideos`: 视频文件列表
- `mockTags`: 语义标签
- `mockKeyFrames`: 关键帧
- `mockSegments`: 视频片段
- `mockEmotions`: 情感配置
- `mockStyles`: 风格模板
- `mockBeatMarkers`: 节拍标记
- `mockSubtitles`: 字幕数据
- `mockTimelineTracks`: 时间轴轨道
- `mockQualityReport`: 质量报告

## 🔜 后续开发

- [ ] 集成真实后端 API
- [ ] Wavesurfer.js 音频波形渲染
- [ ] 视频播放器集成 (Video.js)
- [ ] 拖拽排序功能
- [ ] 快捷键支持
- [ ] 多语言国际化
- [ ] 响应式移动端适配

## 📄 License

MIT License
