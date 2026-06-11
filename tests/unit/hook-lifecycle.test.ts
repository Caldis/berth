import { describe, expect, it } from 'vitest'
import type { Asset } from '@shared/types/asset'
import {
  getHookRiskHints,
  getHookManagementState,
  getStageForEvent,
  getVisibleHookStages,
  getVisibleStageSupport,
  groupHookAssetsByStage,
  hookLifecycleStages
} from '../../src/renderer/src/lib/hook-lifecycle'
import type { AgentCapabilityPluginHookSchemaDescriptor } from '@shared/types/agent-plugin'

function hookAsset(overrides: Partial<Asset> & { id: string; agentId: string; eventType?: string }): Asset {
  return {
    id: overrides.id,
    agentId: overrides.agentId,
    category: 'capability',
    type: 'hook',
    scope: overrides.scope ?? 'user',
    name: overrides.name ?? overrides.id,
    path: overrides.path ?? '/tmp/hooks.json',
    meta: {
      eventType: overrides.eventType,
      ...(overrides.meta ?? {})
    }
  }
}

describe('hook lifecycle model', () => {
  const schemaDrivenCodexHooks: AgentCapabilityPluginHookSchemaDescriptor = {
    agentId: 'codex',
    events: [
      {
        eventType: 'CustomPreRun',
        stageId: 'tool-before',
        support: 'partial',
        matcherSupported: true,
        matcherField: 'tool_name',
        labelKey: 'settings.agentPluginHookEvents.codex.CustomPreRun.label',
        descriptionKey: 'settings.agentPluginHookEvents.codex.CustomPreRun.description'
      }
    ],
    handlers: []
  }

  it('keeps Claude Code and Codex official hook events classified by lifecycle stage', () => {
    const officialClaudeEvents = [
      'ConfigChange',
      'CwdChanged',
      'Elicitation',
      'ElicitationResult',
      'FileChanged',
      'InstructionsLoaded',
      'Notification',
      'PermissionDenied',
      'PermissionRequest',
      'PostCompact',
      'PostToolBatch',
      'PostToolUse',
      'PostToolUseFailure',
      'PreCompact',
      'PreToolUse',
      'SessionEnd',
      'SessionStart',
      'Setup',
      'Stop',
      'StopFailure',
      'SubagentStart',
      'SubagentStop',
      'TaskCompleted',
      'TaskCreated',
      'TeammateIdle',
      'UserPromptExpansion',
      'UserPromptSubmit',
      'WorktreeCreate',
      'WorktreeRemove'
    ]
    const officialCodexEvents = [
      'PermissionRequest',
      'PostCompact',
      'PostToolUse',
      'PreCompact',
      'PreToolUse',
      'SessionStart',
      'Stop',
      'SubagentStart',
      'SubagentStop',
      'UserPromptSubmit'
    ]

    expect(eventsForAgent('claude')).toEqual(officialClaudeEvents)
    expect(eventsForAgent('codex')).toEqual(officialCodexEvents)
    expect(getStageForEvent('InstructionsLoaded')?.id).toBe('context-maintenance')
    expect(getStageForEvent('ElicitationResult')?.id).toBe('permission')
    expect(getStageForEvent('WorktreeRemove')?.id).toBe('environment')
  })

  it('keeps each lifecycle stage ready for sidebar summaries and recommended actions', () => {
    for (const stage of hookLifecycleStages) {
      expect(stage.summaryKey).toBe(`capabilities.hooks.stage.${stage.id}.summary`)
      expect(stage.recommendationKeys).toHaveLength(3)
      expect(stage.recommendationKeys.every((key) => key.startsWith(`capabilities.hooks.recommendations.${stage.id}.`))).toBe(true)
    }
  })

  it('keeps all stages visible in all view', () => {
    expect(getVisibleHookStages('all').map((stage) => stage.id)).toEqual([
      'session-start',
      'user-input',
      'tool-before',
      'permission',
      'tool-after',
      'subagent',
      'context-maintenance',
      'session-stop',
      'environment'
    ])
  })

  it('hides unsupported Codex-only view stages', () => {
    expect(getVisibleHookStages('codex').map((stage) => stage.id)).not.toContain('environment')
    expect(getVisibleHookStages('claude').map((stage) => stage.id)).toContain('environment')
  })

  it('maps native events to abstract stages', () => {
    expect(getStageForEvent('PreToolUse')?.id).toBe('tool-before')
    expect(getStageForEvent('PostToolUseFailure')?.id).toBe('tool-after')
    expect(getStageForEvent('Notification')?.id).toBe('environment')
    expect(getStageForEvent('NotARealEvent')).toBeNull()
  })

  it('uses plugin hook schema events for stage mapping when available', () => {
    const stage = getStageForEvent('CustomPreRun', {
      hookSchemas: { codex: schemaDrivenCodexHooks }
    })
    const support = getVisibleStageSupport(stage!, 'codex', {
      hookSchemas: { codex: schemaDrivenCodexHooks }
    })

    expect(stage?.id).toBe('tool-before')
    expect(support).toEqual([
      expect.objectContaining({
        agent: 'codex',
        support: 'partial',
        events: [
          expect.objectContaining({
            eventType: 'CustomPreRun',
            descriptionKey: 'settings.agentPluginHookEvents.codex.CustomPreRun.description'
          })
        ]
      })
    ])
  })

  it('groups schema-declared events and keeps undeclared events in unknown', () => {
    const groups = groupHookAssetsByStage([
      hookAsset({ id: 'schema-hook', agentId: 'codex', eventType: 'CustomPreRun' }),
      hookAsset({ id: 'unknown-hook', agentId: 'codex', eventType: 'MissingFromSchema' })
    ], 'codex', {
      hookSchemas: { codex: schemaDrivenCodexHooks }
    })

    expect(groups.find((group) => group.id === 'tool-before')?.hooks.map((hook) => hook.id))
      .toEqual(['schema-hook'])
    expect(groups.find((group) => group.id === 'unknown')?.hooks.map((hook) => hook.id))
      .toEqual(['unknown-hook'])
  })

  it('returns only current agent support outside all view', () => {
    const stage = getStageForEvent('PreToolUse')
    expect(stage).not.toBeNull()
    expect(getVisibleStageSupport(stage!, 'codex')).toHaveLength(1)
    expect(getVisibleStageSupport(stage!, 'codex')[0]?.agent).toBe('codex')
    expect(getVisibleStageSupport(stage!, 'all').map((support) => support.agent)).toEqual(['claude', 'codex'])
  })

  it('groups hook assets by lifecycle stage and keeps empty stages', () => {
    const groups = groupHookAssetsByStage([
      hookAsset({ id: 'claude-pre', agentId: 'claude-code', eventType: 'PreToolUse' }),
      hookAsset({ id: 'codex-stop', agentId: 'codex', eventType: 'Stop' })
    ], 'all')

    expect(groups.find((group) => group.id === 'tool-before')?.hooks.map((hook) => hook.id)).toEqual(['claude-pre'])
    expect(groups.find((group) => group.id === 'session-stop')?.hooks.map((hook) => hook.id)).toEqual(['codex-stop'])
    expect(groups.find((group) => group.id === 'session-start')?.hooks).toEqual([])
  })

  it('keeps unknown hook events instead of dropping them', () => {
    const groups = groupHookAssetsByStage([
      hookAsset({ id: 'unknown-hook', agentId: 'claude-code', eventType: 'FutureEvent' })
    ], 'all')

    const unknownGroup = groups.find((group) => group.id === 'unknown')
    expect(unknownGroup?.stage).toBeNull()
    expect(unknownGroup?.events[0]).toMatchObject({
      eventType: 'FutureEvent',
      hooks: [expect.objectContaining({ id: 'unknown-hook' })]
    })
  })

  it('allows Claude user hooks with a soft-remove key to toggle', () => {
    const states = getHookManagementState(
      hookAsset({
        id: 'claude-hook',
        agentId: 'claude-code',
        eventType: 'Stop',
        meta: {
          hookKey: 'claude-code:scenario:hook',
          enabled: true,
          canToggleHook: true,
          toggleStrategy: 'soft-remove'
        }
      }),
      'claude'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'needs-confirmation',
      hookKey: 'claude-code:scenario:hook',
      enabled: true,
      toggleStrategy: 'soft-remove'
    })
  })

  it('keeps non-user Claude hooks unavailable', () => {
    const states = getHookManagementState(
      hookAsset({
        id: 'claude-hook',
        agentId: 'claude-code',
        eventType: 'Stop',
        scope: 'project',
        meta: {
          hookKey: 'claude-code:scenario:hook',
          canToggleHook: false,
          toggleStrategy: 'read-only'
        }
      }),
      'claude'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.claudeSingleHookUserOnly'
    })
  })

  it('allows Codex non-managed hooks with a hook state key to toggle', () => {
    const states = getHookManagementState(
      hookAsset({
        id: 'codex-hook',
        agentId: 'codex',
        eventType: 'Stop',
        meta: {
          hookKey: 'C:\\Users\\test\\.codex\\hooks.json:stop:0:0',
          enabled: true,
          canToggleHook: true,
          toggleStrategy: 'native-state'
        }
      }),
      'codex'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'needs-confirmation',
      hookKey: 'C:\\Users\\test\\.codex\\hooks.json:stop:0:0',
      enabled: true
    })
  })

  it('keeps Codex hooks without a state key unavailable', () => {
    const states = getHookManagementState(
      hookAsset({ id: 'codex-hook', agentId: 'codex', eventType: 'Stop' }),
      'codex'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.singleHookMissingKey'
    })
  })

  it('exposes open actions for source and entry paths', () => {
    const states = getHookManagementState(
      hookAsset({
        id: 'codex-hook',
        agentId: 'codex',
        eventType: 'SessionStart',
        path: 'C:\\Users\\test\\.codex\\hooks.json',
        meta: {
          entryPaths: ['C:\\Users\\test\\.codex\\hooks\\start.ps1']
        }
      }),
      'codex'
    )

    expect(states.find((state) => state.action === 'open-source-file')).toMatchObject({
      availability: 'available',
      targetPath: 'C:\\Users\\test\\.codex\\hooks.json'
    })
    expect(states.find((state) => state.action === 'open-entry-file')).toMatchObject({
      availability: 'available',
      targetPath: 'C:\\Users\\test\\.codex\\hooks\\start.ps1'
    })
  })

  it('does not allow managed hook toggles', () => {
    const states = getHookManagementState(
      hookAsset({
        id: 'managed-codex-hook',
        agentId: 'codex',
        eventType: 'Stop',
        meta: { managed: true, canToggleHook: true }
      }),
      'codex'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.managedHook'
    })
  })

  it('flags row-level hook configuration risks', () => {
    const hints = getHookRiskHints(
      hookAsset({
        id: 'risky-hook',
        agentId: 'codex',
        eventType: 'PreToolUse',
        meta: {
          command: 'python hook.py',
          entryPaths: []
        }
      })
    )

    expect(hints).toEqual([
      expect.objectContaining({ key: 'capabilities.hooks.risk.noEntryFile', level: 'warning' }),
      expect.objectContaining({ key: 'capabilities.hooks.risk.broadToolMatcher', level: 'warning' })
    ])
  })

  it('flags equivalent hook sources and current-source disabled but effective elsewhere state', () => {
    const hints = getHookRiskHints(
      hookAsset({
        id: 'disabled-user-hook',
        agentId: 'claude-code',
        eventType: 'Stop',
        meta: {
          enabled: false,
          effectiveEnabled: true,
          equivalentSourceCount: 2,
          equivalentSources: [
            {
              id: 'disabled-user-hook',
              agentId: 'claude-code',
              scope: 'user',
              name: 'User stop hook',
              path: 'C:\\Users\\test\\.claude\\settings.json',
              enabled: false,
              managed: false
            },
            {
              id: 'project-stop-hook',
              agentId: 'claude-code',
              scope: 'project',
              name: 'Project stop hook',
              path: 'D:\\repo\\.claude\\settings.json',
              enabled: true,
              managed: true
            }
          ]
        }
      })
    )

    expect(hints).toEqual([
      expect.objectContaining({ key: 'capabilities.hooks.risk.equivalentSources', level: 'info' }),
      expect.objectContaining({ key: 'capabilities.hooks.risk.effectiveElsewhere', level: 'warning' })
    ])
  })
})

function eventsForAgent(agent: 'claude' | 'codex'): string[] {
  return Array.from(new Set(hookLifecycleStages.flatMap((stage) => stage.supports[agent].events.map((event) => event.eventType)))).sort()
}
