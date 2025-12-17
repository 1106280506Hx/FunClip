#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Gradio预览和调节界面组件

import gradio as gr
import os
import time
from typing import Optional, Tuple, Dict, Any
from moviepy.editor import VideoFileClip
from .export_manager import ExportManager, VideoPreviewManager

class PreviewAndExportUI:
    """
    预览和导出UI组件
    """
    
    def __init__(self):
        self.export_manager = ExportManager()
        self.preview_manager = VideoPreviewManager()
    
    def create_preview_tab(self) -> Tuple:
        """
        创建预览和调节Tab
        
        返回:
            (preview_video, video_info_text, refresh_button)
        """
        with gr.Column():
            gr.Markdown("### 🎥 快速预览")
            preview_video = gr.Video(label="视频预览", interactive=False)
            video_info_text = gr.Textbox(
                label="📊 视频信息", 
                lines=6, 
                interactive=False
            )
            refresh_preview_btn = gr.Button("🔄 刷新预览", variant="secondary")
        
        return preview_video, video_info_text, refresh_preview_btn
    
    def create_export_tab(self) -> Dict[str, Any]:
        """
        创建导出Tab
        
        返回:
            包含所有导出UI组件的字典
        """
        components = {}
        
        with gr.Column():
            gr.Markdown("### 📤 一键导出")
            
            with gr.Row():
                # 分辨率选择
                components['resolution'] = gr.Dropdown(
                    choices=ExportManager.get_available_resolutions(),
                    value="原始/Original",
                    label="📐 输出分辨率",
                    info="选择目标分辨率"
                )
                
                # 平台选择
                components['platform'] = gr.Dropdown(
                    choices=ExportManager.get_available_platforms(),
                    value="通用/Universal",
                    label="🎯 平台适配",
                    info="选择目标平台"
                )
            
            # 高级设置 (可折叠)
            with gr.Accordion("⚙️ 高级设置", open=False):
                with gr.Row():
                    components['custom_width'] = gr.Number(
                        label="自定义宽度 (px)",
                        value=None,
                        precision=0
                    )
                    components['custom_height'] = gr.Number(
                        label="自定义高度 (px)",
                        value=None,
                        precision=0
                    )
                
                with gr.Row():
                    components['custom_bitrate'] = gr.Textbox(
                        label="自定义比特率 (如: 5000k)",
                        value=""
                    )
                    components['custom_fps'] = gr.Number(
                        label="自定义帧率",
                        value=None,
                        precision=0
                    )
            
            # 输出路径
            components['output_path'] = gr.Textbox(
                label="💾 输出路径 (留空则自动生成)",
                placeholder="/path/to/output.mp4",
                value=""
            )
            
            # 导出按钮
            with gr.Row():
                components['export_preview_btn'] = gr.Button(
                    "🔍 预览导出效果 (3秒)",
                    variant="secondary"
                )
                components['export_btn'] = gr.Button(
                    "🚀 导出视频", 
                    variant="primary",
                    size="lg"
                )
                components['batch_export_btn'] = gr.Button(
                    "📦 批量导出",
                    variant="secondary"
                )
            
            # 批量导出设置
            with gr.Accordion("📦 批量导出设置", open=False):
                components['batch_resolutions'] = gr.CheckboxGroup(
                    choices=ExportManager.get_available_resolutions()[1:],  # 排除"原始"
                    value=["1080p", "720p"],
                    label="选择分辨率"
                )
                components['batch_platforms'] = gr.CheckboxGroup(
                    choices=ExportManager.get_available_platforms(),
                    value=["通用/Universal"],
                    label="选择平台"
                )
                components['batch_output_dir'] = gr.Textbox(
                    label="批量输出目录",
                    value="./batch_export"
                )
            
            # 导出结果显示
            components['export_video_output'] = gr.Video(
                label="✅ 导出结果预览"
            )
            components['export_message'] = gr.Textbox(
                label="📋 导出日志",
                lines=8,
                interactive=False
            )
        
        return components
    
    def handle_preview_update(self, video_path: Optional[str]) -> Tuple[Optional[str], str]:
        """
        处理预览更新
        
        参数:
            video_path: 视频文件路径
        
        返回:
            (预览视频路径, 视频信息文本)
        """
        if not video_path or not os.path.exists(video_path):
            return None, "⚠️ 请先选择或生成视频"
        
        # 获取视频信息
        info = self.preview_manager.get_video_info(video_path)
        info_text = self.preview_manager.format_video_info(info)
        
        return video_path, info_text
    
    def handle_export(
        self,
        video_path: str,
        resolution: str,
        platform: str,
        output_path: str,
        custom_width: Optional[int],
        custom_height: Optional[int],
        custom_bitrate: str,
        custom_fps: Optional[int]
    ) -> Tuple[Optional[str], str, Optional[str], str]:
        """
        处理单个视频导出
        
        返回:
            (导出的视频路径, 日志消息)
        """
        if not video_path or not os.path.exists(video_path):
            return None, "❌ 请先选择或生成视频"
        
        # 生成输出路径，兼容用户填写目录或缺失扩展名的情况
        output_path = (output_path or "").strip()
        if not output_path:
            base_name = os.path.splitext(video_path)[0]
            platform_suffix = platform.split('/')[0]
            res_suffix = resolution.split('/')[0] if '/' in resolution else resolution
            output_path = f"{base_name}_export_{platform_suffix}_{res_suffix}.mp4"
        if os.path.isdir(output_path):
            base_name = os.path.splitext(os.path.basename(video_path))[0]
            platform_suffix = platform.split('/')[0]
            res_suffix = resolution.split('/')[0] if '/' in resolution else resolution
            output_path = os.path.join(output_path, f"{base_name}_export_{platform_suffix}_{res_suffix}.mp4")
        if not os.path.splitext(output_path)[1]:
            output_path = f"{output_path}.mp4"
        
        # 处理自定义参数
        custom_bitrate = custom_bitrate.strip() if custom_bitrate else None
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # 导出视频
        success, message = self.export_manager.export_video(
            video_path=video_path,
            output_path=output_path,
            resolution=resolution,
            platform=platform,
            custom_width=int(custom_width) if custom_width else None,
            custom_height=int(custom_height) if custom_height else None,
            custom_bitrate=custom_bitrate,
            custom_fps=int(custom_fps) if custom_fps else None
        )
        
        if success:
            info = self.preview_manager.get_video_info(output_path)
            info_text = self.preview_manager.format_video_info(info)
            return output_path, message, output_path, info_text
        else:
            return None, message, None, "❌ 导出失败"

    def handle_export_preview(
        self,
        video_path: str,
        resolution: str,
        platform: str,
        custom_width: Optional[int],
        custom_height: Optional[int],
        custom_bitrate: str,
        custom_fps: Optional[int],
        preview_seconds: int = 3
    ) -> Tuple[Optional[str], str, str]:
        """
        生成短预览片段（仅前3秒），用于在导出前查看效果
        返回: (预览视频路径, 视频信息文本, 日志)
        """
        if not video_path or not os.path.exists(video_path):
            return None, "❌ 请先选择或生成视频", "❌ 请先选择或生成视频"

        try:
            clip = VideoFileClip(video_path)
            duration = clip.duration
            sub_duration = min(duration, preview_seconds)
            clip = clip.subclip(0, sub_duration)

            # 解析目标分辨率
            original_width, original_height = clip.size
            if custom_width and custom_height:
                target_width, target_height = int(custom_width), int(custom_height)
            elif resolution != "原始/Original" and resolution in ExportManager.RESOLUTION_PRESETS:
                target_width, target_height = ExportManager.RESOLUTION_PRESETS[resolution]
                if original_width < target_width or original_height < target_height:
                    target_width, target_height = original_width, original_height
            else:
                target_width, target_height = original_width, original_height

            if (target_width, target_height) != (original_width, original_height):
                clip = clip.resize((target_width, target_height))

            # 生成预览文件路径
            preview_path = os.path.join(
                "/tmp",
                f"funclip_export_preview_{int(time.time())}.mp4"
            )

            # 轻量编码，降低码率加快出片
            bitrate = (custom_bitrate.strip() if custom_bitrate else None) or "1500k"
            fps = int(custom_fps) if custom_fps else None
            clip.write_videofile(
                preview_path,
                codec="libx264",
                audio_codec="aac",
                bitrate=bitrate,
                fps=fps or None,
                preset="superfast",
                threads=2,
                logger=None
            )

            clip.close()

            info = self.preview_manager.get_video_info(preview_path)
            info_text = self.preview_manager.format_video_info(info)
            log = f"✅ 预览生成成功 (前{sub_duration:.1f}s)\n路径: {preview_path}\n分辨率: {target_width}x{target_height}\n码率: {bitrate}"
            return preview_path, info_text, log
        except Exception as e:
            try:
                clip.close()
            except Exception:
                pass
            err = f"❌ 预览生成失败: {e}"
            return None, err, err
    
    def handle_batch_export(
        self,
        video_path: str,
        batch_resolutions: list,
        batch_platforms: list,
        batch_output_dir: str
    ) -> Tuple[None, str, None, str]:
        """
        处理批量导出
        
        返回:
            (None, 批量导出日志)
        """
        if not video_path or not os.path.exists(video_path):
            return None, "❌ 请先选择或生成视频"
        
        if not batch_resolutions or not batch_platforms:
            return None, "❌ 请至少选择一个分辨率和一个平台"
        
        # 创建输出目录
        os.makedirs(batch_output_dir, exist_ok=True)
        
        # 批量导出
        results = self.export_manager.batch_export(
            video_path=video_path,
            output_dir=batch_output_dir,
            resolutions=batch_resolutions,
            platforms=batch_platforms
        )
        
        # 格式化结果
        message = f"📦 批量导出完成!\n"
        message += f"📁 输出目录: {batch_output_dir}\n"
        message += f"📊 总计: {len(results)} 个文件\n\n"
        
        success_count = sum(1 for success, _ in results.values() if success)
        message += f"✅ 成功: {success_count}\n"
        message += f"❌ 失败: {len(results) - success_count}\n\n"
        message += "=" * 50 + "\n\n"
        
        for filename, (success, msg) in results.items():
            status = "✅" if success else "❌"
            message += f"{status} {filename}\n"
            if not success:
                message += f"   错误: {msg}\n"
            message += "\n"
        
        return None, message, None, "批量导出完成"


def create_integrated_preview_export_ui() -> Dict[str, Any]:
    """
    创建集成的预览和导出界面
    
    返回:
        包含所有组件和回调的字典
    """
    ui_manager = PreviewAndExportUI()
    all_components = {}
    
    with gr.Tab("🎬 预览与导出 | Preview & Export"):
        with gr.Row():
            # 左侧：预览
            with gr.Column(scale=1):
                preview_video, video_info_text, refresh_preview_btn = ui_manager.create_preview_tab()
                all_components['preview_video'] = preview_video
                all_components['video_info_text'] = video_info_text
                all_components['refresh_preview_btn'] = refresh_preview_btn
            
            # 右侧：导出设置
            with gr.Column(scale=1):
                export_components = ui_manager.create_export_tab()
                all_components.update(export_components)
    
    # 保存UI管理器引用
    all_components['ui_manager'] = ui_manager
    
    return all_components
