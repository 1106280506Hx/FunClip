#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Copyright FunASR (https://github.com/alibaba-damo-academy/FunClip). All Rights Reserved.
#  MIT License  (https://opensource.org/licenses/MIT)

from http import server
import os
import logging
import argparse
import gradio as gr
from funasr import AutoModel
from videoclipper import VideoClipper
from llm.openai_api import openai_call
from llm.qwen_api import call_qwen_model
from llm.g4f_openai_api import g4f_openai_call
from utils.trans_utils import extract_timestamps
from introduction import top_md_1, top_md_3, top_md_4
from utils.preview_components import create_integrated_preview_export_ui
import time
import logging
from accelerate.logging import get_logger
import sys

logger = get_logger(__name__)
if not logger.logger.handlers:
    logger.logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.logger.addHandler(handler)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='argparse testing')
    parser.add_argument('--lang', '-l', type=str, default = "zh", help="language")
    parser.add_argument('--share', '-s', action='store_true', help="if to establish gradio share link")
    parser.add_argument('--port', '-p', type=int, default=7860, help='port number')
    parser.add_argument('--listen', action='store_true', help="if to listen to all hosts")
    args = parser.parse_args()
    
    if args.lang == 'zh':
        funasr_model = AutoModel(model="iic/speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
                                vad_model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                                punc_model="damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
                                spk_model="damo/speech_campplus_sv_zh-cn_16k-common",
                                )
    else:
        funasr_model = AutoModel(model="iic/speech_paraformer_asr-en-16k-vocab4199-pytorch",
                                vad_model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                                punc_model="damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
                                spk_model="damo/speech_campplus_sv_zh-cn_16k-common",
                                )
    audio_clipper = VideoClipper(funasr_model)
    audio_clipper.lang = args.lang
    
    # Initialize Video Semantic Understander
    audio_clipper.init_semantic_understander("/remote-home/share/huggingface/Qwen3-VL-8B-Instruct")

    server_name='127.0.0.1'
    if args.listen:
        server_name = '0.0.0.0'
        
    # 1. 定义包装函数，处理 semantic_understand 返回的两个值
    def video_semantic_understanding_wrapper(video_input):
        if video_input is None:
            return "Please upload a video first.", None
        # 调用 videoclipper，获取 (UI文本, 结构化数据)
        ui_text, raw_data = audio_clipper.semantic_understand(video_input)
        return ui_text, raw_data

    # 2. 定义包装函数，将 State 中的数据传给 generate_musical_video
    # [修改] 移除了 tsv 参数
    def run_music(video, m_root, semantic_state, custom_audio):
        if not video: 
            return None, "No video input"
        
        if semantic_state is None:
            return None, "⚠️ 请先点击 '提取视频语义' 按钮获取分析结果，再生成配乐。"
            
        timestamp = int(time.time())
        base_name = os.path.splitext(video)[0]
        out_path = f"{base_name}_musical_{timestamp}.mp4"
        
        print(f"🔄 Re-generating music video... Output: {out_path}")
        
        # 检查是否上传了自定义音频
        custom_path = None
        if custom_audio is not None:
            custom_path = custom_audio # Gradio 返回的是文件路径
            print(f"🎵 Using custom audio: {custom_path}")
        
        path, msg = audio_clipper.generate_musical_video(
            video_path=video, 
            music_root=m_root, 
            output_path=out_path, 
            shots_data_wrapper=semantic_state,
            custom_bgm_path=custom_path # [新增参数]
        )
        return path, f"✅ 生成成功 (版本 {timestamp})\n{msg}"

    def audio_recog(audio_input, sd_switch, hotwords, output_dir):
        return audio_clipper.recog(audio_input, sd_switch, None, hotwords, output_dir=output_dir)

    def video_recog(video_input, sd_switch, hotwords, output_dir):
        return audio_clipper.video_recog(video_input, sd_switch, hotwords, output_dir=output_dir)

    def video_clip(dest_text, video_spk_input, start_ost, end_ost, state, output_dir):
        return audio_clipper.video_clip(
            dest_text, start_ost, end_ost, state, dest_spk=video_spk_input, output_dir=output_dir
            )

    def mix_recog(video_input, audio_input, hotwords, output_dir):
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        audio_state, video_state = None, None
        if video_input is not None:
            res_text, res_srt, video_state = video_recog(
                video_input, 'No', hotwords, output_dir=output_dir)
            return res_text, res_srt, video_state, None
        if audio_input is not None:
            res_text, res_srt, audio_state = audio_recog(
                audio_input, 'No', hotwords, output_dir=output_dir)
            return res_text, res_srt, None, audio_state
    
    def mix_recog_speaker(video_input, audio_input, hotwords, output_dir):
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        audio_state, video_state = None, None
        if video_input is not None:
            res_text, res_srt, video_state = video_recog(
                video_input, 'Yes', hotwords, output_dir=output_dir)
            return res_text, res_srt, video_state, None
        if audio_input is not None:
            res_text, res_srt, audio_state = audio_recog(
                audio_input, 'Yes', hotwords, output_dir=output_dir)
            return res_text, res_srt, None, audio_state
    
    def mix_clip(dest_text, video_spk_input, start_ost, end_ost, video_state, audio_state, output_dir):
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        if video_state is not None:
            clip_video_file, message, clip_srt = audio_clipper.video_clip(
                dest_text, start_ost, end_ost, video_state, dest_spk=video_spk_input, output_dir=output_dir)
            return clip_video_file, None, message, clip_srt
        if audio_state is not None:
            (sr, res_audio), message, clip_srt = audio_clipper.clip(
                dest_text, start_ost, end_ost, audio_state, dest_spk=video_spk_input, output_dir=output_dir)
            return None, (sr, res_audio), message, clip_srt
    
    def video_clip_addsub(dest_text, video_spk_input, start_ost, end_ost, state, output_dir, font_size, font_color):
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        return audio_clipper.video_clip(
            dest_text, start_ost, end_ost, state, 
            font_size=font_size, font_color=font_color, 
            add_sub=True, dest_spk=video_spk_input, output_dir=output_dir
            )
        
    def llm_inference(system_content, user_content, srt_text, model, apikey):
        SUPPORT_LLM_PREFIX = ['qwen', 'gpt', 'g4f', 'moonshot', 'deepseek']
        if model.startswith('qwen'):
            return call_qwen_model(apikey, model, user_content+'\n'+srt_text, system_content)
        if model.startswith('gpt') or model.startswith('moonshot') or model.startswith('deepseek'):
            return openai_call(apikey, model, system_content, user_content+'\n'+srt_text)
        elif model.startswith('g4f'):
            model = "-".join(model.split('-')[1:])
            return g4f_openai_call(model, system_content, user_content+'\n'+srt_text)
        else:
            logging.error("LLM name error, only {} are supported as LLM name prefix."
                          .format(SUPPORT_LLM_PREFIX))
    
    def AI_clip(LLM_res, dest_text, video_spk_input, start_ost, end_ost, video_state, audio_state, output_dir):
        timestamp_list = extract_timestamps(LLM_res)
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        if video_state is not None:
            clip_video_file, message, clip_srt = audio_clipper.video_clip(
                dest_text, start_ost, end_ost, video_state, 
                dest_spk=video_spk_input, output_dir=output_dir, timestamp_list=timestamp_list, add_sub=False)
            return clip_video_file, None, message, clip_srt
        if audio_state is not None:
            (sr, res_audio), message, clip_srt = audio_clipper.clip(
                dest_text, start_ost, end_ost, audio_state, 
                dest_spk=video_spk_input, output_dir=output_dir, timestamp_list=timestamp_list, add_sub=False)
            return None, (sr, res_audio), message, clip_srt
    
    def AI_clip_subti(LLM_res, dest_text, video_spk_input, start_ost, end_ost, video_state, audio_state, output_dir):
        timestamp_list = extract_timestamps(LLM_res)
        output_dir = output_dir.strip()
        if not len(output_dir):
            output_dir = None
        else:
            output_dir = os.path.abspath(output_dir)
        if video_state is not None:
            clip_video_file, message, clip_srt = audio_clipper.video_clip(
                dest_text, start_ost, end_ost, video_state, 
                dest_spk=video_spk_input, output_dir=output_dir, timestamp_list=timestamp_list, add_sub=True)
            return clip_video_file, None, message, clip_srt
        if audio_state is not None:
            (sr, res_audio), message, clip_srt = audio_clipper.clip(
                dest_text, start_ost, end_ost, audio_state, 
                dest_spk=video_spk_input, output_dir=output_dir, timestamp_list=timestamp_list, add_sub=True)
            return None, (sr, res_audio), message, clip_srt
    
    def video_semantic_understanding(video_input):
        if video_input is None:
            return "Please upload a video first."
        return audio_clipper.semantic_understand(video_input)

    # gradio interface
    theme = gr.Theme.load("funclip/utils/theme.json")
    with gr.Blocks(theme=theme) as funclip_service:
        gr.Markdown(top_md_1)
        # gr.Markdown(top_md_2)
        gr.Markdown(top_md_3)
        gr.Markdown(top_md_4)
        semantic_state_data = gr.State()
        video_state, audio_state = gr.State(), gr.State()
        with gr.Row():
            with gr.Column():
                with gr.Row():
                    video_input = gr.Video(label="视频输入 | Video Input")
                    audio_input = gr.Audio(label="音频输入 | Audio Input")
                with gr.Column():
                    gr.Examples(['https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%A4%9A%E8%AF%BB%E4%B9%A6%EF%BC%9F%E8%BF%99%E6%98%AF%E6%88%91%E5%90%AC%E8%BF%87%E6%9C%80%E5%A5%BD%E7%9A%84%E7%AD%94%E6%A1%88-%E7%89%87%E6%AE%B5.mp4', 
                                 'https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/2022%E4%BA%91%E6%A0%96%E5%A4%A7%E4%BC%9A_%E7%89%87%E6%AE%B52.mp4', 
                                 'https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/%E4%BD%BF%E7%94%A8chatgpt_%E7%89%87%E6%AE%B5.mp4'],
                                [video_input],
                                label='示例视频 | Demo Video')
                    gr.Examples(['https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/%E8%AE%BF%E8%B0%88.mp4'],
                                [video_input],
                                label='多说话人示例视频 | Multi-speaker Demo Video')
                    gr.Examples(['https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/%E9%B2%81%E8%82%83%E9%87%87%E8%AE%BF%E7%89%87%E6%AE%B51.wav'],
                                [audio_input],
                                label="示例音频 | Demo Audio")
                    with gr.Column():
                        # with gr.Row():
                            # video_sd_switch = gr.Radio(["No", "Yes"], label="👥区分说话人 Get Speakers", value='No')
                        hotwords_input = gr.Textbox(label="🚒 热词 | Hotwords(可以为空，多个热词使用空格分隔，仅支持中文热词)")
                        output_dir = gr.Textbox(label="📁 文件输出路径 | File Output Dir (可以为空，Linux, mac系统可以稳定使用)", value=" ")
                        with gr.Row():
                            recog_button = gr.Button("👂 识别 | ASR", variant="primary")
                            recog_button2 = gr.Button("👂👫 识别+区分说话人 | ASR+SD")
                video_text_output = gr.Textbox(label="✏️ 识别结果 | Recognition Result")
                video_srt_output = gr.Textbox(label="📖 SRT字幕内容 | RST Subtitles")
                video_semantic_output = gr.Textbox(label="👁️ 视频语义理解 | Video Semantic Understanding")
                semantic_button = gr.Button("👁️ 提取视频语义 | Extract Semantic Tags")
            with gr.Column():
                with gr.Tab("🧠 LLM智能裁剪 | LLM Clipping"):
                    with gr.Column():
                        prompt_head = gr.Textbox(label="Prompt System (按需更改，最好不要变动主体和要求)", value=("你是一个视频srt字幕分析剪辑器，输入视频的srt字幕，"
                                "分析其中的精彩且尽可能连续的片段并裁剪出来，输出四条以内的片段，将片段中在时间上连续的多个句子及它们的时间戳合并为一条，"
                                "注意确保文字与时间戳的正确匹配。输出需严格按照如下格式：1. [开始时间-结束时间] 文本，注意其中的连接符是“-”"))
                        prompt_head2 = gr.Textbox(label="Prompt User（不需要修改，会自动拼接左下角的srt字幕）", value=("这是待裁剪的视频srt字幕："))
                        with gr.Column():
                            with gr.Row():
                                llm_model = gr.Dropdown(
                                    choices=["gpt-5",
                                        "deepseek-chat"
                                        "qwen-plus",
                                             "gpt-3.5-turbo", 
                                             "gpt-3.5-turbo-0125", 
                                             "gpt-4-turbo",
                                             "g4f-gpt-3.5-turbo"], 
                                    value="deepseek-chat",
                                    label="LLM Model Name",
                                    allow_custom_value=True)
                                apikey_input = gr.Textbox(label="APIKEY")
                            llm_button =  gr.Button("LLM推理 | LLM Inference（首先进行识别，非g4f需配置对应apikey）", variant="primary")
                        llm_result = gr.Textbox(label="LLM Clipper Result")
                        with gr.Row():
                            llm_clip_button = gr.Button("🧠 LLM智能裁剪 | AI Clip", variant="primary")
                            llm_clip_subti_button = gr.Button("🧠 LLM智能裁剪+字幕 | AI Clip+Subtitles")
                with gr.Tab("✂️ 根据文本/说话人裁剪 | Text/Speaker Clipping"):
                    video_text_input = gr.Textbox(label="✏️ 待裁剪文本 | Text to Clip (多段文本使用'#'连接)")
                    video_spk_input = gr.Textbox(label="✏️ 待裁剪说话人 | Speaker to Clip (多个说话人使用'#'连接)")
                    with gr.Row():
                        clip_button = gr.Button("✂️ 裁剪 | Clip", variant="primary")
                        clip_subti_button = gr.Button("✂️ 裁剪+字幕 | Clip+Subtitles")
                    with gr.Row():
                        video_start_ost = gr.Slider(minimum=-500, maximum=1000, value=0, step=50, label="⏪ 开始位置偏移 | Start Offset (ms)")
                        video_end_ost = gr.Slider(minimum=-500, maximum=1000, value=100, step=50, label="⏩ 结束位置偏移 | End Offset (ms)")
                with gr.Tab("🎵 自动配乐 | Auto Music"):
                    with gr.Row():
                        music_root_input = gr.Textbox(label="Music Root Dir", value="/remote-home/haoningwu/xiaohuang/FunClip/music")
                    
                    # [新增] 自定义音乐上传组件
                    custom_bgm_input = gr.Audio(label="[可选] 上传自定义背景音乐 (覆盖自动推荐)", type="filepath")
                    
                    music_btn = gr.Button("生成配乐视频 (需先提取语义)", variant="primary")
                    music_out_video = gr.Video(label="配乐结果")
                    music_log = gr.Textbox(label="日志")

                    music_btn.click(
                        run_music, 
                        inputs=[video_input, music_root_input, semantic_state_data, custom_bgm_input], # 增加了 custom_bgm_input
                        outputs=[music_out_video, music_log]
                    )
                
                # 🎬 预览与导出 Tab
                preview_export_components = create_integrated_preview_export_ui()
                    
                with gr.Row():
                    font_size = gr.Slider(minimum=10, maximum=100, value=32, step=2, label="🔠 字幕字体大小 | Subtitle Font Size")
                    font_color = gr.Radio(["black", "white", "green", "red"], label="🌈 字幕颜色 | Subtitle Color", value='white')
                    # font = gr.Radio(["黑体", "Alibaba Sans"], label="字体 Font")
                video_output = gr.Video(label="裁剪结果 | Video Clipped")
                audio_output = gr.Audio(label="裁剪结果 | Audio Clipped")
                clip_message = gr.Textbox(label="⚠️ 裁剪信息 | Clipping Log")
                srt_clipped = gr.Textbox(label="📖 裁剪部分SRT字幕内容 | Clipped RST Subtitles")            
                
        recog_button.click(mix_recog, 
                            inputs=[video_input, 
                                    audio_input, 
                                    hotwords_input, 
                                    output_dir,
                                    ], 
                            outputs=[video_text_output, video_srt_output, video_state, audio_state])
        recog_button2.click(mix_recog_speaker, 
                            inputs=[video_input, 
                                    audio_input, 
                                    hotwords_input, 
                                    output_dir,
                                    ], 
                            outputs=[video_text_output, video_srt_output, video_state, audio_state])
        clip_button.click(mix_clip, 
                           inputs=[video_text_input, 
                                   video_spk_input, 
                                   video_start_ost, 
                                   video_end_ost, 
                                   video_state, 
                                   audio_state, 
                                   output_dir
                                   ],
                           outputs=[video_output, audio_output, clip_message, srt_clipped])
        clip_subti_button.click(video_clip_addsub, 
                           inputs=[video_text_input, 
                                   video_spk_input, 
                                   video_start_ost, 
                                   video_end_ost, 
                                   video_state, 
                                   output_dir, 
                                   font_size, 
                                   font_color,
                                   ], 
                           outputs=[video_output, clip_message, srt_clipped])
        # semantic_button.click(video_semantic_understanding,
        #                     inputs=[video_input],
        #                     outputs=[video_semantic_output])
        semantic_button.click(
            video_semantic_understanding_wrapper,
            inputs=[video_input],
            outputs=[video_semantic_output, semantic_state_data] 
        )
        llm_button.click(llm_inference,
                         inputs=[prompt_head, prompt_head2, video_srt_output, llm_model, apikey_input],
                         outputs=[llm_result])
        llm_clip_button.click(AI_clip, 
                           inputs=[llm_result,
                                   video_text_input, 
                                   video_spk_input, 
                                   video_start_ost, 
                                   video_end_ost, 
                                   video_state, 
                                   audio_state, 
                                   output_dir,
                                   ],
                           outputs=[video_output, audio_output, clip_message, srt_clipped])
        llm_clip_subti_button.click(AI_clip_subti, 
                           inputs=[llm_result,
                                   video_text_input, 
                                   video_spk_input, 
                                   video_start_ost, 
                                   video_end_ost, 
                                   video_state, 
                                   audio_state, 
                                   output_dir,
                                   ],
                           outputs=[video_output, audio_output, clip_message, srt_clipped])
        
        # 🎬 预览与导出功能的回调绑定
        ui_manager = preview_export_components['ui_manager']
        
        # 刷新预览 - 当视频输出更新时自动刷新
        def auto_refresh_preview(video_path):
            return ui_manager.handle_preview_update(video_path)

        # 使用导出结果刷新预览
        def auto_refresh_preview_from_export(video_path):
            return ui_manager.handle_preview_update(video_path)
        
        # 绑定刷新预览按钮
        preview_export_components['refresh_preview_btn'].click(
            auto_refresh_preview,
            inputs=[video_output],
            outputs=[
                preview_export_components['preview_video'],
                preview_export_components['video_info_text']
            ]
        )
        
        # 当video_output更新时，自动刷新预览
        video_output.change(
            auto_refresh_preview,
            inputs=[video_output],
            outputs=[
                preview_export_components['preview_video'],
                preview_export_components['video_info_text']
            ]
        )

        # 当导出结果更新时，也同步刷新预览（便于查看不同导出参数效果）
        preview_export_components['export_video_output'].change(
            auto_refresh_preview_from_export,
            inputs=[preview_export_components['export_video_output']],
            outputs=[
                preview_export_components['preview_video'],
                preview_export_components['video_info_text']
            ]
        )
        
        # 绑定导出按钮
        preview_export_components['export_btn'].click(
            ui_manager.handle_export,
            inputs=[
                video_output,  # 使用当前裁剪结果
                preview_export_components['resolution'],
                preview_export_components['platform'],
                preview_export_components['output_path'],
                preview_export_components['custom_width'],
                preview_export_components['custom_height'],
                preview_export_components['custom_bitrate'],
                preview_export_components['custom_fps']
            ],
            outputs=[
                preview_export_components['export_video_output'],
                preview_export_components['export_message'],
                preview_export_components['preview_video'],
                preview_export_components['video_info_text']
            ]
        )

        # 绑定导出预览按钮（仅生成前3秒轻量预览）
        preview_export_components['export_preview_btn'].click(
            ui_manager.handle_export_preview,
            inputs=[
                video_output,
                preview_export_components['resolution'],
                preview_export_components['platform'],
                preview_export_components['custom_width'],
                preview_export_components['custom_height'],
                preview_export_components['custom_bitrate'],
                preview_export_components['custom_fps']
            ],
            outputs=[
                preview_export_components['preview_video'],
                preview_export_components['video_info_text'],
                preview_export_components['export_message']
            ]
        )
        
        # 绑定批量导出按钮
        preview_export_components['batch_export_btn'].click(
            ui_manager.handle_batch_export,
            inputs=[
                video_output,
                preview_export_components['batch_resolutions'],
                preview_export_components['batch_platforms'],
                preview_export_components['batch_output_dir']
            ],
            outputs=[
                preview_export_components['export_video_output'],
                preview_export_components['export_message'],
                preview_export_components['preview_video'],
                preview_export_components['video_info_text']
            ]
        )
    
    # start gradio service in local or share
    if args.listen:
        funclip_service.launch(share=args.share, server_port=args.port, server_name=server_name, inbrowser=False)
    else:
        funclip_service.launch(share=args.share, server_port=args.port, server_name=server_name)
