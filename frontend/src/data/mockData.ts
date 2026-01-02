// ==========================================
/**
 * Mock Data for VibeClip Frontend Development
 */
// ==========================================

import {
  VideoFile,
  SemanticTag,
  KeyFrame,
  VideoSegment,
  EmotionConfig,
  StyleConfig,
  Project,
  TimelineTrack,
  BeatMarker,
  Subtitle,
  QualityReport,
} from '../types';

// Mock Video Files - 使用真实本地视频
export const mockVideos: VideoFile[] = [
  {
    id: 'video-1',
    name: '1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC.mp4',
    path: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC.mp4',
    duration: 182,
    width: 852,
    height: 480,
    fps: 24,
    size: 14719,
    format: 'mp4',
    thumbnail: '',
    createdAt: new Date('2025-12-19'),
    status: 'ready',
  },
];

// Mock Semantic Tags
export const mockTags: SemanticTag[] = [
  { id: 'tag-1', category: 'scene', label: '海边', confidence: 0.95, startTime: 0, endTime: 60 },
  { id: 'tag-2', category: 'scene', label: '日落', confidence: 0.92, startTime: 30, endTime: 90 },
  { id: 'tag-3', category: 'emotion', label: '欢快', confidence: 0.88, startTime: 0, endTime: 180 },
  { id: 'tag-4', category: 'object', label: '跑车', confidence: 0.91, startTime: 100, endTime: 150 },
  { id: 'tag-5', category: 'action', label: '奔跑', confidence: 0.85, startTime: 45, endTime: 75 },
  { id: 'tag-6', category: 'person', label: '情侣', confidence: 0.89, startTime: 60, endTime: 120 },
  { id: 'tag-7', category: 'audio', label: '海浪声', confidence: 0.94, startTime: 0, endTime: 180 },
  { id: 'tag-8', category: 'scene', label: '城市', confidence: 0.96, startTime: 0, endTime: 240 },
  { id: 'tag-9', category: 'scene', label: '夜景', confidence: 0.93, startTime: 0, endTime: 240 },
  { id: 'tag-10', category: 'object', label: '霓虹灯', confidence: 0.87, startTime: 30, endTime: 200 },
];

// Mock Key Frames
export const mockKeyFrames: KeyFrame[] = [
  {
    id: 'kf-1',
    videoId: 'video-1',
    timestamp: 15,
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=100&fit=crop',
    tags: [mockTags[0], mockTags[2]],
    isSelected: false,
  },
  {
    id: 'kf-2',
    videoId: 'video-1',
    timestamp: 45,
    thumbnail: 'https://images.unsplash.com/photo-1476673160081-cf065ac3b7ca?w=150&h=100&fit=crop',
    tags: [mockTags[1], mockTags[4]],
    isSelected: true,
  },
  {
    id: 'kf-3',
    videoId: 'video-1',
    timestamp: 90,
    thumbnail: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=150&h=100&fit=crop',
    tags: [mockTags[5], mockTags[6]],
    isSelected: false,
  },
  {
    id: 'kf-4',
    videoId: 'video-2',
    timestamp: 30,
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=150&h=100&fit=crop',
    tags: [mockTags[7], mockTags[8]],
    isSelected: false,
  },
  {
    id: 'kf-5',
    videoId: 'video-2',
    timestamp: 120,
    thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=150&h=100&fit=crop',
    tags: [mockTags[9]],
    isSelected: false,
  },
];

// 大理旅拍 VLOG 模拟片段数据
export const mockDaliShots: KeyFrame[] = [
  {
    id: 'shot-0',
    videoId: 'video-1',
    timestamp: 0,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_000_宁静_自然_日出日落.mp4',
    tags: [
      { id: 't-0-1', category: 'emotion', label: '宁静', confidence: 0.95, startTime: 0, endTime: 23.27 },
      { id: 't-0-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 0, endTime: 23.27 },
      { id: 't-0-3', category: 'scene', label: '日出日落', confidence: 0.85, startTime: 0, endTime: 23.27 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-1',
    videoId: 'video-1',
    timestamp: 23.27,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_001_宁静_自然_晴天.mp4',
    tags: [
      { id: 't-1-1', category: 'emotion', label: '宁静', confidence: 0.95, startTime: 23.27, endTime: 33.12 },
      { id: 't-1-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 23.27, endTime: 33.12 },
      { id: 't-1-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 23.27, endTime: 33.12 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-2',
    videoId: 'video-1',
    timestamp: 33.12,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_002_快乐_自然_晴天.mp4',
    tags: [
      { id: 't-2-1', category: 'emotion', label: '快乐', confidence: 0.95, startTime: 33.12, endTime: 42.92 },
      { id: 't-2-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 33.12, endTime: 42.92 },
      { id: 't-2-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 33.12, endTime: 42.92 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-3',
    videoId: 'video-1',
    timestamp: 42.92,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_003_中性_室内_室内.mp4',
    tags: [
      { id: 't-3-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 42.92, endTime: 44.79 },
      { id: 't-3-2', category: 'scene', label: '室内', confidence: 0.9, startTime: 42.92, endTime: 44.79 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-4',
    videoId: 'video-1',
    timestamp: 44.79,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_004_中性_交通_晴天.mp4',
    tags: [
      { id: 't-4-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 44.79, endTime: 47.13 },
      { id: 't-4-2', category: 'scene', label: '交通', confidence: 0.9, startTime: 44.79, endTime: 47.13 },
      { id: 't-4-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 44.79, endTime: 47.13 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-5',
    videoId: 'video-1',
    timestamp: 47.13,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_005_宁静_自然_晴天.mp4',
    tags: [
      { id: 't-5-1', category: 'emotion', label: '宁静', confidence: 0.95, startTime: 47.13, endTime: 49.76 },
      { id: 't-5-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 47.13, endTime: 49.76 },
      { id: 't-5-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 47.13, endTime: 49.76 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-6',
    videoId: 'video-1',
    timestamp: 49.76,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_006_宁静_自然_晴天.mp4',
    tags: [
      { id: 't-6-1', category: 'emotion', label: '宁静', confidence: 0.95, startTime: 49.76, endTime: 76.49 },
      { id: 't-6-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 49.76, endTime: 76.49 },
      { id: 't-6-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 49.76, endTime: 76.49 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-7',
    videoId: 'video-1',
    timestamp: 76.49,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_007_激动_自然_雪天.mp4',
    tags: [
      { id: 't-7-1', category: 'emotion', label: '激动', confidence: 0.95, startTime: 76.49, endTime: 89.38 },
      { id: 't-7-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 76.49, endTime: 89.38 },
      { id: 't-7-3', category: 'scene', label: '雪天', confidence: 0.85, startTime: 76.49, endTime: 89.38 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-8',
    videoId: 'video-1',
    timestamp: 89.38,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_008_宁静_自然_晴天.mp4',
    tags: [
      { id: 't-8-1', category: 'emotion', label: '宁静', confidence: 0.95, startTime: 89.38, endTime: 91.22 },
      { id: 't-8-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 89.38, endTime: 91.22 },
      { id: 't-8-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 89.38, endTime: 91.22 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-9',
    videoId: 'video-1',
    timestamp: 91.22,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_009_中性_室内_室内.mp4',
    tags: [
      { id: 't-9-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 91.22, endTime: 109.07 },
      { id: 't-9-2', category: 'scene', label: '室内', confidence: 0.9, startTime: 91.22, endTime: 109.07 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-10',
    videoId: 'video-1',
    timestamp: 109.07,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_010_中性_自然_多云.mp4',
    tags: [
      { id: 't-10-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 109.07, endTime: 110.53 },
      { id: 't-10-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 109.07, endTime: 110.53 },
      { id: 't-10-3', category: 'scene', label: '多云', confidence: 0.85, startTime: 109.07, endTime: 110.53 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-11',
    videoId: 'video-1',
    timestamp: 110.53,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_011_中性_街道_夜晚.mp4',
    tags: [
      { id: 't-11-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 110.53, endTime: 113.82 },
      { id: 't-11-2', category: 'scene', label: '街道', confidence: 0.9, startTime: 110.53, endTime: 113.82 },
      { id: 't-11-3', category: 'scene', label: '夜晚', confidence: 0.85, startTime: 110.53, endTime: 113.82 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-12',
    videoId: 'video-1',
    timestamp: 113.82,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_012_中性_街道_晴天.mp4',
    tags: [
      { id: 't-12-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 113.82, endTime: 121.91 },
      { id: 't-12-2', category: 'scene', label: '街道', confidence: 0.9, startTime: 113.82, endTime: 121.91 },
      { id: 't-12-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 113.82, endTime: 121.91 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-13',
    videoId: 'video-1',
    timestamp: 121.91,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_013_激动_自然_晴天.mp4',
    tags: [
      { id: 't-13-1', category: 'emotion', label: '激动', confidence: 0.95, startTime: 121.91, endTime: 137.64 },
      { id: 't-13-2', category: 'scene', label: '自然', confidence: 0.9, startTime: 121.91, endTime: 137.64 },
      { id: 't-13-3', category: 'scene', label: '晴天', confidence: 0.85, startTime: 121.91, endTime: 137.64 },
    ],
    isSelected: false,
  },
  {
    id: 'shot-14',
    videoId: 'video-1',
    timestamp: 137.64,
    thumbnail: '/mock_data/video_examples/1-【大理旅拍VLOG】毕业旅行｜不可错过的无缝转场｜高能｜踩点｜A6300-480P 标清-AVC/shot_014_中性_交通_多云.mp4',
    tags: [
      { id: 't-14-1', category: 'emotion', label: '中性', confidence: 0.95, startTime: 137.64, endTime: 182.77 },
      { id: 't-14-2', category: 'scene', label: '交通', confidence: 0.9, startTime: 137.64, endTime: 182.77 },
      { id: 't-14-3', category: 'scene', label: '多云', confidence: 0.85, startTime: 137.64, endTime: 182.77 },
    ],
    isSelected: false,
  },
];

// Mock Video Segments
export const mockSegments: VideoSegment[] = [
  {
    id: 'seg-1',
    videoId: 'video-1',
    startTime: 0,
    endTime: 60,
    transcript: '这是一段美丽的海边日落场景，温暖的阳光洒在金色的沙滩上。',
    tags: [mockTags[0], mockTags[1], mockTags[2]],
    keyFrames: [mockKeyFrames[0], mockKeyFrames[1]],
  },
  {
    id: 'seg-2',
    videoId: 'video-1',
    startTime: 60,
    endTime: 120,
    transcript: '情侣在沙滩上漫步，享受着这美好的时光。',
    tags: [mockTags[5], mockTags[6]],
    keyFrames: [mockKeyFrames[2]],
  },
  {
    id: 'seg-3',
    videoId: 'video-2',
    startTime: 0,
    endTime: 120,
    transcript: '繁华的城市夜景，霓虹灯闪烁着迷人的光芒。',
    tags: [mockTags[7], mockTags[8], mockTags[9]],
    keyFrames: [mockKeyFrames[3], mockKeyFrames[4]],
  },
];

// Mock Emotion Configurations
export const mockEmotions: EmotionConfig[] = [
  { type: 'warm', intensity: 70, label: '温暖', color: '#f59e0b', icon: '☀️' },
  { type: 'lively', intensity: 80, label: '活泼', color: '#22c55e', icon: '🎉' },
  { type: 'tense', intensity: 60, label: '紧张', color: '#ef4444', icon: '⚡' },
  { type: 'calm', intensity: 50, label: '平静', color: '#3b82f6', icon: '🌊' },
  { type: 'sad', intensity: 40, label: '忧伤', color: '#6366f1', icon: '🌧️' },
  { type: 'exciting', intensity: 90, label: '激动', color: '#ec4899', icon: '🔥' },
  { type: 'romantic', intensity: 65, label: '浪漫', color: '#f472b6', icon: '💕' },
  { type: 'mysterious', intensity: 55, label: '神秘', color: '#8b5cf6', icon: '🌙' },
];

// Mock Style Configurations
export const mockStyles: StyleConfig[] = [
  {
    id: 'vlog',
    name: 'Vlog 日常',
    description: '轻松自然的日常记录风格',
    thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=200&h=120&fit=crop',
    transitionStyle: 'smooth',
    colorGrading: 'natural',
    paceMultiplier: 1.0,
  },
  {
    id: 'cinematic',
    name: '电影感',
    description: '宽银幕比例，专业调色',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=120&fit=crop',
    transitionStyle: 'fade',
    colorGrading: 'cinematic',
    paceMultiplier: 0.8,
  },
  {
    id: 'fast-cut',
    name: '快节奏混剪',
    description: '动感剪辑，适合音乐视频',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=120&fit=crop',
    transitionStyle: 'cut',
    colorGrading: 'vibrant',
    paceMultiplier: 1.5,
  },
  {
    id: 'documentary',
    name: '纪录片',
    description: '沉稳叙事，深度记录',
    thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200&h=120&fit=crop',
    transitionStyle: 'dissolve',
    colorGrading: 'desaturated',
    paceMultiplier: 0.7,
  },
  {
    id: 'travel',
    name: '旅行大片',
    description: '壮丽风景，沉浸体验',
    thumbnail: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&h=120&fit=crop',
    transitionStyle: 'zoom',
    colorGrading: 'warm',
    paceMultiplier: 0.9,
  },
  {
    id: 'product',
    name: '产品展示',
    description: '专业展示，细节突出',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=120&fit=crop',
    transitionStyle: 'slide',
    colorGrading: 'clean',
    paceMultiplier: 0.6,
  },
];

// Mock Beat Markers
export const mockBeatMarkers: BeatMarker[] = [
  { id: 'beat-1', timestamp: 0, strength: 1, isSnapped: true },
  { id: 'beat-2', timestamp: 2.5, strength: 0.6, isSnapped: false },
  { id: 'beat-3', timestamp: 5, strength: 1, isSnapped: true },
  { id: 'beat-4', timestamp: 7.5, strength: 0.6, isSnapped: false },
  { id: 'beat-5', timestamp: 10, strength: 1, isSnapped: true },
  { id: 'beat-6', timestamp: 12.5, strength: 0.6, isSnapped: false },
  { id: 'beat-7', timestamp: 15, strength: 1, isSnapped: true },
  { id: 'beat-8', timestamp: 17.5, strength: 0.6, isSnapped: false },
  { id: 'beat-9', timestamp: 20, strength: 1, isSnapped: false },
  { id: 'beat-10', timestamp: 22.5, strength: 0.6, isSnapped: false },
  { id: 'beat-11', timestamp: 25, strength: 1, isSnapped: true },
  { id: 'beat-12', timestamp: 27.5, strength: 0.6, isSnapped: false },
  { id: 'beat-13', timestamp: 30, strength: 1, isSnapped: true },
];

// Mock Subtitles
export const mockSubtitles: Subtitle[] = [
  {
    id: 'sub-1',
    startTime: 0,
    endTime: 5,
    text: '这是一段美丽的海边日落场景',
    speaker: '旁白',
    style: { fontFamily: 'sans-serif', fontSize: 24, color: '#ffffff', position: 'bottom' },
  },
  {
    id: 'sub-2',
    startTime: 5,
    endTime: 12,
    text: '温暖的阳光洒在金色的沙滩上',
    speaker: '旁白',
    style: { fontFamily: 'sans-serif', fontSize: 24, color: '#ffffff', position: 'bottom' },
  },
  {
    id: 'sub-3',
    startTime: 12,
    endTime: 20,
    text: '让我们一起享受这美好的时光',
    speaker: '旁白',
    style: { fontFamily: 'sans-serif', fontSize: 24, color: '#ffffff', position: 'bottom' },
  },
  {
    id: 'sub-4',
    startTime: 20,
    endTime: 28,
    text: '感受大自然带来的宁静与美好',
    speaker: '旁白',
    style: { fontFamily: 'sans-serif', fontSize: 24, color: '#ffffff', position: 'bottom' },
  },
];

// Mock Timeline Tracks - 初始化时轨道为空，等待用户拖入素材
export const createTimelineTracks = (_videoDuration: number): TimelineTrack[] => [
  {
    id: 'track-video-1',
    type: 'video',
    name: '视频轨道',
    isMuted: false,
    isLocked: false,
    volume: 100,
    clips: [], // 初始为空，用户拖入后添加
  },
  {
    id: 'track-audio-1',
    type: 'audio',
    name: '背景音乐',
    isMuted: false,
    isLocked: false,
    volume: 80,
    clips: [], // 初始为空
  },
];

// 默认时间轨道（用于初始化）
export const mockTimelineTracks: TimelineTrack[] = createTimelineTracks(60);

// Mock Quality Report
export const mockQualityReport: QualityReport = {
  rhythmScore: 92,
  emotionMatch: 85,
  transitionQuality: 88,
  audioSync: 95,
  overallScore: 90,
  suggestions: [
    '建议在第15秒处添加一个过渡效果',
    '背景音乐与画面情绪匹配度可以进一步优化',
    '字幕显示时间建议延长0.5秒',
  ],
};

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: "大理旅游混剪",
    createdAt: new Date('2024-12-11'),
    updatedAt: new Date('2024-12-12'),
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300&h=200&fit=crop',
    videos: [mockVideos[1]],
    timeline: [],
    subtitles: [],
    beatMarkers: [],
    emotionConfig: mockEmotions[5],
    styleConfig: mockStyles[2],
    exportHistory: [],
  },
];

// Mock Waveform Data (for audio visualization)
export const generateMockWaveform = (duration: number, samplesPerSecond: number = 10): number[] => {
  const totalSamples = duration * samplesPerSecond;
  const waveform: number[] = [];

  for (let i = 0; i < totalSamples; i++) {
    // Generate a somewhat realistic waveform pattern
    const baseAmplitude = 0.3 + Math.random() * 0.4;
    const beatPulse = Math.sin(i * 0.5) * 0.2;
    const noise = (Math.random() - 0.5) * 0.2;
    waveform.push(Math.max(0, Math.min(1, baseAmplitude + beatPulse + noise)));
  }

  return waveform;
};

// AI Chat Mock Responses
export const mockAIResponses = [
  {
    prompt: '把节奏调快一点',
    response: '好的，我已将视频节奏加快了20%。主要调整了以下片段：\n- 0:15-0:30 缩短至10秒\n- 1:00-1:20 增加了快速切换\n请预览确认效果。',
    actions: [
      { type: 'adjust_pace' as const, description: '加快整体节奏20%', applied: true },
      { type: 'add_transition' as const, description: '添加快速切换转场', applied: true },
    ],
  },
  {
    prompt: '去掉无聊的停顿',
    response: '已检测并移除了3处静止画面超过3秒的片段：\n- 0:45-0:52 (7秒静止)\n- 1:30-1:35 (5秒停顿)\n- 2:10-2:14 (4秒空白)\n总共节省了16秒。',
    actions: [
      { type: 'trim_segment' as const, description: '移除3处无效片段', applied: true },
    ],
  },
  {
    prompt: '添加更多转场效果',
    response: '我为所有片段连接处添加了自然的转场效果：\n- 使用溶解过渡(Dissolve)保持温暖氛围\n- 在节奏点处使用快速切换\n共添加了8处转场。',
    actions: [
      { type: 'add_transition' as const, description: '添加溶解过渡效果', applied: true },
      { type: 'add_transition' as const, description: '在节奏点添加快速切换', applied: true },
    ],
  },
];
