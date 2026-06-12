import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatRelativeTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  return date.toLocaleDateString()
}

export function formatOptionalRelativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  return formatRelativeTime(new Date(value))
}

export function formatOptionalDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  const remainMin = min % 60
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`
}

export function formatOptionalCurrency(amount: number | null | undefined): string {
  return amount == null ? '—' : formatCurrency(amount)
}

const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:[\\/]/

function getDisplayPathSeparator(path: string): '/' | '\\' {
  if (path.startsWith('\\\\')) return '\\'
  if (WINDOWS_DRIVE_PATH_PATTERN.test(path)) return '\\'
  if (path.includes('\\')) return '\\'
  return '/'
}

function truncateUncPath(parts: string[]): string | null {
  const server = parts[2]
  const share = parts[3]
  if (!server || !share) return null
  return `\\\\${[server, share, '...', ...parts.slice(-2)].join('\\')}`
}

export function truncatePath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) return path
  const parts = path.split(/[/\\]/)
  if (parts.length <= 3) return path
  const separator = getDisplayPathSeparator(path)
  if (separator === '\\' && parts[0] === '' && parts[1] === '') {
    return truncateUncPath(parts) ?? path
  }
  return [parts[0], '...', ...parts.slice(-2)].join(separator)
}
