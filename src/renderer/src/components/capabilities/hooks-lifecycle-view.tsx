import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  ExternalLink,
  FileCode2,
  FolderOpen,
  Info,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { useHealthChecks } from '@/hooks/use-ipc'
import {
  getHookManagementState,
  getHookRiskHints,
  getVisibleStageSupport,
  groupHookAssetsByStage,
  type HookAgentStageSupport,
  type HookLifecycleSupport,
  type HookManagementAction,
  type HookManagementState,
  type HookRiskHint,
  type HookStageGroup
} from '@/lib/hook-lifecycle'
import type { AgentView, Asset, AssetScope } from '@shared/types/asset'
import type { HealthCheck, HooksAgentId } from '@shared/types/ipc'

interface HooksLifecycleViewProps {
  assets: Asset[]
  agentView: AgentView
  search: string
  scope: 'all' | AssetScope
}

const supportIconMap = {
  supported: CheckCircle2,
  partial: CircleAlert,
  unsupported: CircleSlash
} satisfies Record<HookLifecycleSupport, React.ComponentType<{ className?: string }>>

const supportClassMap = {
  supported: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  unsupported: 'bg-muted text-muted-foreground'
} satisfies Record<HookLifecycleSupport, string>

export function HooksLifecycleView({ assets, agentView, search, scope }: HooksLifecycleViewProps): React.ReactElement {
  const { t } = useTranslation()
  const groups = useMemo(() => groupHookAssetsByStage(assets, agentView), [assets, agentView])
  const { checks: healthChecks, loading: healthLoading } = useHealthChecks()
  const hookHealthChecks = useMemo(
    () => visibleHookHealthChecks(healthChecks, agentView),
    [healthChecks, agentView]
  )
  const hookCount = assets.length
  const hasSearch = search.trim().length > 0
  const hasScopeFilter = scope !== 'all'

  const scrollToStage = (id: string): void => {
    document.getElementById(`hook-stage-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          aria-label={t('capabilities.hooks.lifecycleIndex')}
          className="lg:sticky lg:top-4 lg:self-start"
        >
          <div className="rounded-lg border border-border bg-card p-2">
            <div className="px-2 pb-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('capabilities.hooks.lifecycleIndex')}
                </p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t(`agentView.${agentView}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('capabilities.hooks.lifecycleCount', { count: hookCount })}
              </p>
            </div>
            <HookHealthSignal checks={hookHealthChecks} loading={healthLoading} />
            <div
              data-testid="hook-lifecycle-stage-list"
              className="flex gap-2 overflow-x-auto pb-1 lg:block lg:max-h-[calc(100vh-10rem)] lg:space-y-1 lg:overflow-y-auto lg:pb-0 lg:pr-1"
            >
              {groups.map((group, index) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => scrollToStage(group.id)}
                  className="flex min-w-[230px] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent lg:w-full lg:min-w-0"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {group.stage ? t(group.stage.titleKey) : t('capabilities.hooks.unknown.title')}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {group.stage ? t(group.stage.summaryKey) : t('capabilities.hooks.unknown.body')}
                    </span>
                  </span>
                  <span
                    title={t('capabilities.hooks.hookCount', { count: group.hooks.length })}
                    className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    {group.hooks.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {(hasSearch || hasScopeFilter) && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {t('capabilities.hooks.filteredHint')}
            </div>
          )}
          {groups.map((group) => (
            <HookStageSection key={group.id} group={group} agentView={agentView} />
          ))}
        </div>
      </div>
    </div>
  )
}

function HookHealthSignal({ checks, loading }: { checks: HealthCheck[]; loading: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const counts = countHealthSeverities(checks)
  const hasChecks = checks.length > 0
  const sortedChecks = useMemo(
    () => [...checks].sort((a, b) => healthSeverityRank(a.severity) - healthSeverityRank(b.severity)),
    [checks]
  )
  const overallTone = healthOverallTone(checks)

  return (
    <div className="mx-2 mb-2 rounded-md border border-border/70 bg-muted/20 px-2 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{t('capabilities.hooks.health.title')}</span>
        {loading ? (
          <HealthStatusTip
            id="hook-health-loading"
            tone="loading"
            label={t('capabilities.hooks.health.loading')}
            detail={t('capabilities.hooks.health.loadingDetail')}
            checks={[]}
          />
        ) : hasChecks ? (
          <HealthStatusTip
            id="hook-health-summary"
            tone={overallTone}
            label={t('capabilities.hooks.health.summary', { count: checks.length })}
            detail={t('capabilities.hooks.health.detailsBody')}
            checks={sortedChecks}
          />
        ) : (
          <HealthStatusTip
            id="hook-health-ok"
            tone="ok"
            label={t('capabilities.hooks.health.ok')}
            detail={t('capabilities.hooks.health.okDetail')}
            checks={[]}
          />
        )}
      </div>
      {hasChecks && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {counts.error > 0 && <HealthSeverityTip severity="error" count={counts.error} checks={sortedChecks} />}
          {counts.warning > 0 && <HealthSeverityTip severity="warning" count={counts.warning} checks={sortedChecks} />}
          {counts.info > 0 && <HealthSeverityTip severity="info" count={counts.info} checks={sortedChecks} />}
        </div>
      )}
    </div>
  )
}

function HealthSeverityTip({
  severity,
  count,
  checks
}: {
  severity: HealthCheck['severity']
  count: number
  checks: HealthCheck[]
}): React.ReactElement {
  const { t } = useTranslation()
  const severityChecks = checks.filter((check) => check.severity === severity)

  return (
    <HealthStatusTip
      id={`hook-health-${severity}`}
      tone={severity}
      label={t(`capabilities.hooks.health.severity.${severity}`, { count })}
      detail={t(`capabilities.hooks.health.severityDetail.${severity}`)}
      checks={severityChecks}
    />
  )
}

type HealthTipTone = HealthCheck['severity'] | 'ok' | 'loading'

function HealthStatusTip({
  id,
  tone,
  label,
  detail,
  checks
}: {
  id: string
  tone: HealthTipTone
  label: string
  detail: string
  checks: HealthCheck[]
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const Icon = healthToneIcon(tone)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          healthToneClass(tone)
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <span className="block text-xs font-semibold text-foreground">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
          {checks.length > 0 && (
            <span className="mt-3 block space-y-2">
              {checks.map((check) => (
                <HookHealthCheckTipRow key={check.id} check={check} />
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function HookHealthCheckTipRow({ check }: { check: HealthCheck }): React.ReactElement {
  const { t } = useTranslation()
  const targetPath = check.target?.path ?? check.path

  return (
    <span className="block rounded-md border border-border/70 bg-background/80 p-2">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', healthSeverityClass(check.severity))}>
          {t(`capabilities.hooks.health.severityLabel.${check.severity}`)}
        </span>
        <span className="text-xs font-medium text-foreground">{check.title}</span>
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5">
        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {check.agentName}
        </span>
        {check.scope && (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {check.scope}
          </span>
        )}
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{check.message}</span>
      {check.fix ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{check.fix.label}: </span>
          {check.fix.description}
        </span>
      ) : check.suggestion ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{check.suggestion}</span>
      ) : null}
      {targetPath && <span className="mt-1 block break-all font-mono text-[11px] text-muted-foreground">{targetPath}</span>}
      {targetPath && (
        <button
          type="button"
          onClick={() => void window.api?.shell.openPath(targetPath)}
          className="mt-2 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent active:translate-y-px"
        >
          {t('capabilities.hooks.health.openSource')}
        </button>
      )}
    </span>
  )
}

function HookStageSection({ group, agentView }: { group: HookStageGroup; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()

  if (!group.stage) {
    return <UnknownHookSection group={group} agentView={agentView} />
  }

  const supports = getVisibleStageSupport(group.stage, agentView)

  return (
    <section id={`hook-stage-${group.id}`} className="scroll-mt-4 rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{t(group.stage.titleKey)}</h3>
            <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t(group.stage.behaviorKey)}</p>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {t('capabilities.hooks.hookCount', { count: group.hooks.length })}
          </span>
        </div>
        <HookStageRecommendations recommendationKeys={group.stage.recommendationKeys} />
        <AgentSupportTips stageId={group.stage.id} supports={supports} />
      </div>

      <div className="px-4 py-4">
        <HookEventList group={group} agentView={agentView} />
      </div>
    </section>
  )
}

function HookStageRecommendations({ recommendationKeys }: { recommendationKeys: string[] }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-foreground">{t('capabilities.hooks.recommendations.title')}</span>
      {recommendationKeys.map((key) => (
        <span key={key} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {t(key)}
        </span>
      ))}
    </div>
  )
}

function AgentSupportTips({ stageId, supports }: { stageId: string; supports: HookAgentStageSupport[] }): React.ReactElement | null {
  const { t } = useTranslation()
  if (supports.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t('capabilities.hooks.agentTips.label')}</span>
      {supports.map((support) => (
        <AgentSupportTip key={support.agent} stageId={stageId} support={support} />
      ))}
    </div>
  )
}

function AgentSupportTip({ stageId, support }: { stageId: string; support: HookAgentStageSupport }): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const Icon = supportIconMap[support.support]
  const tooltipId = `hook-${stageId}-${support.agent}-support-tip`
  const agentName = support.agent === 'claude' ? 'Claude Code' : 'Codex'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {agentName}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{agentName}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', supportClassMap[support.support])}>
              <Icon className="h-3 w-3" />
              {t(`capabilities.hooks.support.${support.support}`)}
            </span>
          </span>
          <span className="mt-2 flex flex-wrap gap-1">
            {support.events.map((event) => (
              <span key={event.eventType} className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                {event.eventType}
              </span>
            ))}
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">{t(support.summaryKey)}</span>
          {support.limitationKeys.length > 0 && (
            <span className="mt-2 block space-y-1">
              {support.limitationKeys.map((key) => (
                <span key={key} className="flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{t(key)}</span>
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function UnknownHookSection({ group, agentView }: { group: HookStageGroup; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section id={`hook-stage-${group.id}`} className="scroll-mt-4 rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h3 className="text-base font-semibold text-foreground">{t('capabilities.hooks.unknown.title')}</h3>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t('capabilities.hooks.unknown.body')}</p>
      </div>
      <div className="px-4 py-4">
        <HookEventList group={group} agentView={agentView} />
      </div>
    </section>
  )
}

function HookEventList({ group, agentView }: { group: HookStageGroup; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()

  if (group.hooks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-4">
        <p className="text-sm text-foreground">{t('capabilities.hooks.emptyStage.title')}</p>
        <p className="mt-1 max-w-[68ch] text-xs leading-5 text-muted-foreground">{t('capabilities.hooks.emptyStage.body')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {group.events.map((eventGroup) => (
        <div key={eventGroup.eventType} className="rounded-md border border-border/70">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
            <span className="font-mono text-xs font-medium text-foreground">{eventGroup.eventType}</span>
            <span className="text-xs text-muted-foreground">
              {t(`capabilities.hooks.nativeEvents.${eventGroup.eventType}.description`, { defaultValue: t('capabilities.hooks.nativeEvents.unknown.description') })}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {eventGroup.hooks.map((hook) => (
              <HookAssetRow key={hook.id} hook={hook} agentView={agentView} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HookAssetRow({ hook, agentView }: { hook: Asset; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()
  const matcher = typeof hook.meta.matcher === 'string' ? hook.meta.matcher : ''
  const supportNote = typeof hook.meta.supportNote === 'string' ? hook.meta.supportNote : ''
  const display = hookDisplayDetails(hook)
  const rawHookJson = formatRawHookJson(hook.meta.rawHook)
  const managementStates = getHookManagementState(hook, agentView)
  const riskHints = getHookRiskHints(hook)
  const toggleState = managementStates.find((state) => state.action === 'toggle-hook')
  const initialHookEnabled = hookEnabledValue(hook)
  const [hookEnabled, setHookEnabled] = useState(initialHookEnabled)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  useEffect(() => {
    setHookEnabled(initialHookEnabled)
    setToggleError(null)
  }, [hook.id, initialHookEnabled])

  const toggleHook = async (): Promise<void> => {
    if (!toggleState?.hookKey || toggleState.availability !== 'needs-confirmation') return
    const agentId = hookToggleAgentId(hook)
    if (!agentId) return
    const enabled = !hookEnabled
    const confirmMessage = getHookToggleConfirmMessage(t, agentId, enabled, hook)

    if (!window.confirm(confirmMessage)) return

    setToggleBusy(true)
    setToggleError(null)
    try {
      const result = await window.api.hooks.setHookEnabled({
        agentId,
        scope: 'user',
        hookKey: toggleState.hookKey,
        sourcePath: hook.path,
        enabled,
        managed: hook.meta.managed === true
      })
      setHookEnabled(result.enabled)
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : String(err))
    } finally {
      setToggleBusy(false)
    }
  }

  return (
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {display.type}
            </span>
            <span className="min-w-0 max-w-full break-all font-mono text-xs text-foreground">{display.primary}</span>
            <ScopeBadge scope={hook.scope} />
            {hookCanShowEnabledBadge(hook, toggleState) && (
              <span className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                hookEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              )}>
                {hookEnabled ? t('capabilities.hooks.management.enabled') : t('capabilities.hooks.management.disabled')}
              </span>
            )}
            {agentView === 'all' && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {hook.agentId === 'codex' ? 'Codex' : 'Claude Code'}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {matcher && (
              <span>
                {t('capabilities.hooks.matcher')}: <span className="font-mono text-foreground">{matcher}</span>
              </span>
            )}
            {display.configItems.map((item) => (
              <span key={`${item.labelKey}:${item.value}`}>
                {t(item.labelKey)}: <span className="font-mono text-foreground">{item.value}</span>
              </span>
            ))}
            <span className="min-w-0 truncate font-mono">{hook.path}</span>
          </div>
          {rawHookJson && (
            <details className="mt-2">
              <summary className="inline-flex cursor-pointer select-none items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t('capabilities.hooks.management.rawJson')}
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border/70 bg-muted/40 p-3 text-[11px] leading-5 text-foreground">
                {rawHookJson}
              </pre>
            </details>
          )}
          {supportNote && (
            <p className="mt-2 flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{t(supportNote)}</span>
            </p>
          )}
          <HookRiskHints hints={riskHints} />
          {toggleState?.availability === 'unavailable' && toggleState.reasonKey && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(toggleState.reasonKey)}</p>
          )}
          {toggleError && <p className="mt-2 text-xs leading-5 text-destructive">{toggleError}</p>}
        </div>

        {toggleState?.availability === 'needs-confirmation' && (
          <button
            type="button"
            disabled={toggleBusy}
            onClick={() => void toggleHook()}
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent"
          >
            {hookEnabled ? t('capabilities.hooks.management.disableHook') : t('capabilities.hooks.management.enableHook')}
          </button>
        )}
        <HookActions states={managementStates} />
      </div>
    </div>
  )
}

interface HookConfigItem {
  labelKey: string
  value: string
}

interface HookDisplayDetails {
  type: string
  primary: string
  configItems: HookConfigItem[]
}

function hookDisplayDetails(hook: Asset): HookDisplayDetails {
  const hookType = firstMetaString(hook, 'hookType') ?? 'unknown'
  const command = firstMetaString(hook, 'command')
  const commandWindows = firstMetaString(hook, 'commandWindows')
  const url = firstMetaString(hook, 'url')
  const server = firstMetaString(hook, 'server')
  const tool = firstMetaString(hook, 'tool')
  const prompt = firstMetaString(hook, 'prompt')
  const model = firstMetaString(hook, 'model')

  const configItems: HookConfigItem[] = []
  addConfigItem(configItems, 'capabilities.hooks.config.condition', firstMetaString(hook, 'ifCondition'))
  addConfigItem(configItems, 'capabilities.hooks.config.timeout', formatSeconds(hook.meta.timeout))
  addConfigItem(configItems, 'capabilities.hooks.config.statusMessage', firstMetaString(hook, 'statusMessage'))
  addConfigItem(configItems, 'capabilities.hooks.config.commandWindows', commandWindows)
  addConfigItem(configItems, 'capabilities.hooks.config.args', formatStringArray(hook.meta.args))
  addConfigItem(configItems, 'capabilities.hooks.config.shell', firstMetaString(hook, 'shell'))
  addConfigItem(configItems, 'capabilities.hooks.config.async', hook.meta.async === true ? 'true' : undefined)
  addConfigItem(configItems, 'capabilities.hooks.config.asyncRewake', hook.meta.asyncRewake === true ? 'true' : undefined)
  addConfigItem(configItems, 'capabilities.hooks.config.model', model)

  if (hookType === 'http') {
    return { type: hookType, primary: url ?? hook.name, configItems }
  }
  if (hookType === 'mcp_tool') {
    return {
      type: hookType,
      primary: server && tool ? `${server}.${tool}` : server ?? tool ?? hook.name,
      configItems
    }
  }
  if (hookType === 'prompt' || hookType === 'agent') {
    return { type: hookType, primary: truncateInline(prompt ?? hook.name, 120), configItems }
  }
  return {
    type: hookType,
    primary: command ?? commandWindows ?? hook.name,
    configItems
  }
}

function addConfigItem(items: HookConfigItem[], labelKey: string, value: string | undefined): void {
  if (value) items.push({ labelKey, value })
}

function firstMetaString(hook: Asset, key: string): string | undefined {
  const value = hook.meta[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function formatSeconds(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}s` : undefined
}

function formatStringArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  if (values.length === 0) return undefined
  return values.join(' ')
}

function truncateInline(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function formatRawHookJson(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return null
  }
}

function hookToggleAgentId(hook: Asset): HooksAgentId | null {
  if (hook.agentId === 'claude-code') return 'claude-code'
  if (hook.agentId === 'codex') return 'codex'
  return null
}

function hookCanShowEnabledBadge(hook: Asset, toggleState: HookManagementState | undefined): boolean {
  return toggleState?.hookKey != null || typeof hook.meta.enabled === 'boolean' || hook.meta.disabledByBerth === true
}

function getHookToggleConfirmMessage(
  t: ReturnType<typeof useTranslation>['t'],
  agentId: HooksAgentId,
  enabled: boolean,
  hook: Asset
): string {
  const event = typeof hook.meta.eventType === 'string' ? hook.meta.eventType : ''
  const command = typeof hook.meta.command === 'string' ? hook.meta.command : hook.name
  const disabledAt = typeof hook.meta.disabledAt === 'string' ? hook.meta.disabledAt : ''
  if (agentId === 'claude-code') {
    return enabled
      ? t('capabilities.hooks.management.confirmRestoreClaudeHook', { command, disabledAt, event, path: hook.path })
      : t('capabilities.hooks.management.confirmSoftDisableClaudeHook', { command, event, path: hook.path })
  }
  return enabled
    ? t('capabilities.hooks.management.confirmEnableHook', { path: hook.path })
    : t('capabilities.hooks.management.confirmDisableHook', { path: hook.path })
}

function HookRiskHints({ hints }: { hints: HookRiskHint[] }): React.ReactElement | null {
  const { t } = useTranslation()
  if (hints.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hints.map((hint) => (
        <span
          key={hint.key}
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
            hint.level === 'warning'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {t(hint.key)}
        </span>
      ))}
    </div>
  )
}

function hookEnabledValue(hook: Asset): boolean {
  return hook.meta.enabled !== false
}

function HookActions({ states }: { states: HookManagementState[] }): React.ReactElement {
  const { t } = useTranslation()
  const openStates = states.filter((state) => state.action.startsWith('open-'))
  const availableCount = openStates.filter((state) => state.availability === 'available').length

  const openPath = async (state: HookManagementState): Promise<void> => {
    const targetPath = targetPathForAction(state)
    if (!targetPath) return
    await window.api?.shell.openPath(targetPath)
  }

  return (
    <details className="relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
        <MoreHorizontal className="h-3.5 w-3.5" />
        {t('capabilities.hooks.actions.menu')}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
        {openStates.map((state) => (
          <button
            key={state.action}
            type="button"
            disabled={state.availability !== 'available'}
            onClick={() => void openPath(state)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent"
          >
            {iconForAction(state.action)}
            <span className="min-w-0 flex-1">{t(`capabilities.hooks.actions.${state.action}`)}</span>
          </button>
        ))}
        {availableCount === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('capabilities.hooks.actions.noOpenTargets')}</p>
        )}
      </div>
    </details>
  )
}

function iconForAction(action: HookManagementAction): React.ReactElement {
  if (action === 'open-source-directory' || action === 'open-entry-directory') {
    return <FolderOpen className="h-3.5 w-3.5 shrink-0" />
  }
  if (action === 'open-entry-file') return <FileCode2 className="h-3.5 w-3.5 shrink-0" />
  return <ExternalLink className="h-3.5 w-3.5 shrink-0" />
}

function targetPathForAction(state: HookManagementState): string | undefined {
  if (!state.targetPath) return undefined
  if (state.action === 'open-source-directory' || state.action === 'open-entry-directory') {
    return dirname(state.targetPath)
  }
  return state.targetPath
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/[/\\]+$/, '')
  const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'))
  return index > 0 ? normalized.slice(0, index) : normalized
}

function visibleHookHealthChecks(checks: HealthCheck[], agentView: AgentView): HealthCheck[] {
  return checks.filter((check) => isHookHealthCheck(check) && healthCheckMatchesAgent(check, agentView))
}

function isHookHealthCheck(check: HealthCheck): boolean {
  return check.assetType === 'hook' || check.target?.route?.includes('tab=hooks') === true
}

function healthCheckMatchesAgent(check: HealthCheck, agentView: AgentView): boolean {
  if (check.agentId === 'all') return true
  if (agentView === 'all') return check.agentId === 'claude-code' || check.agentId === 'codex'
  if (agentView === 'claude') return check.agentId === 'claude-code'
  return check.agentId === 'codex'
}

function countHealthSeverities(checks: HealthCheck[]): Record<HealthCheck['severity'], number> {
  return checks.reduce<Record<HealthCheck['severity'], number>>(
    (counts, check) => {
      counts[check.severity] += 1
      return counts
    },
    { error: 0, warning: 0, info: 0 }
  )
}

function healthSeverityRank(severity: HealthCheck['severity']): number {
  if (severity === 'error') return 0
  if (severity === 'warning') return 1
  return 2
}

function healthOverallTone(checks: HealthCheck[]): HealthCheck['severity'] {
  if (checks.some((check) => check.severity === 'error')) return 'error'
  if (checks.some((check) => check.severity === 'warning')) return 'warning'
  return 'info'
}

function healthToneIcon(tone: HealthTipTone): React.ComponentType<{ className?: string }> {
  if (tone === 'ok') return CheckCircle2
  if (tone === 'loading') return Info
  if (tone === 'error' || tone === 'warning') return CircleAlert
  return Info
}

function healthToneClass(tone: HealthTipTone): string {
  if (tone === 'ok') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (tone === 'loading') return 'bg-muted text-muted-foreground'
  return healthSeverityClass(tone)
}

function healthSeverityClass(severity: HealthCheck['severity']): string {
  if (severity === 'error') return 'bg-destructive/10 text-destructive'
  if (severity === 'warning') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
}
