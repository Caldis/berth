import { describe, expect, it } from 'vitest'
import type { Asset } from '../../src/shared/types/asset'
import {
  getHookManagementState,
  getStageForEvent,
  getVisibleHookStages,
  getVisibleStageSupport,
  groupHookAssetsByStage
} from '../../src/renderer/src/lib/hook-lifecycle'

function hookAsset(overrides: Partial<Asset> & { id: string; agentId: string; eventType?: string }): Asset {
  return {
    id: overrides.id,
    agentId: overrides.agentId,
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: overrides.name ?? overrides.id,
    path: overrides.path ?? '/tmp/hooks.json',
    meta: {
      eventType: overrides.eventType,
      ...(overrides.meta ?? {})
    }
  }
}

describe('hook lifecycle model', () => {
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

  it('marks Claude single hook toggle as unavailable', () => {
    const states = getHookManagementState(
      hookAsset({ id: 'claude-hook', agentId: 'claude-code', eventType: 'Stop' }),
      'claude'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.claudeNoSingleHookToggle'
    })
  })

  it('keeps Codex single hook toggle disabled until persistence is wired', () => {
    const states = getHookManagementState(
      hookAsset({ id: 'codex-hook', agentId: 'codex', eventType: 'Stop' }),
      'codex'
    )

    expect(states.find((state) => state.action === 'toggle-hook')).toMatchObject({
      availability: 'unavailable',
      reasonKey: 'capabilities.hooks.management.codexSingleHookNotConnected'
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
})
