import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds === undefined || seconds === null) {
    return '00:00'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format date to localized string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) return `${diffDay} 天前`
  if (diffHour > 0) return `${diffHour} 小时前`
  if (diffMin > 0) return `${diffMin} 分钟前`
  return '刚刚'
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

/**
 * Get tag category color
 */
export function getTagColor(category: string): string {
  const colors: Record<string, string> = {
    scene: 'bg-blue-500/20 text-blue-400',
    object: 'bg-green-500/20 text-green-400',
    person: 'bg-purple-500/20 text-purple-400',
    action: 'bg-orange-500/20 text-orange-400',
    emotion: 'bg-pink-500/20 text-pink-400',
    audio: 'bg-cyan-500/20 text-cyan-400',
    text: 'bg-yellow-500/20 text-yellow-400',
  }
  return colors[category] || 'bg-gray-500/20 text-gray-400'
}

/**
 * Get emotion color
 */
export function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    warm: '#f59e0b',
    lively: '#22c55e',
    tense: '#ef4444',
    calm: '#3b82f6',
    sad: '#6366f1',
    exciting: '#ec4899',
    romantic: '#f472b6',
    mysterious: '#8b5cf6',
  }
  return colors[emotion] || '#6b7280'
}

/**
 * Calculate video aspect ratio
 */
export function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

/**
 * Check if a time is within a range
 */
export function isTimeInRange(
  time: number,
  start: number,
  end: number
): boolean {
  return time >= start && time <= end
}

/**
 * Snap time to nearest beat
 */
export function snapToBeat(
  time: number,
  beats: number[],
  threshold: number = 0.5
): number {
  if (beats.length === 0) return time

  let nearestBeat = beats[0]
  let minDiff = Math.abs(time - beats[0])

  for (const beat of beats) {
    const diff = Math.abs(time - beat)
    if (diff < minDiff) {
      minDiff = diff
      nearestBeat = beat
    }
  }

  return minDiff <= threshold ? nearestBeat : time
}
