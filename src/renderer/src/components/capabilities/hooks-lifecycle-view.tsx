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
  MoreHorizontal,
  Webhook
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScopeBadge } from '@/components/shared/scope-badge'
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
import type { HooksAgentId, HooksEnablementStatus } from '@shared/types/ipc'

interface HooksLifecycleViewProps {
  assets: Asset[]
  agentView: AgentView
  search: string
  scope: 'all' | AssetScope
}

type HookDisplayMode = 'lifecycle' | 'comparison'

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
  const [displayMode, setDisplayMode] = useState<HookDisplayMode>('lifecycle')
  const hookCount = assets.length
  const hasSearch = search.trim().length > 0
  const hasScopeFilter = scope !== 'all'

  const scrollToStage = (id: string): void => {
    document.getElementById(`hook-stage-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
            <Webhook className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{t('capabilities.hooks.intro.title')}</h2>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t(`agentView.${agentView}`)}
              </span>
            </div>
            <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">
              {t(`capabilities.hooks.intro.${agentView}`)}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {['trigger', 'handler', 'difference'].map((key) => (
                <div key={key} className="rounded-md border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{t(introTipTitleKey(key, agentView))}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t(introTipBodyKey(key, agentView))}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 inline-flex rounded-md border border-border bg-background p-1">
              {(['lifecycle', 'comparison'] as HookDisplayMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    displayMode === mode
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {t(`capabilities.hooks.viewMode.${mode}`)}
                </button>
              ))}
            </div>
            <HookAgentEnablementPanel agentView={agentView} />
          </div>
        </div>
      </section>

      {displayMode === 'lifecycle' ? (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-lg border border-border bg-card p-2">
              <div className="px-2 pb-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('capabilities.hooks.lifecycleIndex')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('capabilities.hooks.lifecycleCount', { count: hookCount })}
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible">
                {groups.map((group, index) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => scrollToStage(group.id)}
                    className="flex min-w-[210px] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent xl:w-full xl:min-w-0"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {group.stage ? t(group.stage.titleKey) : t('capabilities.hooks.unknown.title')}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {t('capabilities.hooks.hookCount', { count: group.hooks.length })}
                      </span>
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
      ) : (
        <HookComparisonTable groups={groups} agentView={agentView} />
      )}
    </div>
  )
}

function introTipTitleKey(key: string, agentView: AgentView): string {
  if (key === 'difference') return `capabilities.hooks.intro.tips.difference.title.${agentView}`
  return `capabilities.hooks.intro.tips.${key}.title`
}

function introTipBodyKey(key: string, agentView: AgentView): string {
  if (key === 'difference') return `capabilities.hooks.intro.tips.difference.body.${agentView}`
  return `capabilities.hooks.intro.tips.${key}.body`
}

function HookAgentEnablementPanel({ agentView }: { agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()
  const [statuses, setStatuses] = useState<HooksEnablementStatus[]>([])
  const [busyAgent, setBusyAgent] = useState<HooksAgentId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const agents = useMemo(() => visibleHooksAgents(agentView), [agentView])

  useEffect(() => {
    let disposed = false
    setError(null)
    void Promise.all(agents.map((agentId) => window.api.hooks.statuses(agentId)))
      .then((nextStatusGroups) => {
        if (!disposed) setStatuses(nextStatusGroups.flat())
      })
      .catch((err) => {
        if (!disposed) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      disposed = true
    }
  }, [agents])

  const toggle = async (status: HooksEnablementStatus): Promise<void> => {
    if (status.scope !== 'user' || status.writable === false) return
    const enabled = !status.enabled
    const confirmMessage = enabled
      ? t('capabilities.hooks.management.confirmEnable', { agent: status.agentName, path: status.sourcePath })
      : t('capabilities.hooks.management.confirmDisable', { agent: status.agentName, path: status.sourcePath })

    if (!window.confirm(confirmMessage)) return

    setBusyAgent(status.agentId)
    setError(null)
    try {
      const result = await window.api.hooks.setEnabled({
        agentId: status.agentId,
        scope: status.scope,
        enabled
      })
      setStatuses((current) =>
        current.map((item) => item.agentId === result.status.agentId ? result.status : item)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyAgent(null)
    }
  }

  return (
    <div className="mt-4 rounded-md border border-border/70 bg-background/60 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground">{t('capabilities.hooks.management.agentToggleTitle')}</p>
          <p className="mt-0.5 max-w-[70ch] text-xs leading-5 text-muted-foreground">
            {t('capabilities.hooks.management.agentToggleBody')}
          </p>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {statuses.map((status) => (
          <div key={`${status.agentId}-${status.scope}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-foreground">{status.agentName}</span>
                <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t(`capabilities.hooks.management.scope.${status.scope}`)}
                </span>
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                  status.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                )}>
                  {status.enabled ? t('capabilities.hooks.management.enabled') : t('capabilities.hooks.management.disabled')}
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{status.sourcePath}</p>
              {status.writable === false && (
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {status.reasonKey ? t(status.reasonKey) : status.reason}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={!status.supported || status.writable === false || busyAgent === status.agentId}
              onClick={() => void toggle(status)}
              className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent"
            >
              {status.enabled ? t('capabilities.hooks.management.disableAll') : t('capabilities.hooks.management.enableAll')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HookComparisonTable({ groups, agentView }: { groups: HookStageGroup[]; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()
  const visibleGroups = groups.filter((group) => group.stage || group.hooks.length > 0)

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h3 className="text-base font-semibold text-foreground">{t('capabilities.hooks.comparison.title')}</h3>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t('capabilities.hooks.comparison.body')}</p>
      </div>
      <div className="divide-y divide-border/70">
        {visibleGroups.map((group) => {
          const supports = group.stage ? getVisibleStageSupport(group.stage, agentView) : []
          return (
            <div
              key={group.id}
              className="grid gap-3 px-4 py-4"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {group.stage ? t(group.stage.titleKey) : t('capabilities.hooks.unknown.title')}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {group.stage ? t(group.stage.behaviorKey) : t('capabilities.hooks.unknown.body')}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('capabilities.hooks.hookCount', { count: group.hooks.length })}
                </p>
              </div>
              {supports.map((support) => (
                <ComparisonSupportCell key={support.agent} support={support} />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ComparisonSupportCell({ support }: { support: HookAgentStageSupport }): React.ReactElement {
  const { t } = useTranslation()
  const Icon = supportIconMap[support.support]
  const titleKey = support.agent === 'claude'
    ? 'capabilities.hooks.comparison.claudeEvents'
    : 'capabilities.hooks.comparison.codexEvents'

  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-background/60 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">{t(titleKey)}</p>
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', supportClassMap[support.support])}>
          <Icon className="h-3 w-3" />
          {t(`capabilities.hooks.support.${support.support}`)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {support.events.length > 0 ? support.events.map((event) => (
          <span key={event.eventType} className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-foreground">
            {event.eventType}
          </span>
        )) : (
          <span className="text-xs text-muted-foreground">{t('capabilities.hooks.comparison.noEvents')}</span>
        )}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(support.summaryKey)}</p>
    </div>
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
        <p className="mt-3 max-w-[72ch] text-sm leading-6 text-foreground">{t(group.stage.guideKey)}</p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          {supports.map((support) => (
            <AgentSupportRow key={support.agent} support={support} />
          ))}
        </div>

        <HookEventList group={group} agentView={agentView} />
      </div>
    </section>
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

function AgentSupportRow({ support }: { support: HookAgentStageSupport }): React.ReactElement {
  const { t } = useTranslation()
  const Icon = supportIconMap[support.support]

  return (
    <div className="rounded-md border border-border/70 bg-background/60 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-foreground">
          {support.agent === 'claude' ? 'Claude Code' : 'Codex'}
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', supportClassMap[support.support])}>
          <Icon className="h-3 w-3" />
          {t(`capabilities.hooks.support.${support.support}`)}
        </span>
        {support.events.map((event) => (
          <span key={event.eventType} className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-foreground">
            {event.eventType}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(support.summaryKey)}</p>
      {support.limitationKeys.length > 0 && (
        <div className="mt-2 space-y-1">
          {support.limitationKeys.map((key) => (
            <p key={key} className="flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{t(key)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
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
  const command = typeof hook.meta.command === 'string' ? hook.meta.command : ''
  const matcher = typeof hook.meta.matcher === 'string' ? hook.meta.matcher : ''
  const supportNote = typeof hook.meta.supportNote === 'string' ? hook.meta.supportNote : ''
  const managementStates = getHookManagementState(hook, agentView)
  const riskHints = getHookRiskHints(hook)
  const toggleState = managementStates.find((state) => state.action === 'toggle-hook')
  const [hookEnabled, setHookEnabled] = useState(() => hookEnabledValue(hook))
  const [toggleBusy, setToggleBusy] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  useEffect(() => {
    setHookEnabled(hookEnabledValue(hook))
    setToggleError(null)
  }, [hook.id, hook.meta.enabled])

  const toggleHook = async (): Promise<void> => {
    if (!toggleState?.hookKey || hook.agentId !== 'codex') return
    const enabled = !hookEnabled
    const confirmMessage = enabled
      ? t('capabilities.hooks.management.confirmEnableHook', { path: hook.path })
      : t('capabilities.hooks.management.confirmDisableHook', { path: hook.path })

    if (!window.confirm(confirmMessage)) return

    setToggleBusy(true)
    setToggleError(null)
    try {
      const result = await window.api.hooks.setHookEnabled({
        agentId: 'codex',
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
            <span className="min-w-0 max-w-full truncate font-mono text-xs text-foreground">{command || hook.name}</span>
            <ScopeBadge scope={hook.scope} />
            {hook.agentId === 'codex' && (
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
            <span className="min-w-0 truncate font-mono">{hook.path}</span>
          </div>
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

function visibleHooksAgents(agentView: AgentView): HooksAgentId[] {
  if (agentView === 'claude') return ['claude-code']
  if (agentView === 'codex') return ['codex']
  return ['claude-code', 'codex']
}
