import numpy as np
import logging
from sentence_transformers import SentenceTransformer, util

class Director:
    def __init__(self, music_manager):
        self.music_manager = music_manager
        # 加载轻量级语义模型
        logging.info("Loading text embedding model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('/remote-home/share/huggingface/all-MiniLM-L6-v2')
        # 相似度阈值：低于此值视为内容发生变化
        # 0.6 是一个经验值，既能容忍 "Snow" vs "Winter" 的差异，又能区分 "Kitchen" vs "Forest"
        self.similarity_threshold = 0.6 

    def _calculate_similarity(self, text1, text2):
        """
        计算两个文本的余弦相似度
        """
        if not text1 or not text2:
            # 如果其中一个是空的，视为完全不同 (0.0)，除非两个都空 (1.0)
            return 1.0 if text1 == text2 else 0.0
            
        embeddings1 = self.model.encode(text1, convert_to_tensor=True)
        embeddings2 = self.model.encode(text2, convert_to_tensor=True)
        score = util.cos_sim(embeddings1, embeddings2)
        return score.item()

    # def analyze_chapters(self, shots_data, asr_sentences):
    #     """
    #     阶段一：语义分段 (Semantic Segmentation)
    #     """
    #     chapters = []
    #     if not shots_data:
    #         return []

    #     # 初始章节
    #     current_chapter = {
    #         "start": shots_data[0]['start'],
    #         "shots": [shots_data[0]],
    #         "tags": shots_data[0]['tags']
    #     }

    #     for i in range(1, len(shots_data)):
    #         curr = shots_data[i]
    #         prev = shots_data[i-1]
            
    #         # --- 核心修改点 1: 分段逻辑使用相似度 ---
    #         curr_scene = curr['tags'].get('Scene', '')
    #         prev_scene = prev['tags'].get('Scene', '')
    #         curr_emo = curr['tags'].get('Emotion', '')
    #         prev_emo = prev['tags'].get('Emotion', '')

    #         # 计算相似度
    #         scene_sim = self._calculate_similarity(curr_scene, prev_scene)
    #         emo_sim = self._calculate_similarity(curr_emo, prev_emo)
            
    #         # 相似度 < 阈值，意味着发生了变化
    #         scene_changed = scene_sim < self.similarity_threshold
    #         emo_changed = emo_sim < self.similarity_threshold
            
    #         # 最小章节长度限制 (60秒)
    #         curr_duration = prev['end'] - current_chapter['start']
            
    #         if (scene_changed or emo_changed) and curr_duration > 60.0:
    #             current_chapter['end'] = prev['end']
    #             chapters.append(current_chapter)
                
    #             current_chapter = {
    #                 "start": curr['start'],
    #                 "shots": [curr],
    #                 "tags": curr['tags']
    #             }
    #         else:
    #             current_chapter['shots'].append(curr)

    #     current_chapter['end'] = shots_data[-1]['end']
    #     chapters.append(current_chapter)
    #     return chapters

    # def plan_audio(self, chapters, asr_sentences):
    #     """
    #     阶段二：配乐策略 (Music Planning)
    #     """
    #     plan = []
    #     for chap in chapters:
    #         # 使用 MusicManager 的语义检索
    #         music_file = self.music_manager.retrieve_track(chap['tags'])
            
    #         # 计算闪避区间
    #         ducking_list = []
    #         c_start, c_end = chap['start'], chap['end']
            
    #         if asr_sentences:
    #             for sent in asr_sentences:
    #                 s_start = sent['timestamp'][0][0] / 1000.0 
    #                 s_end = sent['timestamp'][-1][1] / 1000.0
                    
    #                 if s_end > c_start and s_start < c_end:
    #                     d_s = max(c_start, s_start)
    #                     d_e = min(c_end, s_end)
    #                     ducking_list.append((d_s, d_e))
            
    #         plan.append({
    #             "start": c_start,
    #             "end": c_end,
    #             "music_path": music_file,
    #             "ducking": ducking_list
    #         })
    #     return plan

    def decide_transitions(self, shots):
        """
        基于语义相似度决定转场类型
        """
        transitions = []
        import random # 引入随机增加趣味性
        
        for i in range(len(shots) - 1):
            curr = shots[i]
            next_s = shots[i+1]
            
            t_type = "cut"
            duration = 0.0
            
            curr_scene = curr['tags'].get('Scene', '')
            next_scene = next_s['tags'].get('Scene', '')
            curr_mood = curr['tags'].get('Mood', curr['tags'].get('Emotion', ''))
            next_mood = next_s['tags'].get('Mood', next_s['tags'].get('Emotion', ''))
            
            scene_sim = self._calculate_similarity(curr_scene, next_scene)
            mood_sim = self._calculate_similarity(curr_mood, next_mood)
            
            # [修改] 更加丰富的转场决策逻辑
            if scene_sim < 0.4:
                # 场景差异巨大 -> 使用推镜 (Slide) 或 划像 (Wipe)
                t_type = random.choice(["slide_left", "slide_up", "zoom_in"])
                duration = 0.6
                
            elif scene_sim < 0.7:
                # 场景有变化但不大 -> 叠化 (Crossfade)
                t_type = "crossfade"
                duration = 0.5
                
            elif mood_sim < 0.5:
                # 氛围突变 -> 故障风 (Glitch) 或 黑场
                t_type = "fade_black" if "sad" in next_mood.lower() else "glitch"
                duration = 0.4
            
            else:
                # 默认: 硬切 (快节奏)
                t_type = "cut"
                duration = 0.0
            
            transitions.append({"type": t_type, "duration": duration})
        return transitions