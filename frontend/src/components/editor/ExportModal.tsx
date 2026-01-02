import { useState } from 'react'
import {
  X,
  Download,
  Check,
  AlertCircle,
  ChevronDown,
  Monitor,
  Smartphone
} from 'lucide-react'
import { cn } from '../../utils/helpers'
import { useExportStore } from '../../store'
import { mockQualityReport } from '../../data/mockData'
import type { ExportFormat, Resolution, Quality, Platform } from '../../types'

export function ExportModal() {
  const {
    config,
    setConfig,
    isExporting,
    progress,
    qualityReport,
    setShowExportModal,
    setIsExporting,
    setProgress,
    setQualityReport,
  } = useExportStore()

  const [activeTab, setActiveTab] = useState<'settings' | 'quality'>('settings')

  const handleExport = () => {
    setIsExporting(true)
    setQualityReport(mockQualityReport)

    // Simulate export progress
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 5
      setProgress(currentProgress)
      if (currentProgress >= 100) {
        clearInterval(interval)
        setIsExporting(false)
      }
    }, 200)
  }

  const handleClose = () => {
    if (!isExporting) {
      setShowExportModal(false)
    }
  }

  const platforms: { id: Platform; label: string; icon: React.ReactNode; ratio: string }[] = [
    { id: 'douyin', label: '抖音', icon: <Smartphone className="w-4 h-4" />, ratio: '9:16' },
    { id: 'bilibili', label: 'B站', icon: <Monitor className="w-4 h-4" />, ratio: '16:9' },
    { id: 'xiaohongshu', label: '小红书', icon: <Smartphone className="w-4 h-4" />, ratio: '3:4' },
    { id: 'youtube', label: 'YouTube', icon: <Monitor className="w-4 h-4" />, ratio: '16:9' },
  ]

  const formats: { id: ExportFormat; label: string }[] = [
    { id: 'mp4', label: 'MP4' },
    { id: 'mov', label: 'MOV' },
    { id: 'webm', label: 'WebM' },
  ]

  const resolutions: { id: Resolution; label: string }[] = [
    { id: '720p', label: '720p HD' },
    { id: '1080p', label: '1080p Full HD' },
    { id: '4k', label: '4K Ultra HD' },
  ]

  const qualities: { id: Quality; label: string; description: string }[] = [
    { id: 'draft', label: '草稿', description: '快速预览，较低质量' },
    { id: 'standard', label: '标准', description: '平衡质量与大小' },
    { id: 'high', label: '高质量', description: '最佳画质，文件较大' },
  ]

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">导出视频</h2>
              <p className="text-sm text-dark-400">选择导出设置并生成视频</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 mb-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'settings'
                ? 'text-white border-accent-primary'
                : 'text-dark-400 border-transparent hover:text-dark-200'
            )}
          >
            导出设置
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'quality'
                ? 'text-white border-accent-primary'
                : 'text-dark-400 border-transparent hover:text-dark-200'
            )}
          >
            质量检查
          </button>
        </div>

        {activeTab === 'settings' ? (
          <div className="space-y-6">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-3">
                目标平台 <span className="text-dark-400 font-normal">（可多选）</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                  const isSelected = config.platforms.includes(platform.id)
                  return (
                    <button
                      key={platform.id}
                      onClick={() => {
                        const newPlatforms = isSelected
                          ? config.platforms.filter((p) => p !== platform.id)
                          : [...config.platforms, platform.id]
                        setConfig({ platforms: newPlatforms })
                      }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-dark-600 hover:border-dark-500'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-accent-primary/20' : 'bg-dark-700'
                      )}>
                        {platform.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white">{platform.label}</div>
                        <div className="text-xs text-dark-400">{platform.ratio}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-accent-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Format & Resolution */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">格式</label>
                <div className="relative">
                  <select
                    value={config.format}
                    onChange={(e) => setConfig({ format: e.target.value as ExportFormat })}
                    className="input appearance-none pr-10"
                  >
                    {formats.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">分辨率</label>
                <div className="relative">
                  <select
                    value={config.resolution}
                    onChange={(e) => setConfig({ resolution: e.target.value as Resolution })}
                    className="input appearance-none pr-10"
                  >
                    {resolutions.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-3">输出质量</label>
              <div className="flex gap-3">
                {qualities.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setConfig({ quality: q.id })}
                    className={cn(
                      'flex-1 p-3 rounded-lg border text-center transition-all',
                      config.quality === q.id
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-dark-600 hover:border-dark-500'
                    )}
                  >
                    <div className="font-medium text-white">{q.label}</div>
                    <div className="text-xs text-dark-400 mt-0.5">{q.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between py-3 border-t border-dark-700">
              <div>
                <div className="font-medium text-white">包含字幕</div>
                <div className="text-xs text-dark-400">将字幕烧录到视频中</div>
              </div>
              <button
                onClick={() => setConfig({ includeSubtitles: !config.includeSubtitles })}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  config.includeSubtitles ? 'bg-accent-primary' : 'bg-dark-600'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    config.includeSubtitles ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {qualityReport ? (
              <>
                {/* Overall Score */}
                <div className="text-center p-6 rounded-xl bg-dark-700/50">
                  <div className="text-5xl font-bold text-white mb-2">
                    {qualityReport.overallScore}
                    <span className="text-lg text-dark-400 font-normal">/100</span>
                  </div>
                  <div className="text-dark-400">综合评分</div>
                </div>

                {/* Detailed Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <ScoreItem label="节奏流畅度" score={qualityReport.rhythmScore} />
                  <ScoreItem label="转场质量" score={qualityReport.transitionQuality} />
                  <ScoreItem label="音画同步" score={qualityReport.audioSync} />
                </div>

                {/* Suggestions */}
                {qualityReport.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-dark-200 mb-3">优化建议</h4>
                    <div className="space-y-2">
                      {qualityReport.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 rounded-lg bg-dark-700/50"
                        >
                          <AlertCircle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-dark-200">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-dark-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>点击"导出"后将显示质量检查报告</p>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar (when exporting) */}
        {isExporting && (
          <div className="mt-6 p-4 rounded-lg bg-dark-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">正在导出...</span>
              <span className="text-sm text-accent-primary">{progress}%</span>
            </div>
            <div className="progress-bar h-2">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-dark-400 mt-2">
              {progress < 30 && '正在编码视频轨道...'}
              {progress >= 30 && progress < 60 && '正在处理音频轨道...'}
              {progress >= 60 && progress < 90 && '正在生成多平台版本...'}
              {progress >= 90 && '即将完成...'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-dark-700">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="btn btn-secondary"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || config.platforms.length === 0}
            className={cn(
              'btn btn-primary',
              (isExporting || config.platforms.length === 0) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Score Item Component
interface ScoreItemProps {
  label: string
  score: number
}

function ScoreItem({ label, score }: ScoreItemProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-accent-success'
    if (s >= 70) return 'text-accent-warning'
    return 'text-accent-error'
  }

  const getScoreLabel = (s: number) => {
    if (s >= 90) return '优秀'
    if (s >= 80) return '良好'
    if (s >= 70) return '一般'
    return '需改进'
  }

  return (
    <div className="p-3 rounded-lg bg-dark-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dark-300">{label}</span>
        <span className={cn('text-sm font-medium', getScoreColor(score))}>
          {getScoreLabel(score)}
        </span>
      </div>
      <div className="progress-bar h-1.5">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 90 ? 'bg-accent-success' :
              score >= 70 ? 'bg-accent-warning' : 'bg-accent-error'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
