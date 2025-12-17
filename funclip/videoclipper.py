#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Copyright FunASR (https://github.com/alibaba-damo-academy/FunClip). All Rights Reserved.
#  MIT License  (https://opensource.org/licenses/MIT)

import re
import os
import sys
import copy
import librosa
import logging
import argparse
import numpy as np
import soundfile as sf
import cv2
from pathlib import Path
from moviepy.editor import *
import moviepy.editor as mpy
from moviepy.video.tools.subtitles import SubtitlesClip, TextClip
from moviepy.editor import VideoFileClip, concatenate_videoclips
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from utils.subtitle_utils import generate_srt, generate_srt_clip
from utils.argparse_tools import ArgumentParser, get_commandline_args
from utils.trans_utils import pre_proc, proc, write_state, load_state, proc_spk, convert_pcm_to_float
from llm.video_understanding import ShotDetector, VideoSemanticUnderstander
from multi_video_concat import concat_videos
from utils.preprocess_video import preprocess_video_once, parse_size
from utils.preprocess_audio import preprocess_audio_once

from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips, vfx
from utils.music_manager import MusicManager 
from utils.director import Director
from utils.export_manager import ExportManager, VideoPreviewManager
import librosa
from utils.transitions import TransFX

class VideoClipper():
    def __init__(self, funasr_model):
        logging.warning("Initializing VideoClipper.")
        self.funasr_model = funasr_model
        self.GLOBAL_COUNT = 0
        self.video_understander = None
        self.shot_detector = None
        self.export_manager = ExportManager()
        self.preview_manager = VideoPreviewManager()

    def init_semantic_understander(self, model_path, device="cuda"):
        try:
            self.video_understander = VideoSemanticUnderstander(model_path=model_path, device=device)
            self.shot_detector = ShotDetector(threshold=0.7)
            logging.info("VideoSemanticUnderstander initialized successfully.")
        except Exception as e:
            logging.error(f"Failed to initialize VideoSemanticUnderstander: {e}")

    def semantic_understand(self, video_path):
        """
        UI 调用的入口：返回格式化后的字符串(给人看) 和 结构化数据(给机器用)
        """
        if self.video_understander is None:
            return "Video Semantic Understander model is not loaded.", None
        
        if not os.path.exists(video_path):
            return "Video file not found.", None

        try:
            # 1. 检测镜头
            shots = self.shot_detector.detect(video_path, threshold=0.7)
            if not shots:
                return "No shots detected.", None
                
            # 2. 获取理解结果 (Results List) 和 一句话摘要 (String)
            results, global_summary = self.video_understander.understand(video_path, shots)
            
            # 3. [关键] 格式化 UI 输出字符串，保证可读性
            # 第一部分：全局摘要
            ui_output = f"📝 **Global Summary**:\n{global_summary}\n\n"
            ui_output += "-" * 30 + "\n\n"
            ui_output += "🎬 **Shot Details**:\n"
            
            # 第二部分：逐个镜头的详情
            for i, res in enumerate(results):
                start = res['start']
                end = res['end']
                tags = res['tags']
                
                # 将 tags 字典格式化为 Scene: Kitchen | Mood: Happy 这种形式
                tag_str = " | ".join([f"{k}: {v}" for k, v in tags.items()])
                
                ui_output += f"• Shot {i+1} ({start:.2f}s - {end:.2f}s):\n"
                ui_output += f"  {tag_str}\n\n"
            
            # 4. 打包结构化数据传给 State
            final_data_wrapper = {
                "shots": results,
                "summary": global_summary
            }
            
            return ui_output, final_data_wrapper
            
        except Exception as e:
            logging.error(f"Error during semantic understanding: {e}")
            return f"Error: {e}", None
    
    def recog(self, audio_input, sd_switch='no', state=None, hotwords="", output_dir=None):
        if state is None:
            state = {}
        sr, data = audio_input

        # Convert to float64 consistently (includes data type checking)
        data = convert_pcm_to_float(data)

        # assert sr == 16000, "16kHz sample rate required, {} given.".format(sr)
        if sr != 16000: # resample with librosa
            data = librosa.resample(data, orig_sr=sr, target_sr=16000)
        if len(data.shape) == 2:  # multi-channel wav input
            logging.warning("Input wav shape: {}, only first channel reserved.".format(data.shape))
            data = data[:,0]
        state['audio_input'] = (sr, data)
        if sd_switch == 'Yes':
            rec_result = self.funasr_model.generate(data, 
                                                    return_spk_res=True,
                                                    return_raw_text=True, 
                                                    is_final=True,
                                                    output_dir=output_dir, 
                                                    hotword=hotwords, 
                                                    pred_timestamp=self.lang=='en',
                                                    en_post_proc=self.lang=='en',
                                                    cache={})
            res_srt = generate_srt(rec_result[0]['sentence_info'])
            state['sd_sentences'] = rec_result[0]['sentence_info']
        else:
            rec_result = self.funasr_model.generate(data, 
                                                    return_spk_res=False, 
                                                    sentence_timestamp=True, 
                                                    return_raw_text=True, 
                                                    is_final=True, 
                                                    hotword=hotwords,
                                                    output_dir=output_dir,
                                                    pred_timestamp=self.lang=='en',
                                                    en_post_proc=self.lang=='en',
                                                    cache={})
            res_srt = generate_srt(rec_result[0]['sentence_info'])
        state['recog_res_raw'] = rec_result[0]['raw_text']
        state['timestamp'] = rec_result[0]['timestamp']
        state['sentences'] = rec_result[0]['sentence_info']
        res_text = rec_result[0]['text']
        return res_text, res_srt, state

    def clip(self, dest_text, start_ost, end_ost, state, dest_spk=None, output_dir=None, timestamp_list=None):
        # get from state
        audio_input = state['audio_input']
        recog_res_raw = state['recog_res_raw']
        timestamp = state['timestamp']
        sentences = state['sentences']
        sr, data = audio_input
        data = data.astype(np.float64)

        if timestamp_list is None:
            all_ts = []
            if dest_spk is None or dest_spk == '' or 'sd_sentences' not in state:
                for _dest_text in dest_text.split('#'):
                    if '[' in _dest_text:
                        match = re.search(r'\[(\d+),\s*(\d+)\]', _dest_text)
                        if match:
                            offset_b, offset_e = map(int, match.groups())
                            log_append = ""
                        else:
                            offset_b, offset_e = 0, 0
                            log_append = "(Bracket detected in dest_text but offset time matching failed)"
                        _dest_text = _dest_text[:_dest_text.find('[')]
                    else:
                        log_append = ""
                        offset_b, offset_e = 0, 0
                    _dest_text = pre_proc(_dest_text)
                    ts = proc(recog_res_raw, timestamp, _dest_text)
                    for _ts in ts: all_ts.append([_ts[0]+offset_b*16, _ts[1]+offset_e*16])
                    if len(ts) > 1 and match:
                        log_append += '(offsets detected but No.{} sub-sentence matched to {} periods in audio, \
                            offsets are applied to all periods)'
            else:
                for _dest_spk in dest_spk.split('#'):
                    ts = proc_spk(_dest_spk, state['sd_sentences'])
                    for _ts in ts: all_ts.append(_ts)
                log_append = ""
        else:
            all_ts = timestamp_list
        ts = all_ts
        # ts.sort()
        srt_index = 0
        clip_srt = ""
        if len(ts):
            start, end = ts[0]
            start = min(max(0, start+start_ost*16), len(data))
            end = min(max(0, end+end_ost*16), len(data))
            res_audio = data[start:end]
            start_end_info = "from {} to {}".format(start/16000, end/16000)
            srt_clip, _, srt_index = generate_srt_clip(sentences, start/16000.0, end/16000.0, begin_index=srt_index)
            clip_srt += srt_clip
            for _ts in ts[1:]:  # multiple sentence input or multiple output matched
                start, end = _ts
                start = min(max(0, start+start_ost*16), len(data))
                end = min(max(0, end+end_ost*16), len(data))
                start_end_info += ", from {} to {}".format(start, end)
                res_audio = np.concatenate([res_audio, data[start+start_ost*16:end+end_ost*16]], -1)
                srt_clip, _, srt_index = generate_srt_clip(sentences, start/16000.0, end/16000.0, begin_index=srt_index-1)
                clip_srt += srt_clip
        if len(ts):
            message = "{} periods found in the speech: ".format(len(ts)) + start_end_info + log_append
        else:
            message = "No period found in the speech, return raw speech. You may check the recognition result and try other destination text."
            res_audio = data
        return (sr, res_audio), message, clip_srt

    def video_recog(self, video_filename, sd_switch='no', hotwords="", output_dir=None):
        video = mpy.VideoFileClip(video_filename)
        
        # 准备输出文件名
        if output_dir is not None:
            os.makedirs(output_dir, exist_ok=True)
            _, base_name = os.path.split(video_filename)
            base_name, _ = os.path.splitext(base_name)
            clip_video_file = base_name + '_clip.mp4'
            audio_file = base_name + '.wav'
            audio_file = os.path.join(output_dir, audio_file)
        else:
            base_name, _ = os.path.splitext(video_filename)
            clip_video_file = base_name + '_clip.mp4'
            audio_file = base_name + '.wav'

        # state 初始化
        state = {
            'video_filename': video_filename,
            'clip_video_file': clip_video_file,
            'video': video,
        }

        # --- [修改点]：针对无声视频的兼容处理 ---
        if video.audio is None:
            logging.warning("⚠️ No audio track found in video. Skipping ASR.")
            # 构造一个空的 state，骗过后续流程
            state['sentences'] = [] # 空的识别结果
            state['recog_res_raw'] = ""
            state['timestamp'] = []
            state['sd_sentences'] = []
            # 直接返回空结果，不再 sys.exit(1)
            return "", "", state
        # -------------------------------------

        # 如果有声音，走正常流程
        try:
            video.audio.write_audiofile(audio_file)
            wav = librosa.load(audio_file, sr=16000)[0]
            
            if os.path.exists(audio_file):
                os.remove(audio_file)
                
            return self.recog((16000, wav), sd_switch, state, hotwords, output_dir)
            
        except Exception as e:
            # 兜底捕获音频处理错误
            logging.error(f"Error processing audio: {e}")
            state['sentences'] = []
            return "", "", state

    def video_clip(self, 
                   dest_text, 
                   start_ost, 
                   end_ost, 
                   state, 
                   font_size=32, 
                   font_color='white', 
                   add_sub=False, 
                   dest_spk=None, 
                   output_dir=None,
                   timestamp_list=None):
        # get from state
        recog_res_raw = state['recog_res_raw']
        timestamp = state['timestamp']
        sentences = state['sentences']
        video = state['video']
        clip_video_file = state['clip_video_file']
        video_filename = state['video_filename']
        
        if timestamp_list is None:
            all_ts = []
            if dest_spk is None or dest_spk == '' or 'sd_sentences' not in state:
                for _dest_text in dest_text.split('#'):
                    if '[' in _dest_text:
                        match = re.search(r'\[(\d+),\s*(\d+)\]', _dest_text)
                        if match:
                            offset_b, offset_e = map(int, match.groups())
                            log_append = ""
                        else:
                            offset_b, offset_e = 0, 0
                            log_append = "(Bracket detected in dest_text but offset time matching failed)"
                        _dest_text = _dest_text[:_dest_text.find('[')]
                    else:
                        offset_b, offset_e = 0, 0
                        log_append = ""
                    # import pdb; pdb.set_trace()
                    _dest_text = pre_proc(_dest_text)
                    ts = proc(recog_res_raw, timestamp, _dest_text.lower())
                    for _ts in ts: all_ts.append([_ts[0]+offset_b*16, _ts[1]+offset_e*16])
                    if len(ts) > 1 and match:
                        log_append += '(offsets detected but No.{} sub-sentence matched to {} periods in audio, \
                            offsets are applied to all periods)'
            else:
                for _dest_spk in dest_spk.split('#'):
                    ts = proc_spk(_dest_spk, state['sd_sentences'])
                    for _ts in ts: all_ts.append(_ts)
        else:  # AI clip pass timestamp as input directly
            all_ts = [[i[0]*16.0, i[1]*16.0] for i in timestamp_list]
        
        srt_index = 0
        time_acc_ost = 0.0
        ts = all_ts
        # ts.sort()
        clip_srt = ""
        if len(ts):
            if self.lang == 'en' and isinstance(sentences, str):
                sentences = sentences.split()
            start, end = ts[0][0] / 16000, ts[0][1] / 16000
            srt_clip, subs, srt_index = generate_srt_clip(sentences, start, end, begin_index=srt_index, time_acc_ost=time_acc_ost)
            start, end = start+start_ost/1000.0, end+end_ost/1000.0
            video_clip = video.subclip(start, end)
            start_end_info = "from {} to {}".format(start, end)
            clip_srt += srt_clip
            if add_sub:
                generator = lambda txt: TextClip(txt, font='./font/STHeitiMedium.ttc', fontsize=font_size, color=font_color)
                subtitles = SubtitlesClip(subs, generator)
                video_clip = CompositeVideoClip([video_clip, subtitles.set_pos(('center','bottom'))])
            concate_clip = [video_clip]
            time_acc_ost += end+end_ost/1000.0 - (start+start_ost/1000.0)
            for _ts in ts[1:]:
                start, end = _ts[0] / 16000, _ts[1] / 16000
                srt_clip, subs, srt_index = generate_srt_clip(sentences, start, end, begin_index=srt_index-1, time_acc_ost=time_acc_ost)
                if not len(subs):
                    continue
                chi_subs = []
                sub_starts = subs[0][0][0]
                for sub in subs:
                    chi_subs.append(((sub[0][0]-sub_starts, sub[0][1]-sub_starts), sub[1]))
                start, end = start+start_ost/1000.0, end+end_ost/1000.0
                _video_clip = video.subclip(start, end)
                start_end_info += ", from {} to {}".format(str(start)[:5], str(end)[:5])
                clip_srt += srt_clip
                if add_sub:
                    generator = lambda txt: TextClip(txt, font='./font/STHeitiMedium.ttc', fontsize=font_size, color=font_color)
                    subtitles = SubtitlesClip(chi_subs, generator)
                    _video_clip = CompositeVideoClip([_video_clip, subtitles.set_pos(('center','bottom'))])
                    # _video_clip.write_videofile("debug.mp4", audio_codec="aac")
                concate_clip.append(copy.copy(_video_clip))
                time_acc_ost += end+end_ost/1000.0 - (start+start_ost/1000.0)
            message = "{} periods found in the audio: ".format(len(ts)) + start_end_info
            logging.warning("Concating...")
            if len(concate_clip) > 1:
                video_clip = concatenate_videoclips(concate_clip)
            # clip_video_file = clip_video_file[:-4] + '_no{}.mp4'.format(self.GLOBAL_COUNT)
            if output_dir is not None:
                os.makedirs(output_dir, exist_ok=True)
                _, file_with_extension = os.path.split(clip_video_file)
                clip_video_file_name, _ = os.path.splitext(file_with_extension)
                print(output_dir, clip_video_file)
                clip_video_file = os.path.join(output_dir, "{}_no{}.mp4".format(clip_video_file_name, self.GLOBAL_COUNT))
                temp_audio_file = os.path.join(output_dir, "{}_tempaudio_no{}.mp4".format(clip_video_file_name, self.GLOBAL_COUNT))
            else:
                clip_video_file = clip_video_file[:-4] + '_no{}.mp4'.format(self.GLOBAL_COUNT)
                temp_audio_file = clip_video_file[:-4] + '_tempaudio_no{}.mp4'.format(self.GLOBAL_COUNT)
            video_clip.write_videofile(clip_video_file, audio_codec="aac", temp_audiofile=temp_audio_file)
            self.GLOBAL_COUNT += 1
        else:
            clip_video_file = video_filename
            message = "No period found in the audio, return raw speech. You may check the recognition result and try other destination text."
            srt_clip = ''
        return clip_video_file, message, clip_srt
    
    # --- 辅助方法 1: 提取音乐节拍 ---
    def _get_music_beats(self, audio_path):
        """
        使用 librosa 提取音乐节拍时间点 (秒)
        """
        try:
            # 加载音频 (只读取前3分钟以节省时间，通常BGM是循环的)
            y, sr = librosa.load(audio_path, duration=180)
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
            return beat_times
        except Exception as e:
            logging.error(f"Beat tracking failed for {audio_path}: {e}")
            return []

    # --- 辅助方法 2: 计算卡点时长 ---
    def _snap_to_beat(self, clip_duration, current_global_time, beat_times):
        """
        寻找最近的节拍点（允许向前或向后查找，用于变速）
        """
        if len(beat_times) == 0:
            return clip_duration
            
        target_end_time = current_global_time + clip_duration
        
        # 过滤出当前时间之后的 beats
        future_beats = [b for b in beat_times if b > current_global_time + 0.5]
        
        if not future_beats:
            return clip_duration
            
        # 找到绝对距离最近的 beat
        closest_beat = min(future_beats, key=lambda x: abs(x - target_end_time))
        
        # [变速限制]：
        # 如果最近的节拍导致速度变化过大（例如变成 0.5倍速 或 2.0倍速以上），可能导致画面崩坏
        # 我们计算一下预期的时长
        new_duration = closest_beat - current_global_time
        speed_factor = clip_duration / new_duration
        
        # 限制：只允许 0.5x (慢放一半) 到 2.0x (快放一倍) 之间的变速
        if 0.5 <= speed_factor <= 2.0:
            return new_duration
        else:
            # 如果变速太夸张，就保持原速，或者只做轻微裁剪
            return clip_duration
        
    # --- [新增] 辅助方法 3: 仅保留人声 (去除原背景音) ---
    def _isolate_speech(self, clip, abs_start, speech_intervals):
        """
        核心功能：清洗音频。
        根据 ASR 时间戳，只保留 clip 中有人说话的音频片段，其余部分（原BGM/噪音）静音。
        """
        if clip.audio is None:
            return clip

        # 1. 找出当前 clip 时间范围内的人声区间
        clip_end = abs_start + clip.duration
        valid_ranges = []
        
        for s, e in speech_intervals:
            # 计算交集
            start_overlap = max(abs_start, s)
            end_overlap = min(clip_end, e)
            
            if start_overlap < end_overlap:
                # 转换为相对于 clip 的时间 (relative time)
                rel_s = start_overlap - abs_start
                rel_e = end_overlap - abs_start
                valid_ranges.append((rel_s, rel_e))
        
        # 2. 如果当前片段完全没有人声，直接静音
        if not valid_ranges:
            return clip.without_audio()
            
        # 3. 如果有人声，通过合成的方式只保留人声部分
        # (比使用 fl_audio 逐帧过滤要快得多)
        audio_segments = []
        for s, e in valid_ranges:
            try:
                # 截取人声片段
                seg = clip.audio.subclip(s, e).set_start(s)
                # 加上微小的淡入淡出(0.1s)避免截断时的爆音(Clicking sound)
                seg = seg.audio_fadein(0.1).audio_fadeout(0.1)
                audio_segments.append(seg)
            except: pass
            
        if not audio_segments:
            return clip.without_audio()

        # 合成新的纯人声音轨
        new_audio = CompositeAudioClip(audio_segments)
        return clip.set_audio(new_audio)

    def _find_visual_change_point(self, video_path, start_t, end_t, threshold=0.8):
        """
        在指定时间段内，寻找第一个“视觉发生变化”的时间点。
        用于将长镜头截断在动作发生处，或者如果没有动作，则后续会被限制在5s。
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return end_t - start_t

        fps = cap.get(cv2.CAP_PROP_FPS)
        start_frame = int(start_t * fps)
        end_frame = int(end_t * fps)
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        prev_hist = None
        detected_relative_time = end_t - start_t # 默认返回全长
        
        curr_frame_idx = start_frame
        
        while curr_frame_idx < end_frame:
            ret, frame = cap.read()
            if not ret: break
            
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0], None, [256], [0, 256])
            cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
            
            if prev_hist is not None:
                score = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                # 如果相似度低于阈值 (0.8)，说明画面变了 (子镜头)
                # 且为了避免太碎，我们要求至少过了 1 秒
                relative_sec = (curr_frame_idx - start_frame) / fps
                
                if score < threshold and relative_sec > 1.0:
                    detected_relative_time = relative_sec
                    break # 找到第一个变化点就停止
            
            prev_hist = hist
            curr_frame_idx += 1
            
        cap.release()
        return detected_relative_time
    
    # --- 核心主方法 ---
    def generate_musical_video(self, video_path, music_root, output_path, shots_data_wrapper=None, custom_bgm_path=None):
        """
        全自动配乐与转场生成 (单曲循环 + 炫酷转场 + 音频防重叠 + 支持自定义音乐)
        :param custom_bgm_path: [新增] 用户上传的音乐路径，如果存在则优先使用
        """
        logging.info(f"Processing Auto-Music for: {video_path}")
        
        # =================================================
        # 步骤 1: 视觉理解
        # =================================================
        if self.video_understander is None:
            return None, "Error: Semantic Understander not initialized"

        if shots_data_wrapper is None:
            logging.info("No pre-calculated tags provided, running inference...")
            shots = self.shot_detector.detect(video_path, threshold=0.85)
            shots_list, global_summary = self.video_understander.understand(video_path, shots)
        else:
            logging.info("Using pre-calculated semantic tags from UI.")
            shots_list = shots_data_wrapper['shots']
            global_summary = shots_data_wrapper['summary']

        # =================================================
        # 步骤 2: 音乐选择 (优先使用自定义，否则检索)
        # =================================================
        bgm_path = None
        
        # [修改点]：检查自定义音乐
        if custom_bgm_path and os.path.exists(custom_bgm_path):
            logging.info(f"🎵 Using custom BGM provided by user: {custom_bgm_path}")
            bgm_path = custom_bgm_path
        else:
            logging.info(f"🔍 Retrieving music for summary: {global_summary}")
            mm = MusicManager(music_root)
            bgm_path = mm.retrieve_track(global_summary)
        
        if not bgm_path:
            return None, "Error: No matching music found or custom BGM is invalid."
        logging.info(f"Selected BGM: {bgm_path}")

        bgm_beats = self._get_music_beats(bgm_path)
        
        # =================================================
        # 步骤 3: 转场规划
        # =================================================
        logging.info("Planning transitions...")
        director = Director(None) 
        transitions = director.decide_transitions(shots_list)
        
        # =================================================
        # 步骤 4: 视觉渲染 (含智能剪辑、卡点、特效)
        # =================================================
        logging.info("Step 4: Rendering Visuals...")
        original_video = VideoFileClip(video_path)
        processed_clips = []
        
        current_global_time = 0.0
        
        # 预处理人声时间戳 (用于去除原声背景音)
        # 注意：这里需要先跑一次 video_recog 才能拿到 state
        _, _, state = self.video_recog(video_path)
        asr_sentences = state.get('sentences', [])
        speech_timestamps = [] 
        for sent in asr_sentences:
            s = sent['timestamp'][0][0] / 1000.0
            e = sent['timestamp'][-1][1] / 1000.0
            speech_timestamps.append((s, e))
        
        for i, shot in enumerate(shots_list):
            start_t = shot['start']
            end_t = shot['end']
            original_dur = end_t - start_t
            
            # --- 智能剪辑逻辑 ---
            # 检查人声覆盖
            has_speech = False
            for s, e in speech_timestamps:
                if max(start_t, s) < min(end_t, e):
                    has_speech = True
                    break
            
            target_cut_duration = original_dur
            if has_speech:
                logging.info(f"Shot {i}: Has speech, keeping full duration.")
            else:
                # 局部视觉检测 (防拖沓)
                visual_change_time = self._find_visual_change_point(video_path, start_t, end_t, threshold=0.85)
                limit_dur = 5.0
                if visual_change_time < original_dur:
                    target_cut_duration = min(visual_change_time, limit_dur)
                else:
                    target_cut_duration = min(original_dur, limit_dur)

            # 计算转场
            trans_duration = 0.0
            trans_type = "cut"
            if i > 0 and (i-1) < len(transitions):
                trans_info = transitions[i-1]
                trans_type = trans_info['type']
                trans_duration = trans_info['duration']

            # 计算卡点 (基于智能剪辑后的时长)
            net_duration = self._snap_to_beat(target_cut_duration, current_global_time, bgm_beats)

            # 计算物理总时长
            gross_duration = net_duration + trans_duration
            
            # 切割视频
            actual_end_t = min(start_t + gross_duration, original_video.duration)
            clip = original_video.subclip(start_t, actual_end_t)
            
            # 去除原背景音 (只留人声)
            clip = self._isolate_speech(clip, start_t, speech_timestamps)
            
            # 变速处理
            current_clip_dur = clip.duration
            if abs(current_clip_dur - gross_duration) > 0.05 and gross_duration > 0.1:
                speed_factor = current_clip_dur / gross_duration
                if 0.5 <= speed_factor <= 2.0:
                    try: clip = clip.fx(vfx.speedx, speed_factor)
                    except: pass
            
            # 应用转场特效
            if trans_duration > 0:
                try:
                    if trans_type == "slide_left": clip = TransFX.slide_in(clip, trans_duration, 'left')
                    elif trans_type == "slide_up": clip = TransFX.slide_in(clip, trans_duration, 'up')
                    elif trans_type == "zoom_in": clip = TransFX.zoom_in(clip, trans_duration)
                    elif trans_type == "crossfade": clip = clip.crossfadein(trans_duration)
                    elif trans_type == "fade_black": clip = clip.fadein(trans_duration)
                    elif trans_type == "glitch": clip = TransFX.glitch(clip, trans_duration)
                except: pass

            processed_clips.append(clip)
            current_global_time += net_duration

        # --- 4.2 智能拼接 (含音频防重叠) ---
        logging.info("Compositing layers...")
        final_layers = []
        cursor = 0.0
        
        for idx, clip in enumerate(processed_clips):
            t_dur = 0.0
            if idx > 0 and (idx-1) < len(transitions):
                t_dur = transitions[idx-1]['duration']
            
            start_pos = cursor - t_dur
            if start_pos < 0: start_pos = 0
            
            # 音频防重叠处理
            if idx > 0:
                prev_clip = final_layers[-1]
                prev_audio_allowed_duration = start_pos - prev_clip.start
                if prev_clip.audio is not None and prev_audio_allowed_duration > 0:
                    new_audio = prev_clip.audio.subclip(0, prev_audio_allowed_duration)
                    new_audio = new_audio.audio_fadeout(0.05)
                    final_layers[-1] = prev_clip.set_audio(new_audio)

            clip = clip.set_start(start_pos)
            final_layers.append(clip)
            cursor = start_pos + clip.duration
            
        final_video_clip = CompositeVideoClip(final_layers)
        
        # 裁剪总时长
        total_dur = final_layers[-1].end
        final_video_clip = final_video_clip.subclip(0, total_dur)

        # =================================================
        # 步骤 5: 音频混合 (BGM + 只有人声的原音)
        # =================================================
        logging.info("Step 5: Mixing Audio Layers...")
        final_audio_layers = []
        if final_video_clip.audio:
            final_audio_layers.append(final_video_clip.audio)
        
        try:
            bgm = AudioFileClip(bgm_path)
            # 循环铺满
            if bgm.duration < final_video_clip.duration:
                bgm = bgm.fx(vfx.loop, duration=final_video_clip.duration)
            else:
                bgm = bgm.subclip(0, final_video_clip.duration)
            
            bgm = bgm.audio_fadein(1.0).audio_fadeout(1.0)
            bgm = bgm.volumex(0.3) # 设定背景音量
            final_audio_layers.append(bgm)
        except Exception as e:
            logging.error(f"Error mixing BGM: {e}")

        if final_audio_layers:
            final_video_clip.audio = CompositeAudioClip(final_audio_layers)
        
        # =================================================
        # 步骤 6: 导出
        # =================================================
        logging.info(f"Writing result to {output_path}...")
        final_video_clip.write_videofile(output_path, audio_codec='aac')
        
        return output_path, f"Success.\nBGM: {os.path.basename(bgm_path)}\nSummary: {global_summary}"
    
    def export_video_with_preset(self, video_path, output_path, resolution="原始/Original", 
                                  platform="通用/Universal", **kwargs):
        """
        使用预设参数导出视频
        
        参数:
            video_path: 输入视频路径
            output_path: 输出视频路径
            resolution: 分辨率预设
            platform: 平台预设
            **kwargs: 其他自定义参数
        
        返回:
            (成功标志, 消息)
        """
        return self.export_manager.export_video(
            video_path, output_path, resolution, platform, **kwargs
        )
    
    def batch_export_video(self, video_path, output_dir, resolutions, platforms):
        """
        批量导出视频
        
        参数:
            video_path: 输入视频路径
            output_dir: 输出目录
            resolutions: 分辨率列表
            platforms: 平台列表
        
        返回:
            导出结果字典
        """
        return self.export_manager.batch_export(
            video_path, output_dir, resolutions, platforms
        )
    
    def get_video_preview_info(self, video_path):
        """
        获取视频预览信息
        
        参数:
            video_path: 视频文件路径
        
        返回:
            视频信息字典
        """
        return self.preview_manager.get_video_info(video_path)

def get_parser():
    parser = ArgumentParser(
        description="ClipVideo Argument",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=(1, 2),
        help="Stage, 0 for recognizing and 1 for clipping",
        required=True
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Input file path. For multiple videos, separate paths with commas to auto-concatenate with transitions (stage 1 only).",
        required=True
    )
    parser.add_argument(
        "--sd_switch",
        type=str,
        choices=("no", "yes"),
        default="no",
        help="Turn on the speaker diarization or not",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default='./output',
        help="Output files path",
    )
    parser.add_argument(
        "--dest_text",
        type=str,
        default=None,
        help="Destination text string for clipping",
    )
    parser.add_argument(
        "--dest_spk",
        type=str,
        default=None,
        help="Destination spk id for clipping",
    )
    parser.add_argument(
        "--start_ost",
        type=int,
        default=0,
        help="Offset time in ms at beginning for clipping"
    )
    parser.add_argument(
        "--end_ost",
        type=int,
        default=0,
        help="Offset time in ms at ending for clipping"
    )
    parser.add_argument(
        "--output_file",
        type=str,
        default=None,
        help="Output file path"
    )
    parser.add_argument(
        "--lang",
        type=str,
        default='zh',
        help="language"
    )
    parser.add_argument(
        "--std_fps",
        type=int,
        default=None,
        help="Optional: standardize video FPS before recognition (e.g., 25). Disabled if None.",
    )
    parser.add_argument(
        "--std_size",
        type=str,
        default=None,
        help="Optional: standardize video resolution like 1280x720 before recognition. Disabled if None.",
    )
    parser.add_argument(
        "--pre_audio_16k_mono",
        action='store_true',
        help="Optional: convert audio to 16k mono before recognition (video/audio).",
    )
    parser.add_argument(
        "--pre_audio_rms_norm",
        action='store_true',
        help="Optional: RMS normalize audio before recognition.",
    )
    parser.add_argument(
        "--pre_audio_highpass",
        action='store_true',
        help="Optional: apply simple high-pass (pre-emphasis) before recognition.",
    )
    parser.add_argument(
        "--pre_audio_denoise",
        action='store_true',
        help="Optional: light spectral denoise before recognition.",
    )
    parser.add_argument(
        "--pre_audio_damage_fix",
        action='store_true',
        help="Optional: basic damage fix (NaN/inf/clip) before recognition.",
    )
    parser.add_argument(
        "--pre_audio_lufs_norm",
        action='store_true',
        help="Optional: approximate LUFS normalization before recognition.",
    )
    parser.add_argument(
        "--pre_audio_trim_silence",
        action='store_true',
        help="Optional: trim leading/trailing silence before recognition.",
    )
    parser.add_argument(
        "--pre_audio_target_lufs",
        type=float,
        default=-20.0,
        help="Target LUFS when --pre_audio_lufs_norm is enabled.",
    )
    parser.add_argument(
        "--pre_video_h264",
        action='store_true',
        help="Optional: re-encode video using H.264 (libx264).",
    )
    parser.add_argument(
        "--pre_video_bitrate",
        type=str,
        default=None,
        help="Optional: target video bitrate (e.g., 2M).",
    )
    parser.add_argument(
        "--pre_video_cfr",
        action='store_true',
        help="Optional: force constant frame rate output.",
    )
    return parser


def preprocess_video_once(file_path, target_fps=None, target_size=None, to_16k_mono=False, output_dir=None):
    clip = mpy.VideoFileClip(file_path)
    if target_size is not None and clip.size != list(target_size):
        clip = clip.resize(newsize=target_size)
    if target_fps is not None:
        clip = clip.set_fps(target_fps)
    if to_16k_mono and clip.audio is not None:
        temp_audio = file_path + ".tmp.wav"
        clip.audio.write_audiofile(temp_audio, fps=16000, nbytes=2, codec="pcm_s16le", ffmpeg_params=["-ac", "1"])
        new_audio = AudioFileClip(temp_audio)
        clip = clip.set_audio(new_audio)
    base = os.path.basename(file_path)
    pre_name = "pre_" + base
    if output_dir is None:
        output_dir = os.path.dirname(file_path)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, pre_name)
    clip.write_videofile(out_path, fps=target_fps or clip.fps, audio_codec="aac")
    clip.close()
    return out_path


def preprocess_audio_once(file_path, to_16k_mono=False, output_dir=None):
    if not to_16k_mono:
        return file_path
    wav, sr = librosa.load(file_path, sr=None, mono=False)
    if wav.ndim > 1:
        wav = wav[0]
    if sr != 16000:
        wav = librosa.resample(wav, orig_sr=sr, target_sr=16000)
        sr = 16000
    base = os.path.basename(file_path)
    pre_name = "pre_" + base
    if output_dir is None:
        output_dir = os.path.dirname(file_path)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, pre_name)
    sf.write(out_path, wav, sr)
    return out_path


def runner(stage, file, sd_switch, output_dir, dest_text, dest_spk, start_ost, end_ost, output_file, config=None, lang='zh',
           std_fps=None, std_size=None, pre_audio_16k_mono=False, pre_audio_rms_norm=False, pre_audio_highpass=False,
           pre_audio_denoise=False, pre_audio_damage_fix=False, pre_audio_lufs_norm=False, pre_audio_trim_silence=False,
           pre_audio_target_lufs=-20.0, pre_video_h264=False, pre_video_bitrate=None, pre_video_cfr=False):
    audio_suffixs = ['.wav','.mp3','.aac','.m4a','.flac']
    video_suffixs = ['.mp4','.avi','.mkv','.flv','.mov','.webm','.ts','.mpeg']

    def parse_input_files(file_arg):
        return [f.strip() for f in file_arg.split(',') if f.strip()]

    input_files = parse_input_files(file)
    if len(input_files) > 1:
        if stage != 1:
            logging.error("Multiple input files are supported only in stage 1. Please run stage 1 to generate the merged video first.")
            sys.exit(1)
        non_video = [f for f in input_files if os.path.splitext(f)[1].lower() not in video_suffixs]
        if len(non_video):
            logging.error("All multiple inputs must be video files. Non-video inputs: {}".format(non_video))
            sys.exit(1)
        logging.warning("Concatenating {} videos with transitions...".format(len(input_files)))
        merged_path = concat_videos(
            inputs=[Path(f).expanduser().resolve() for f in input_files],
            target_size=None,
            target_fps=25,
            target_audio_fps=44100,
            transition_duration=1.0,
            output_dir=Path("examples").resolve(),
            overwrite=True,
        )
        logging.warning("Merged video saved to {}".format(merged_path))
        file = str(merged_path)

    _,ext = os.path.splitext(file)
    if ext.lower() in audio_suffixs:
        mode = 'audio'
    elif ext.lower() in video_suffixs:
        mode = 'video'
    else:
        logging.error("Unsupported file format: {}\n\nplease choise one of the following: {}".format(file),audio_suffixs+video_suffixs)
        sys.exit(1) # exit if the file is not supported

    target_size = parse_size(std_size) if std_size is not None else None
    if stage == 1 and (std_fps is not None or target_size is not None or pre_audio_16k_mono or pre_audio_rms_norm or pre_audio_highpass or pre_audio_denoise or pre_audio_damage_fix or pre_audio_lufs_norm or pre_audio_trim_silence or pre_video_h264 or pre_video_bitrate or pre_video_cfr):
        logging.warning("Preprocessing input with standardization options...")
        if mode == 'video':
            file = preprocess_video_once(file,
                                         target_fps=std_fps,
                                         target_size=target_size,
                                         to_16k_mono=pre_audio_16k_mono,
                                         force_h264=pre_video_h264,
                                         target_bitrate=pre_video_bitrate,
                                         force_cfr=pre_video_cfr,
                                         output_dir=output_dir)
            logging.warning("Preprocessed video saved to {}".format(file))
        elif mode == 'audio':
            file = preprocess_audio_once(file,
                                         to_16k_mono=pre_audio_16k_mono,
                                         rms_norm=pre_audio_rms_norm,
                                         highpass=pre_audio_highpass,
                                         denoise=pre_audio_denoise,
                                         damage_fix=pre_audio_damage_fix,
                                         lufs_norm=pre_audio_lufs_norm,
                                         target_lufs=pre_audio_target_lufs,
                                         trim_silence=pre_audio_trim_silence,
                                         output_dir=output_dir)
            logging.warning("Preprocessed audio saved to {}".format(file))
    while output_dir.endswith('/'):
        output_dir = output_dir[:-1]
    if not os.path.exists(output_dir):
        os.mkdir(output_dir)
    if stage == 1:
        from funasr import AutoModel
        # initialize funasr automodel
        logging.warning("Initializing modelscope asr pipeline.")
        if lang == 'zh':
            funasr_model = AutoModel(model="iic/speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
                    vad_model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                    punc_model="damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
                    spk_model="damo/speech_campplus_sv_zh-cn_16k-common",
                    )
            audio_clipper = VideoClipper(funasr_model)
            audio_clipper.lang = 'zh'
        elif lang == 'en':
            funasr_model = AutoModel(model="iic/speech_paraformer_asr-en-16k-vocab4199-pytorch",
                                vad_model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                                punc_model="damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
                                spk_model="damo/speech_campplus_sv_zh-cn_16k-common",
                                )
            audio_clipper = VideoClipper(funasr_model)
            audio_clipper.lang = 'en'
        if mode == 'audio':
            logging.warning("Recognizing audio file: {}".format(file))
            wav, sr = librosa.load(file, sr=16000)
            res_text, res_srt, state = audio_clipper.recog((sr, wav), sd_switch)
        if mode == 'video':
            logging.warning("Recognizing video file: {}".format(file))
            res_text, res_srt, state = audio_clipper.video_recog(file, sd_switch)
        total_srt_file = output_dir + '/total.srt'
        with open(total_srt_file, 'w') as fout:
            fout.write(res_srt)
            logging.warning("Write total subtitle to {}".format(total_srt_file))
        write_state(output_dir, state)
        logging.warning("Recognition successed. You can copy the text segment from below and use stage 2.")
        print(res_text)
    if stage == 2:
        audio_clipper = VideoClipper(None)
        if mode == 'audio':
            state = load_state(output_dir)
            wav, sr = librosa.load(file, sr=16000)
            state['audio_input'] = (sr, wav)
            (sr, audio), message, srt_clip = audio_clipper.clip(dest_text, start_ost, end_ost, state, dest_spk=dest_spk)
            if output_file is None:
                output_file = output_dir + '/result.wav'
            clip_srt_file = output_file[:-3] + 'srt'
            logging.warning(message)
            sf.write(output_file, audio, 16000)
            assert output_file.endswith('.wav'), "output_file must ends with '.wav'"
            logging.warning("Save clipped wav file to {}".format(output_file))
            with open(clip_srt_file, 'w') as fout:
                fout.write(srt_clip)
                logging.warning("Write clipped subtitle to {}".format(clip_srt_file))
        if mode == 'video':
            state = load_state(output_dir)
            state['video_filename'] = file
            if output_file is None:
                state['clip_video_file'] = file[:-4] + '_clip.mp4'
            else:
                state['clip_video_file'] = output_file
            clip_srt_file = state['clip_video_file'][:-3] + 'srt'
            state['video'] = mpy.VideoFileClip(file)
            clip_video_file, message, srt_clip = audio_clipper.video_clip(dest_text, start_ost, end_ost, state, dest_spk=dest_spk)
            logging.warning("Clipping Log: {}".format(message))
            logging.warning("Save clipped mp4 file to {}".format(clip_video_file))
            with open(clip_srt_file, 'w') as fout:
                fout.write(srt_clip)
                logging.warning("Write clipped subtitle to {}".format(clip_srt_file))


def main(cmd=None):
    print(get_commandline_args(), file=sys.stderr)
    parser = get_parser()
    args = parser.parse_args(cmd)
    kwargs = vars(args)
    runner(**kwargs)


if __name__ == '__main__':
    main()
