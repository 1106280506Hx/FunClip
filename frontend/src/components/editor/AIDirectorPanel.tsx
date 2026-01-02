import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Music2,
  Wand2,
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react'
import { cn } from '../../utils/helpers'
import { useAIDirectorStore } from '../../store'
import type { StyleConfig } from '../../types'
import { mockAIResponses } from '../../data/mockData'

export function AIDirectorPanel() {
  const [activeSection, setActiveSection] = useState<'style' | 'music' | 'prompt'>('style')
  const { isProcessing, setIsProcessing, setGeneratedVideoUrl } = useAIDirectorStore()

  const handleGenerate = () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    // 模拟生成过程，增加一点随机感和卡顿感
    setTimeout(() => {
      setIsProcessing(false)
      setGeneratedVideoUrl('/mock_data/result_examples/1-大理旅拍VLOG毕业旅行不可错过的无缝转场高能踩点A6300-480P 标清-AVC_musical_1765968990.mp4')
    }, 15000) 
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-white">AI 导演控制台</h2>
        </div>
        <p className="text-xs text-dark-400">配置风格、音乐和指令，让AI帮你智能剪辑</p>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-dark-700">
        <SectionTab
          active={activeSection === 'style'}
          onClick={() => setActiveSection('style')}
          icon={<Sparkles className="w-4 h-4" />}
          label="风格"
        />
        <SectionTab
          active={activeSection === 'music'}
          onClick={() => setActiveSection('music')}
          icon={<Music2 className="w-4 h-4" />}
          label="音乐"
        />
        <SectionTab
          active={activeSection === 'prompt'}
          onClick={() => setActiveSection('prompt')}
          icon={<Send className="w-4 h-4" />}
          label="指令"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'style' && <StyleSelector />}
        {activeSection === 'music' && <MusicConfig />}
        {activeSection === 'prompt' && <PromptChat />}
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-dark-700">
        <button 
          onClick={handleGenerate}
          disabled={isProcessing}
          className="btn btn-primary w-full relative overflow-hidden group"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              智能生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              一键智能生成
            </>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-accent-primary/20 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  )
}

// Section Tab
interface SectionTabProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function SectionTab({ active, onClick, icon, label }: SectionTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
        active
          ? 'text-accent-primary border-b-2 border-accent-primary'
          : 'text-dark-400 hover:text-dark-200'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// Style Selector Component
function StyleSelector() {
  const { availableStyles, selectedStyle, setSelectedStyle } = useAIDirectorStore()

  return (
    <div className="p-4 space-y-3">
      {availableStyles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          isSelected={selectedStyle?.id === style.id}
          onSelect={() => setSelectedStyle(style)}
        />
      ))}
    </div>
  )
}

interface StyleCardProps {
  style: StyleConfig
  isSelected: boolean
  onSelect: () => void
}

function StyleCard({ style, isSelected, onSelect }: StyleCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left',
        isSelected
          ? 'bg-accent-primary/10 border border-accent-primary'
          : 'bg-dark-700/50 border border-dark-600 hover:border-dark-500'
      )}
    >
      {/* Thumbnail */}
      <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0">
        <img
          src={style.thumbnail}
          alt={style.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{style.name}</span>
          {isSelected && (
            <Check className="w-4 h-4 text-accent-primary" />
          )}
        </div>
        <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">
          {style.description}
        </p>
      </div>
    </button>
  )
}

// Music Config Component
function MusicConfig() {
  const [musicSource, setMusicSource] = useState<'upload' | 'generate' | 'library'>('library')
  const [playingPath, setPlayingPath] = useState<string | null>(null)
  const { selectedMusicPath, setSelectedMusicPath } = useAIDirectorStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const musicLibrary = [
    { name: '平凡之路', category: '轻松', path: '/music/relaxing/pingfanzhilu.aac', duration: '4:10' },
    { name: 'Travel', category: '轻松', path: '/music/relaxing/travel.aac', duration: '3:24' },
    { name: 'いつもの風景', category: '轻松', path: '/music/relaxing/いつもの風景.mp3', duration: '2:15' },
    { name: 'See you again', category: '动感', path: '/music/energetic/See you again.aac', duration: '3:49' },
    { name: 'Sport', category: '动感', path: '/music/energetic/sport.aac', duration: '2:30' },
  ]

  const handleTogglePreview = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (playingPath === path) {
      audioRef.current?.pause()
      setPlayingPath(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = path
        audioRef.current.load()
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingPath(path)
            })
            .catch((err) => {
              console.error('Audio play failed:', err)
              setPlayingPath(null)
            })
        }
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, music: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'music',
      data: music
    }))
  }

  return (
    <div className="p-4 space-y-4">
      <audio ref={audioRef} onEnded={() => setPlayingPath(null)} preload="auto" className="hidden" />
      {/* Source Selection */}
      <div className="space-y-2">
        <label className="text-sm text-dark-300">音乐来源</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMusicSource('generate')}
            className={cn(
              'p-2 rounded-lg text-xs font-medium transition-colors',
              musicSource === 'generate'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            )}
          >
            AI 生成
          </button>
          <button
            onClick={() => setMusicSource('upload')}
            className={cn(
              'p-2 rounded-lg text-xs font-medium transition-colors',
              musicSource === 'upload'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            )}
          >
            上传音乐
          </button>
          <button
            onClick={() => setMusicSource('library')}
            className={cn(
              'p-2 rounded-lg text-xs font-medium transition-colors',
              musicSource === 'library'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            )}
          >
            音乐库
          </button>
        </div>
      </div>

      {musicSource === 'generate' && (
        <div className="space-y-4">
          {/* Generate Button */}
          <button className="w-full p-4 rounded-lg border-2 border-dashed border-dark-600 hover:border-accent-primary/50 transition-colors group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors">
                <Sparkles className="w-6 h-6 text-accent-primary" />
              </div>
              <span className="text-sm font-medium text-white">生成与画面情绪一致的BGM</span>
              <span className="text-xs text-dark-400">AI 将根据视频内容智能生成配乐</span>
            </div>
          </button>

          {/* Genre Selection */}
          <div className="space-y-2">
            <label className="text-sm text-dark-300">音乐风格</label>
            <div className="flex flex-wrap gap-2">
              {['流行', '电子', '古典', '爵士', '摇滚', '民谣', '氛围'].map((genre) => (
                <button
                  key={genre}
                  className="px-3 py-1 text-xs rounded-full bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white transition-colors"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {musicSource === 'upload' && (
        <div className="border-2 border-dashed border-dark-600 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 text-dark-400 mx-auto mb-2" />
          <p className="text-sm text-dark-300">拖拽音频文件到此处</p>
          <p className="text-xs text-dark-500 mt-1">支持 MP3, WAV, AAC 格式</p>
        </div>
      )}

      {musicSource === 'library' && (
        <div className="space-y-2">
          {/* Music Library Items */}
          {musicLibrary.map((music) => (
            <div
              key={music.path}
              draggable
              onDragStart={(e) => handleDragStart(e, music)}
              onClick={(e) => {
                setSelectedMusicPath(music.path === selectedMusicPath ? null : music.path)
                handleTogglePreview(music.path, e)
              }}
              className={cn(
                "relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
                selectedMusicPath === music.path ? "bg-accent-primary/20 border border-accent-primary/30" : "bg-dark-700/50 hover:bg-dark-700 border border-transparent"
              )}
            >
              {/* Selection Tick */}
              {selectedMusicPath === music.path && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center shadow-lg z-10">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div
                className="w-10 h-10 rounded bg-gradient-to-br from-accent-primary/30 to-accent-secondary/30 flex items-center justify-center group-hover:from-accent-primary/50 group-hover:to-accent-secondary/50 transition-all"
              >
                {playingPath === music.path ? (
                  <div className="flex items-end gap-0.5 h-4">
                    <div className="w-0.5 bg-accent-primary animate-music-bar-1" />
                    <div className="w-0.5 bg-accent-primary animate-music-bar-2" />
                    <div className="w-0.5 bg-accent-primary animate-music-bar-3" />
                  </div>
                ) : (
                  <Music2 className="w-5 h-5 text-accent-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{music.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-300">{music.category}</span>
                  <span className="text-xs text-dark-400">{music.duration}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMusicPath(music.path === selectedMusicPath ? null : music.path)
                }}
                className="p-2 rounded-full hover:bg-accent-primary/20 text-dark-400 hover:text-accent-primary transition-colors"
              >
                {selectedMusicPath === music.path ? (
                  <Check className="w-4 h-4 text-accent-primary" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Prompt Chat Component
function PromptChat() {
  const { promptHistory, addPrompt, addResponse, isProcessing, setIsProcessing } = useAIDirectorStore()
  const [input, setInput] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [promptHistory])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    addPrompt(input)
    setInput('')
    setIsProcessing(true)

    // Simulate AI response
    setTimeout(() => {
      const randomResponse = mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)]
      addResponse(randomResponse.response)
      setIsProcessing(false)
    }, 1500)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {promptHistory.length === 0 && (
          <div className="text-center text-dark-400 text-sm py-8">
            <Wand2 className="w-8 h-8 mx-auto mb-3 text-dark-500" />
            <p>输入指令让 AI 帮你剪辑</p>
            <p className="text-xs mt-1">例如："把节奏调快一点"</p>
          </div>
        )}

        {promptHistory.map((msg, index) => (
          <div
            key={index}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-4 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-accent-primary text-white'
                  : 'bg-dark-700 text-dark-100'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-dark-700 rounded-lg px-4 py-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-accent-primary animate-spin" />
              <span className="text-sm text-dark-300">AI 正在处理...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入指令，如：去掉无聊的停顿..."
            className="input flex-1"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={cn(
              'btn btn-primary px-4',
              (!input.trim() || isProcessing) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['加快节奏', '去掉停顿', '添加转场'].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="px-2 py-1 text-xs rounded bg-dark-700 text-dark-400 hover:text-white hover:bg-dark-600 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
