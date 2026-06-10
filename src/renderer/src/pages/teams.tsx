import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { UsersRound, Inbox, FolderOpen, MessageSquare } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Accordion, AccordionItem, Button, Chip } from '@/components/ui'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingState } from '@/components/shared/loading-state'
import { useAgentTeams } from '@/hooks/use-agent-teams'
import { teamsGuide, type FeatureGuideEvidence } from '@/lib/feature-guidance'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import type { AgentTeamMember, AgentTeamSummary, AgentTeamTask } from '@shared/types/ipc'

/** A team counts as "recently active" when any of its files changed within this window. */
export const TEAMS_RECENT_ACTIVITY_MS = 5 * 60_000

const TASK_STATUS_TONE: Record<AgentTeamTask['status'], 'neutral' | 'primary' | 'success'> = {
  pending: 'neutral',
  in_progress: 'primary',
  completed: 'success',
  unknown: 'neutral'
}

function isRecentlyActive(team: AgentTeamSummary, now: number): boolean {
  return team.lastActivityAt != null && now - team.lastActivityAt <= TEAMS_RECENT_ACTIVITY_MS
}

function formatEpoch(value: number | null): string {
  return value == null ? '—' : formatRelativeTime(new Date(value))
}

function absoluteTime(value: number | null): string | undefined {
  return value == null ? undefined : new Date(value).toLocaleString()
}

export function Teams(): React.ReactElement {
  const { t } = useTranslation()
  const { teams, loading, error, reload } = useAgentTeams()
  const now = Date.now()

  const evidence = useMemo<FeatureGuideEvidence[]>(() => {
    const memberCount = teams.reduce((total, team) => total + team.members.length, 0)
    const recentCount = teams.filter((team) => isRecentlyActive(team, now)).length
    return [
      { labelKey: 'teams.evidence.teams', value: teams.length },
      { labelKey: 'teams.evidence.members', value: memberCount },
      { labelKey: 'teams.evidence.recentlyActive', value: recentCount }
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a render-time clock read, not a dependency
  }, [teams])

  const pageChrome = useMemo<PageChromeConfig>(
    () => ({
      title: t('teams.title'),
      subtitle: t('teams.subtitle'),
      sectionLabelKey: 'nav.sections.work',
      guide: {
        definition: teamsGuide,
        evidence
      }
    }),
    [evidence, t]
  )
  usePageChrome(pageChrome, [pageChrome])

  const showInitialLoading = loading && teams.length === 0

  return (
    <div className="space-y-6">
      {showInitialLoading ? (
        <LoadingState
          icon={UsersRound}
          title={t('teams.loadingList')}
          description={t('teams.loadingListDescription')}
          rows={3}
        />
      ) : error && teams.length === 0 ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <ErrorState
            fullHeight
            title={t('teams.errorTitle')}
            description={t('teams.errorDescription')}
            onRetry={reload}
          />
        </div>
      ) : teams.length === 0 ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <EmptyState
            fullHeight
            icon={UsersRound}
            title={t('teams.empty.title')}
            description={t('teams.empty.description')}
            action={
              <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <span>{t('teams.empty.enableHint')}</span>
                <code className="rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px]">
                  {'"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }'}
                </code>
                <span className="text-muted-foreground/75">{t('teams.empty.requirement')}</span>
              </div>
            }
          />
        </div>
      ) : (
        <Accordion
          variant="splitted"
          selectionMode="multiple"
          className="px-0"
          itemClasses={{
            base: 'rounded-xl border border-border bg-card px-4 shadow-none',
            trigger: 'gap-3 py-3.5',
            content: 'pb-4 pt-0'
          }}
        >
          {teams.map((team) => (
            <AccordionItem
              key={team.dirPath}
              aria-label={team.name}
              title={<TeamCardHeader team={team} recentlyActive={isRecentlyActive(team, now)} />}
            >
              <TeamCardDetail team={team} />
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}

function TeamCardHeader({
  team,
  recentlyActive
}: {
  team: AgentTeamSummary
  recentlyActive: boolean
}): React.ReactElement {
  const { t } = useTranslation()
  const lead = team.members.find((member) => member.agentType === 'team-lead')
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{team.name}</span>
          {recentlyActive && (
            <Chip tone="success" size="sm">
              {t('teams.recentlyActive')}
            </Chip>
          )}
        </div>
        {team.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{team.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Chip size="sm">{t('teams.card.members', { count: team.members.length })}</Chip>
        {lead?.model && (
          <Chip size="sm" className="hidden md:inline-flex">
            {lead.model}
          </Chip>
        )}
        <span
          className="text-xs tabular-nums text-muted-foreground"
          title={absoluteTime(team.lastActivityAt)}
        >
          {formatEpoch(team.lastActivityAt)}
        </span>
      </div>
    </div>
  )
}

function TeamCardDetail({ team }: { team: AgentTeamSummary }): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span title={absoluteTime(team.createdAt)}>
          {t('teams.card.created')} {formatEpoch(team.createdAt)}
        </span>
        <span title={absoluteTime(team.lastActivityAt)}>
          {t('teams.card.lastActivity')} {formatEpoch(team.lastActivityAt)}
        </span>
        {team.inboxMessageCount > 0 && (
          <span className="inline-flex items-center gap-1" title={absoluteTime(team.lastInboxMessageAt)}>
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            {t('teams.card.inboxMessages', { count: team.inboxMessageCount })}
          </span>
        )}
        <span className="inline-flex min-w-0 items-center gap-1">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono text-[11px]">{team.dirPath}</span>
        </span>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('teams.card.membersTitle')}
        </h4>
        <ul className="space-y-2">
          {team.members.map((member) => (
            <TeamMemberRow key={member.agentId} member={member} />
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('teams.card.tasksTitle')}
        </h4>
        {team.tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/75">{t('teams.card.noTasks')}</p>
        ) : (
          <ul className="space-y-1.5">
            {team.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-xs">
                <Chip tone={TASK_STATUS_TONE[task.status]} size="sm" className="mt-px shrink-0">
                  {t(`teams.card.taskStatus.${task.status}`)}
                </Chip>
                <div className="min-w-0">
                  <span className="text-foreground">{task.subject}</span>
                  <span className="ml-2 text-muted-foreground">
                    {task.owner && `@${task.owner}`}
                    {task.blockedBy.length > 0 && (
                      <span className="ml-2">
                        {t('teams.card.blockedBy', { ids: task.blockedBy.join(', ') })}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3 pt-1">
        {team.leadSessionId &&
          (team.leadSessionAvailable ? (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
              onPress={() => navigate(`/sessions/session-${team.leadSessionId}`)}
            >
              {t('teams.card.openLeadSession')}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground/75">
              {t('teams.card.leadSessionMissing')}
              <span className="ml-1 font-mono">{team.leadSessionId.slice(0, 8)}</span>
            </span>
          ))}
      </div>
    </div>
  )
}

function TeamMemberRow({ member }: { member: AgentTeamMember }): React.ReactElement {
  const { t } = useTranslation()
  const [promptExpanded, setPromptExpanded] = useState(false)
  const isLead = member.agentType === 'team-lead'

  return (
    <li className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: member.color ?? 'hsl(var(--muted-foreground) / 0.4)' }}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-foreground">{member.name}</span>
        {isLead ? (
          <Chip tone="primary" size="sm">
            {t('teams.card.lead')}
          </Chip>
        ) : (
          <Chip size="sm">{member.agentType}</Chip>
        )}
        {member.backend && <Chip size="sm">{member.backend}</Chip>}
        {member.model && <span className="text-[11px] text-muted-foreground">{member.model}</span>}
      </div>
      {member.prompt && (
        <div className="mt-1.5">
          <p
            className={cn(
              'whitespace-pre-wrap text-[11px] leading-4 text-muted-foreground',
              !promptExpanded && 'line-clamp-2'
            )}
          >
            {member.prompt}
          </p>
          <button
            type="button"
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
            aria-expanded={promptExpanded}
            onClick={() => setPromptExpanded((value) => !value)}
          >
            {t(promptExpanded ? 'teams.card.promptHide' : 'teams.card.promptShow')}
          </button>
        </div>
      )}
    </li>
  )
}
