# FunClip 预览与导出功能说明

## 新增功能概览

本次更新为 FunClip 添加了以下核心功能：

### 1. 快速预览与在线调节界面
- **实时视频预览**: 裁剪后即时查看视频效果
- **详细视频信息**: 显示分辨率、时长、帧率、文件大小等
- **一键刷新**: 支持手动和自动刷新预览

### 2. 一键导出（多分辨率、平台格式适配）
- **多分辨率支持**: 4K, 2K, 1080p, 720p, 480p, 360p
- **智能平台适配**: 针对不同平台优化输出参数
  - 通用/Universal
  - 抖音/Douyin 
  - B站/Bilibili
  - YouTube
  - 微信/WeChat (带文件大小限制)
  - 高质量/High Quality (60fps)
- **批量导出**: 一次性导出多个分辨率和平台版本

### 3. 高级自定义设置
- 自定义分辨率（宽度/高度）
- 自定义比特率
- 自定义帧率
- 灵活的输出路径配置

---

## 新增文件

### 1. `funclip/utils/export_manager.py`
**视频导出管理器**
- `ExportManager` 类: 处理视频导出、格式转换、平台适配
- `VideoPreviewManager` 类: 管理视频预览和信息获取
- 预设配置: 分辨率和平台参数

### 2. `funclip/utils/preview_components.py`
**Gradio UI 组件**
- `PreviewAndExportUI` 类: 预览和导出的UI逻辑
- `create_integrated_preview_export_ui()`: 创建集成界面的工厂函数
- 处理预览刷新、单个导出、批量导出的回调函数

### 3. `test_preview_export.py`
**功能测试脚本**
- 模块导入测试
- 导出管理器测试
- 预览组件测试
- 集成测试

---

## 修改的文件

### 1. `funclip/launch.py`
**主界面集成**
```python
# 添加导入
from utils.preview_components import create_integrated_preview_export_ui

# 添加新的Tab
preview_export_components = create_integrated_preview_export_ui()

# 绑定回调函数
- 刷新预览按钮
- 自动预览更新
- 导出按钮
- 批量导出按钮
```

### 2. `funclip/videoclipper.py`
**添加导出方法**
```python
# 添加导入
from utils.export_manager import ExportManager, VideoPreviewManager

# 在 __init__ 中初始化
self.export_manager = ExportManager()
self.preview_manager = VideoPreviewManager()

# 新增方法
- export_video_with_preset()
- batch_export_video()
- get_video_preview_info()
```
