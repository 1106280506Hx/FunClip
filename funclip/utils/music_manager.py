import os
import random
import logging
import glob
from sentence_transformers import SentenceTransformer, util
import torch

class MusicManager:
    def __init__(self, music_root_dir):
        """
        :param music_root_dir: 音乐库根目录，例如 .../FunClip/music
        """
        self.music_root_dir = music_root_dir
        
        # 1. 扫描文件夹结构
        # 结构: { 'happy': ['path/to/1.mp3', ...], 'sad': [...] }
        self.library = self._scan_library()
        
        # 2. 加载模型
        logging.info("Loading embedding model for music retrieval...")
        self.model = SentenceTransformer('/remote-home/share/huggingface/all-MiniLM-L6-v2')
        
        # 3. 预计算文件夹名称(Tag)的向量
        self._precompute_tag_embeddings()
        
        logging.info(f"MusicManager initialized. Found {len(self.library)} categories.")

    def _scan_library(self):
        library = {}
        if not os.path.exists(self.music_root_dir):
            logging.error(f"Music root not found: {self.music_root_dir}")
            return library

        # 遍历根目录下的子文件夹
        for folder_name in os.listdir(self.music_root_dir):
            folder_path = os.path.join(self.music_root_dir, folder_name)
            if not os.path.isdir(folder_path):
                continue
            
            # 获取该文件夹下所有的音频文件
            # 支持 mp3 和 aac
            files = glob.glob(os.path.join(folder_path, "*.mp3")) + \
                    glob.glob(os.path.join(folder_path, "*.aac"))
            
            if files:
                library[folder_name] = files
                logging.info(f"Loaded category '{folder_name}': {len(files)} tracks")
        
        return library

    def _precompute_tag_embeddings(self):
        self.available_tags = list(self.library.keys())
        if not self.available_tags:
            logging.warning("No music categories found!")
            self.tag_embeddings = None
            return

        # 计算所有文件夹名称的 Embedding
        self.tag_embeddings = self.model.encode(self.available_tags, convert_to_tensor=True)

    def retrieve_track(self, video_summary_text):
        """
        根据视频摘要文本检索最匹配的音乐文件夹，并随机返回一首
        """
        if not self.library or self.tag_embeddings is None:
            return None

        # 1. 编码查询文本 (视频的 Mood/Event 摘要)
        query_embedding = self.model.encode(video_summary_text, convert_to_tensor=True)

        # 2. 计算相似度 (Query vs Folder Names)
        cos_scores = util.cos_sim(query_embedding, self.tag_embeddings)[0]

        # 3. 找到相似度最高的标签
        best_match_idx = torch.argmax(cos_scores).item()
        best_tag = self.available_tags[best_match_idx]
        best_score = cos_scores[best_match_idx].item()

        logging.info(f"Music Retrieval: Query='{video_summary_text}' -> Best Match Folder='{best_tag}' (Score: {best_score:.4f})")

        # 4. 从该文件夹随机选歌
        candidates = self.library[best_tag]
        if candidates:
            return random.choice(candidates)
        return None