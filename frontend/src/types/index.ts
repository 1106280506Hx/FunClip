// ==========================================
/**
 * Core Type Definitions for VibeClip Frontend
 */
// ==========================================

// Video & Media Types
export interface VideoFile {
  id: string;
  name: string;
  path: string;
  duration: number;        // in seconds
  width: number;
  height: number;
  fps: number;
  size: number;            // in bytes
  format: string;
  thumbnail: string;
  createdAt: Date;
  status: ProcessingStatus;
}

export type ProcessingStatus =
  | 'uploading'
  | 'transcoding'
  | 'splitting'
  | 'analyzing'
  | 'ready'
  | 'error';

// Semantic Analysis Types
export interface SemanticTag {
  id: string;
  category: TagCategory;
  label: string;
  confidence: number;      // 0-1
  startTime: number;
  endTime: number;
}

export type TagCategory =
  | 'scene'
  | 'object'
  | 'person'
  | 'action'
  | 'emotion'
  | 'audio'
  | 'text';

export interface KeyFrame {
  id: string;
  videoId: string;
  timestamp: number;
  thumbnail: string;
  tags: SemanticTag[];
  isSelected: boolean;
}

export interface VideoSegment {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  transcript: string;
  tags: SemanticTag[];
  keyFrames: KeyFrame[];
}

// AI Director Types
export type EmotionType =
  | 'warm'
  | 'lively'
  | 'tense'
  | 'calm'
  | 'sad'
  | 'exciting'
  | 'romantic'
  | 'mysterious';

export interface EmotionConfig {
  type: EmotionType;
  intensity: number;       // 0-100
  label: string;
  color: string;
  icon: string;
}

export type StyleTemplate =
  | 'vlog'
  | 'cinematic'
  | 'fast-cut'
  | 'documentary'
  | 'travel'
  | 'product'
  | 'interview';

export interface StyleConfig {
  id: StyleTemplate;
  name: string;
  description: string;
  thumbnail: string;
  transitionStyle: string;
  colorGrading: string;
  paceMultiplier: number;
}

export interface MusicConfig {
  source: 'upload' | 'generated' | 'library';
  file?: File;
  generatedUrl?: string;
  bpm: number;
  genre: string;
  mood: string;
}

// Timeline Types
export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  isMuted: boolean;
  isLocked: boolean;
  volume: number;
}

export type TrackType = 'video' | 'audio' | 'subtitle' | 'effect';

export interface TimelineClip {
  id: string;
  trackId: string;
  sourceId: string;
  startTime: number;       // position on timeline
  endTime: number;
  sourceStart: number;     // position in source
  sourceEnd: number;
  transition?: TransitionConfig;
}

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'zoom'
  | 'slide';

export interface BeatMarker {
  id: string;
  timestamp: number;
  strength: number;        // 0-1, beat intensity
  isSnapped: boolean;      // if a clip is snapped to this beat
}

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
}

// Project Types
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail: string;
  videos: VideoFile[];
  timeline: TimelineTrack[];
  subtitles: Subtitle[];
  beatMarkers: BeatMarker[];
  emotionConfig: EmotionConfig;
  styleConfig: StyleConfig;
  musicConfig?: MusicConfig;
  exportHistory: ExportRecord[];
}

// Export Types
export interface ExportConfig {
  format: ExportFormat;
  resolution: Resolution;
  quality: Quality;
  platforms: Platform[];
  includeSubtitles: boolean;
  watermark?: string;
}

export type ExportFormat = 'mp4' | 'mov' | 'webm' | 'gif';
export type Resolution = '720p' | '1080p' | '4k';
export type Quality = 'draft' | 'standard' | 'high';
export type Platform = 'douyin' | 'bilibili' | 'youtube' | 'xiaohongshu' | 'custom';

export interface ExportRecord {
  id: string;
  config: ExportConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  createdAt: Date;
  qualityReport?: QualityReport;
}

export interface QualityReport {
  rhythmScore: number;     // 0-100
  emotionMatch: number;    // 0-100
  transitionQuality: number;
  audioSync: number;
  overallScore: number;
  suggestions: string[];
}

// AI Prompt Types
export interface AIPrompt {
  id: string;
  message: string;
  timestamp: Date;
  response?: AIResponse;
}

export interface AIResponse {
  message: string;
  actions: AIAction[];
  timestamp: Date;
}

export interface AIAction {
  type: 'adjust_pace' | 'add_transition' | 'change_music' | 'modify_subtitle' | 'trim_segment';
  description: string;
  applied: boolean;
}

// UI State Types
export interface UIState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  previewQuality: Resolution;
  currentView: ViewMode;
}

export type ViewMode = 'dashboard' | 'editor' | 'export';

// Search & Filter Types
export interface SearchQuery {
  text: string;
  tags?: TagCategory[];
  timeRange?: [number, number];
  speakers?: string[];
}

export interface SearchResult {
  segments: VideoSegment[];
  keyFrames: KeyFrame[];
  relevanceScores: Map<string, number>;
}
