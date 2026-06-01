import type { AgentView, Asset } from '@shared/types/asset'

export type HookLifecycleStageId =
  | 'session-start'
  | 'user-input'
  | 'tool-before'
  | 'permission'
  | 'tool-after'
  | 'subagent'
  | 'context-maintenance'
  | 'session-stop'
  | 'environment'

export type HookLifecycleAgent = 'claude' | 'codex'
export type HookLifecycleSupport = 'supported' | 'partial' | 'unsupported'

export interface HookNativeEvent {
  eventType: string
  labelKey: string
  descriptionKey: string
}

export interface HookAgentStageSupport {
  agent: HookLifecycleAgent
  support: HookLifecycleSupport
  events: HookNativeEvent[]
  summaryKey: string
  limitationKeys: string[]
}

export interface HookLifecycleStage {
  id: HookLifecycleStageId
  order: number
  titleKey: string
  summaryKey: string
  behaviorKey: string
  guideKey: string
  recommendationKeys: string[]
  supports: Record<HookLifecycleAgent, HookAgentStageSupport>
}

export type HookManagementAction =
  | 'open-source-file'
  | 'open-source-directory'
  | 'open-entry-file'
  | 'open-entry-directory'
  | 'toggle-agent-hooks'
  | 'toggle-hook'

export type HookManagementAvailability =
  | 'available'
  | 'unavailable'
  | 'needs-confirmation'

export interface HookManagementState {
  action: HookManagementAction
  availability: HookManagementAvailability
  reasonKey?: string
  targetPath?: string
  hookKey?: string
  enabled?: boolean
  toggleStrategy?: string
}

export type HookRiskLevel = 'info' | 'warning'

export interface HookRiskHint {
  key: string
  level: HookRiskLevel
}

export interface HookEventGroup {
  eventType: string
  hooks: Asset[]
}

export interface HookStageGroup {
  stage: HookLifecycleStage | null
  id: HookLifecycleStageId | 'unknown'
  hooks: Asset[]
  events: HookEventGroup[]
}

const hookEvent = (eventType: string): HookNativeEvent => ({
  eventType,
  labelKey: `capabilities.hooks.nativeEvents.${eventType}.label`,
  descriptionKey: `capabilities.hooks.nativeEvents.${eventType}.description`
})

const noSupport = (agent: HookLifecycleAgent, stageId: HookLifecycleStageId): HookAgentStageSupport => ({
  agent,
  support: 'unsupported',
  events: [],
  summaryKey: `capabilities.hooks.agentSupport.${stageId}.${agent}.summary`,
  limitationKeys: [`capabilities.hooks.limitations.${stageId}.${agent}.unsupported`]
})

const stageCopy = (stageId: HookLifecycleStageId): Pick<HookLifecycleStage, 'summaryKey' | 'recommendationKeys'> => ({
  summaryKey: `capabilities.hooks.stage.${stageId}.summary`,
  recommendationKeys: [
    `capabilities.hooks.recommendations.${stageId}.primary`,
    `capabilities.hooks.recommendations.${stageId}.secondary`,
    `capabilities.hooks.recommendations.${stageId}.tertiary`
  ]
})

export const hookLifecycleStages: HookLifecycleStage[] = [
  {
    id: 'session-start',
    order: 1,
    titleKey: 'capabilities.hooks.stage.session-start.title',
    ...stageCopy('session-start'),
    behaviorKey: 'capabilities.hooks.stage.session-start.behavior',
    guideKey: 'capabilities.hooks.stage.session-start.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('Setup'), hookEvent('SessionStart')],
        summaryKey: 'capabilities.hooks.agentSupport.session-start.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('SessionStart')],
        summaryKey: 'capabilities.hooks.agentSupport.session-start.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'user-input',
    order: 2,
    titleKey: 'capabilities.hooks.stage.user-input.title',
    ...stageCopy('user-input'),
    behaviorKey: 'capabilities.hooks.stage.user-input.behavior',
    guideKey: 'capabilities.hooks.stage.user-input.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('UserPromptSubmit'), hookEvent('UserPromptExpansion')],
        summaryKey: 'capabilities.hooks.agentSupport.user-input.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('UserPromptSubmit')],
        summaryKey: 'capabilities.hooks.agentSupport.user-input.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'tool-before',
    order: 3,
    titleKey: 'capabilities.hooks.stage.tool-before.title',
    ...stageCopy('tool-before'),
    behaviorKey: 'capabilities.hooks.stage.tool-before.behavior',
    guideKey: 'capabilities.hooks.stage.tool-before.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('PreToolUse')],
        summaryKey: 'capabilities.hooks.agentSupport.tool-before.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'partial',
        events: [hookEvent('PreToolUse')],
        summaryKey: 'capabilities.hooks.agentSupport.tool-before.codex.summary',
        limitationKeys: ['capabilities.hooks.limitations.codexToolCoverage']
      }
    }
  },
  {
    id: 'permission',
    order: 4,
    titleKey: 'capabilities.hooks.stage.permission.title',
    ...stageCopy('permission'),
    behaviorKey: 'capabilities.hooks.stage.permission.behavior',
    guideKey: 'capabilities.hooks.stage.permission.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('PermissionRequest'), hookEvent('PermissionDenied'), hookEvent('Elicitation'), hookEvent('ElicitationResult')],
        summaryKey: 'capabilities.hooks.agentSupport.permission.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('PermissionRequest')],
        summaryKey: 'capabilities.hooks.agentSupport.permission.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'tool-after',
    order: 5,
    titleKey: 'capabilities.hooks.stage.tool-after.title',
    ...stageCopy('tool-after'),
    behaviorKey: 'capabilities.hooks.stage.tool-after.behavior',
    guideKey: 'capabilities.hooks.stage.tool-after.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('PostToolUse'), hookEvent('PostToolUseFailure'), hookEvent('PostToolBatch')],
        summaryKey: 'capabilities.hooks.agentSupport.tool-after.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'partial',
        events: [hookEvent('PostToolUse')],
        summaryKey: 'capabilities.hooks.agentSupport.tool-after.codex.summary',
        limitationKeys: ['capabilities.hooks.limitations.codexToolCoverage', 'capabilities.hooks.limitations.codexPostToolMerged']
      }
    }
  },
  {
    id: 'subagent',
    order: 6,
    titleKey: 'capabilities.hooks.stage.subagent.title',
    ...stageCopy('subagent'),
    behaviorKey: 'capabilities.hooks.stage.subagent.behavior',
    guideKey: 'capabilities.hooks.stage.subagent.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('SubagentStart'), hookEvent('SubagentStop'), hookEvent('TaskCreated'), hookEvent('TaskCompleted'), hookEvent('TeammateIdle')],
        summaryKey: 'capabilities.hooks.agentSupport.subagent.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('SubagentStart'), hookEvent('SubagentStop')],
        summaryKey: 'capabilities.hooks.agentSupport.subagent.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'context-maintenance',
    order: 7,
    titleKey: 'capabilities.hooks.stage.context-maintenance.title',
    ...stageCopy('context-maintenance'),
    behaviorKey: 'capabilities.hooks.stage.context-maintenance.behavior',
    guideKey: 'capabilities.hooks.stage.context-maintenance.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('PreCompact'), hookEvent('PostCompact'), hookEvent('InstructionsLoaded'), hookEvent('ConfigChange'), hookEvent('CwdChanged'), hookEvent('FileChanged')],
        summaryKey: 'capabilities.hooks.agentSupport.context-maintenance.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('PreCompact'), hookEvent('PostCompact')],
        summaryKey: 'capabilities.hooks.agentSupport.context-maintenance.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'session-stop',
    order: 8,
    titleKey: 'capabilities.hooks.stage.session-stop.title',
    ...stageCopy('session-stop'),
    behaviorKey: 'capabilities.hooks.stage.session-stop.behavior',
    guideKey: 'capabilities.hooks.stage.session-stop.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('Stop'), hookEvent('StopFailure'), hookEvent('SessionEnd')],
        summaryKey: 'capabilities.hooks.agentSupport.session-stop.claude.summary',
        limitationKeys: []
      },
      codex: {
        agent: 'codex',
        support: 'supported',
        events: [hookEvent('Stop')],
        summaryKey: 'capabilities.hooks.agentSupport.session-stop.codex.summary',
        limitationKeys: []
      }
    }
  },
  {
    id: 'environment',
    order: 9,
    titleKey: 'capabilities.hooks.stage.environment.title',
    ...stageCopy('environment'),
    behaviorKey: 'capabilities.hooks.stage.environment.behavior',
    guideKey: 'capabilities.hooks.stage.environment.guide',
    supports: {
      claude: {
        agent: 'claude',
        support: 'supported',
        events: [hookEvent('WorktreeCreate'), hookEvent('WorktreeRemove'), hookEvent('Notification')],
        summaryKey: 'capabilities.hooks.agentSupport.environment.claude.summary',
        limitationKeys: []
      },
      codex: noSupport('codex', 'environment')
    }
  }
]

const stageByEvent = new Map<string, HookLifecycleStage>(
  hookLifecycleStages.flatMap((stage) => {
    const events = new Set<string>()
    for (const support of Object.values(stage.supports)) {
      for (const event of support.events) events.add(event.eventType)
    }
    return Array.from(events).map((eventType) => [eventType, stage])
  })
)

export function getVisibleHookStages(view: AgentView): HookLifecycleStage[] {
  return hookLifecycleStages.filter((stage) => {
    if (view === 'all') return true
    const agent = viewToLifecycleAgent(view)
    return agent ? stage.supports[agent].support !== 'unsupported' : true
  })
}

export function getStageForEvent(eventType: string): HookLifecycleStage | null {
  return stageByEvent.get(eventType) ?? null
}

export function getVisibleStageSupport(stage: HookLifecycleStage, view: AgentView): HookAgentStageSupport[] {
  if (view === 'all') return [stage.supports.claude, stage.supports.codex]
  const agent = viewToLifecycleAgent(view)
  return agent ? [stage.supports[agent]].filter((support) => support.support !== 'unsupported') : []
}

export function groupHookAssetsByStage(assets: Asset[], view: AgentView): HookStageGroup[] {
  const visibleStages = getVisibleHookStages(view)
  const groups = new Map<HookLifecycleStageId | 'unknown', HookStageGroup>()

  for (const stage of visibleStages) {
    groups.set(stage.id, {
      id: stage.id,
      stage,
      hooks: [],
      events: []
    })
  }

  for (const asset of assets) {
    if (asset.type !== 'hook') continue
    const eventType = getHookEventType(asset)
    const stage = eventType ? getStageForEvent(eventType) : null
    const id = stage?.id ?? 'unknown'

    if (stage && !groups.has(id)) continue

    const group = groups.get(id) ?? {
      id,
      stage,
      hooks: [],
      events: []
    }
    group.hooks.push(asset)

    const eventGroup = findOrCreateEventGroup(group, eventType ?? 'Unknown')
    eventGroup.hooks.push(asset)
    groups.set(id, group)
  }

  return Array.from(groups.values()).sort((a, b) => {
    const orderA = a.stage?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.stage?.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

export function getHookManagementState(asset: Asset, _view: AgentView): HookManagementState[] {
  const entryPath = firstString(asset.meta.entryPaths)
  const states: HookManagementState[] = [
    pathAction('open-source-file', asset.path),
    pathAction('open-source-directory', asset.path),
    pathAction('open-entry-file', entryPath, 'capabilities.hooks.management.noEntryFile'),
    pathAction('open-entry-directory', entryPath, 'capabilities.hooks.management.noEntryFile')
  ]

  states.push(getToggleHookState(asset))
  return states
}

export function getHookRiskHints(asset: Asset): HookRiskHint[] {
  const hints: HookRiskHint[] = []
  const command = firstString(asset.meta.command)
  const entryPaths = stringArray(asset.meta.entryPaths)
  const eventType = getHookEventType(asset)
  const matcher = firstString(asset.meta.matcher)

  if (command && entryPaths.length === 0) {
    hints.push({ key: 'capabilities.hooks.risk.noEntryFile', level: 'warning' })
  }
  if ((eventType === 'PreToolUse' || eventType === 'PostToolUse') && !matcher) {
    hints.push({ key: 'capabilities.hooks.risk.broadToolMatcher', level: 'warning' })
  }
  if (asset.meta.managed === true) {
    hints.push({ key: 'capabilities.hooks.risk.managed', level: 'info' })
  }

  return hints
}

function viewToLifecycleAgent(view: AgentView): HookLifecycleAgent | null {
  if (view === 'claude') return 'claude'
  if (view === 'codex') return 'codex'
  return null
}

function getHookEventType(asset: Asset): string | null {
  const eventType = asset.meta.eventType ?? asset.meta.event
  return typeof eventType === 'string' && eventType.length > 0 ? eventType : null
}

function findOrCreateEventGroup(group: HookStageGroup, eventType: string): HookEventGroup {
  let eventGroup = group.events.find((item) => item.eventType === eventType)
  if (!eventGroup) {
    eventGroup = { eventType, hooks: [] }
    group.events.push(eventGroup)
  }
  return eventGroup
}

function pathAction(action: HookManagementAction, targetPath: string | undefined, reasonKey = 'capabilities.hooks.management.noTargetPath'): HookManagementState {
  if (!targetPath) {
    return {
      action,
      availability: 'unavailable',
      reasonKey
    }
  }

  return {
    action,
    availability: 'available',
    targetPath
  }
}

function getToggleHookState(asset: Asset): HookManagementState {
  if (asset.meta.managed === true) {
    return {
      action: 'toggle-hook',
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.managedHook'
    }
  }

  const hookKey = firstString(asset.meta.hookKey)
  if (!hookKey) {
    return {
      action: 'toggle-hook',
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.singleHookMissingKey'
    }
  }

  const toggleStrategy = firstString(asset.meta.toggleStrategy)
  if (asset.meta.canToggleHook === true && (toggleStrategy === 'native-state' || toggleStrategy === 'soft-remove')) {
    return {
      action: 'toggle-hook',
      availability: 'needs-confirmation',
      targetPath: asset.path,
      hookKey,
      enabled: asset.meta.enabled !== false,
      toggleStrategy
    }
  }

  if (asset.agentId === 'claude-code' || asset.agentId === 'claude') {
    return {
      action: 'toggle-hook',
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.claudeSingleHookUserOnly'
    }
  }
  if (asset.agentId === 'codex') {
    return {
      action: 'toggle-hook',
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.codexSingleHookNotConnected'
    }
  }
  return {
    action: 'toggle-hook',
    availability: 'unavailable',
    reasonKey: 'capabilities.hooks.management.unknownAgent'
  }
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return undefined
  return value.find((item): item is string => typeof item === 'string' && item.length > 0)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}
