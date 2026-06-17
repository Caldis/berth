import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  X,
  XCircle
} from 'lucide-react'
import { Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from '@/components/ui'
import { useHealthChecks } from '@/hooks/use-ipc'
import { cn, truncatePath } from '@/lib/utils'
import {
  localizeHealthCheck,
  localizeHealthCheckAssetType,
  localizeHealthCheckConfidence,
  localizeHealthCheckScope
} from '@/lib/health-check-i18n'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import type { HealthCheck } from '@shared/types/ipc'

// GH-138: 健康检查收拢入口 — toolbar 一个状态按钮, 点击弹出弹窗 (替代旧首页平铺 worklist)。
// 数据/忽略/复制/导航逻辑自旧 Overview 移植; 数据经 useHealthChecks (CachedResource 60s 去重)。

type HealthTone = 'loading' | 'stale' | 'ok' | 'info' | 'warning' | 'error'

interface HealthSummary {
  tone: HealthTone
  errors: number
  warnings: number
  info: number
}

interface HealthCheckGroup {
  agentId: string
  agentName: string
  checks: HealthCheck[]
  errors: number
  warnings: number
  info: number
}

const IGNORED_HEALTH_CHECKS_KEY = 'berth-ignored-health-checks'

export function HealthEntry(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const { checks, loading, stale, error, refresh } = useHealthChecks()
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null)
  const [ignored, setIgnored] = useState<Set<string>>(() => readIgnoredHealthChecks())

  const visibleChecks = useMemo(
    () => checks.filter((c) => c.severity !== 'info' || !ignored.has(healthCheckDismissKey(c))),
    [checks, ignored]
  )
  const summary = useMemo(() => summarizeHealthChecks(visibleChecks, loading, stale), [visibleChecks, loading, stale])
  const groups = useMemo(() => groupHealthChecks(visibleChecks), [visibleChecks])
  const hasChecks = groups.some((g) => g.checks.length > 0)
  const Icon = healthToneIcon(summary.tone)
  const attention = summary.errors + summary.warnings

  const activate = (check: HealthCheck): void => {
    if (check.target?.route) {
      navigate(check.target.route)
      onOpenChange()
      return
    }
    const path = check.target?.path ?? check.path
    if (path) {
      void window.api.shell.openPath(path)
      return
    }
    if (check.assetId) {
      navigate('/capabilities/mcp')
      onOpenChange()
    }
  }

  const copyFix = (event: React.MouseEvent, check: HealthCheck, snippet: string): void => {
    event.stopPropagation()
    void navigator.clipboard?.writeText(snippet).then(() => setCopiedFixId(check.id))
  }

  const ignore = (event: React.MouseEvent, check: HealthCheck): void => {
    event.stopPropagation()
    const next = new Set(ignored)
    next.add(healthCheckDismissKey(check))
    setIgnored(next)
    try {
      localStorage.setItem(IGNORED_HEALTH_CHECKS_KEY, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label={t('overview.healthChecks')}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          healthToneClass(summary.tone)
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{t(`overview.healthSummary.${summary.tone}`)}</span>
        {attention > 0 && <span className="tabular-nums">· {attention}</span>}
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
        aria-label={t('overview.healthChecks')}
        classNames={{ base: 'max-h-[calc(100vh-6rem)]' }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="border-b border-border">
                <span className="text-base font-semibold">{t('overview.healthChecks')}</span>
              </ModalHeader>
              <ModalBody className="px-0 py-0">
                {loading && !hasChecks ? (
                  <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4 animate-pulse" />
                      {t('overview.healthSummary.loading')}
                    </div>
                  </div>
                ) : error && !hasChecks ? (
                  <div className="p-5">
                    <ErrorState title={t('overview.healthErrorTitle')} onRetry={() => refresh({ force: false })} />
                  </div>
                ) : !hasChecks ? (
                  <div className="p-5">
                    <EmptyState
                      icon={CheckCircle2}
                      title={t('overview.empty.healthTitle')}
                      description={t('overview.empty.healthDescription')}
                      className="border-0 py-10"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {groups.map((group) => (
                      <div key={group.agentId}>
                        <div className="flex items-center justify-between bg-muted/20 px-5 py-2">
                          <span className="text-xs font-medium text-muted-foreground">{group.agentName}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {group.errors > 0 && <span>{t('overview.healthCount.error', { count: group.errors })}</span>}
                            {group.warnings > 0 && <span>{t('overview.healthCount.warning', { count: group.warnings })}</span>}
                            {group.info > 0 && <span>{t('overview.healthCount.info', { count: group.info })}</span>}
                          </div>
                        </div>
                        <div className="divide-y divide-border">
                          {group.checks.map((check) => (
                            <HealthCheckRow
                              key={check.id}
                              check={check}
                              copied={copiedFixId === check.id}
                              onActivate={activate}
                              onCopyFixSnippet={copyFix}
                              onIgnore={ignore}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

function HealthCheckRow({
  check,
  copied,
  onActivate,
  onCopyFixSnippet,
  onIgnore
}: {
  check: HealthCheck
  copied: boolean
  onActivate: (check: HealthCheck) => void
  onCopyFixSnippet: (event: React.MouseEvent, check: HealthCheck, snippet: string) => void
  onIgnore: (event: React.MouseEvent, check: HealthCheck) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const displayCheck = localizeHealthCheck(check, t)
  const clickable = Boolean(check.target?.route || check.target?.path || check.path || check.assetId)

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onActivate(check) : undefined}
      onKeyDown={(event) => {
        if (!clickable) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate(check)
        }
      }}
      className={cn(
        'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        clickable ? 'hover:bg-accent/5' : 'cursor-default'
      )}
    >
      <HealthCheckIcon severity={check.severity} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{displayCheck.title}</span>
          {check.scope && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {localizeHealthCheckScope(check.scope, t)}
            </span>
          )}
          {check.confidence && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {localizeHealthCheckConfidence(check.confidence, t)}
            </span>
          )}
          {check.severity === 'info' && (
            <button
              type="button"
              aria-label={t('overview.healthCheckActions.ignoreInfo')}
              title={t('overview.healthCheckActions.ignoreInfo')}
              onClick={(event) => onIgnore(event, check)}
              className="rounded border border-border p-0.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{displayCheck.message}</p>
        {displayCheck.fix ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-card-foreground">{displayCheck.fix.label}: </span>
            {displayCheck.fix.description}
          </p>
        ) : displayCheck.suggestion ? (
          <p className="text-xs text-muted-foreground">{displayCheck.suggestion}</p>
        ) : null}
        {check.fix?.snippet && (
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-hidden rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
              <code>{check.fix.snippet}</code>
            </pre>
            <button
              type="button"
              aria-label={t('overview.healthCheckActions.copyFixSnippet')}
              title={t('overview.healthCheckActions.copyFixSnippet')}
              onClick={(event) => onCopyFixSnippet(event, check, check.fix!.snippet!)}
              className="shrink-0 rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        {check.path && <p className="truncate text-xs text-muted-foreground">{truncatePath(check.path, 88)}</p>}
      </div>
      {check.assetType && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {localizeHealthCheckAssetType(check.assetType, t)}
        </span>
      )}
    </div>
  )
}

function HealthCheckIcon({ severity }: { severity: HealthCheck['severity'] }): React.ReactElement {
  if (severity === 'error') return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  if (severity === 'warning') return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
}

function readIgnoredHealthChecks(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(IGNORED_HEALTH_CHECKS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

function healthCheckDismissKey(check: HealthCheck): string {
  return `${check.id}:${check.target?.path ?? check.path ?? ''}`
}

function severityRank(severity: HealthCheck['severity']): number {
  if (severity === 'error') return 0
  if (severity === 'warning') return 1
  return 2
}

function groupHealthChecks(checks: HealthCheck[]): HealthCheckGroup[] {
  const groups = new Map<string, HealthCheckGroup>()
  const sorted = [...checks].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
  for (const check of sorted) {
    const group =
      groups.get(check.agentId) ??
      { agentId: check.agentId, agentName: check.agentName, checks: [], errors: 0, warnings: 0, info: 0 }
    group.checks.push(check)
    if (check.severity === 'error') group.errors += 1
    if (check.severity === 'warning') group.warnings += 1
    if (check.severity === 'info') group.info += 1
    groups.set(check.agentId, group)
  }
  return Array.from(groups.values())
}

function summarizeHealthChecks(checks: HealthCheck[], loading: boolean, stale: boolean): HealthSummary {
  const errors = checks.filter((c) => c.severity === 'error').length
  const warnings = checks.filter((c) => c.severity === 'warning').length
  const info = checks.filter((c) => c.severity === 'info').length
  if (loading && checks.length === 0) return { tone: 'loading', errors, warnings, info }
  if (stale) return { tone: 'stale', errors, warnings, info }
  if (errors > 0) return { tone: 'error', errors, warnings, info }
  if (warnings > 0) return { tone: 'warning', errors, warnings, info }
  if (info > 0) return { tone: 'info', errors, warnings, info }
  return { tone: 'ok', errors, warnings, info }
}

function healthToneIcon(tone: HealthTone): React.ComponentType<{ className?: string }> {
  if (tone === 'error') return XCircle
  if (tone === 'warning') return AlertTriangle
  if (tone === 'loading' || tone === 'stale') return Activity
  if (tone === 'info') return Info
  return CheckCircle2
}

function healthToneClass(tone: HealthTone): string {
  if (tone === 'error') return 'border-destructive/25 bg-destructive/10 text-destructive'
  if (tone === 'warning') return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
  if (tone === 'loading' || tone === 'stale') return 'border-border bg-muted/40 text-muted-foreground'
  if (tone === 'info') return 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300'
  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}
