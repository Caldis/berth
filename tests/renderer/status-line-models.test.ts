import { describe, it, expect } from 'vitest'
import {
  buildStatusLineViewModels,
  commandLooksLikeScriptReference,
  getStatusLineDiagnostics,
  getStatusLineGroupKey,
  getWorstDiagnosticLevel,
  rankStatusLineAsset
} from '../../src/renderer/src/lib/status-line-models'
import type { Asset } from '@shared/types/asset'

// GH-144: direct tests for the status-line view-model/diagnostic aggregators
// extracted from the capabilities god-page (previously zero direct coverage).

function asset(over: { id?: string; agentId?: string; scope?: Asset['scope']; name?: string; meta?: Record<string, unknown> } = {}): Asset {
  return {
    id: over.id ?? 'a1',
    agentId: over.agentId ?? 'claude-code',
    category: 'capability',
    type: 'statusline',
    scope: over.scope ?? 'user',
    name: over.name ?? 'sl',
    path: '/x',
    meta: over.meta ?? {}
  } as Asset
}

describe('getStatusLineGroupKey', () => {
  it('groups codex under a shared footer-items key', () => {
    expect(getStatusLineGroupKey(asset({ meta: { provider: 'codex' } }))).toBe('codex:footer-items')
  })
  it('groups others by provider:kind', () => {
    expect(getStatusLineGroupKey(asset({ agentId: 'claude-code', name: 'main', meta: {} }))).toBe('claude-code:main')
  })
})

describe('rankStatusLineAsset', () => {
  it('ranks enterprise > project > user > session', () => {
    expect(rankStatusLineAsset(asset({ scope: 'enterprise' }))).toBe(4)
    expect(rankStatusLineAsset(asset({ scope: 'project' }))).toBe(3)
    expect(rankStatusLineAsset(asset({ scope: 'user' }))).toBe(2)
    expect(rankStatusLineAsset(asset({ scope: 'session' }))).toBe(1)
  })
})

describe('commandLooksLikeScriptReference', () => {
  it('detects script paths and extensions', () => {
    expect(commandLooksLikeScriptReference('./statusline.sh')).toBe(true)
    expect(commandLooksLikeScriptReference('node render.js')).toBe(true)
    expect(commandLooksLikeScriptReference('~/bin/x.py arg')).toBe(true)
  })
  it('returns false for plain inline commands', () => {
    expect(commandLooksLikeScriptReference('echo hello')).toBe(false)
  })
})

describe('getStatusLineDiagnostics', () => {
  it('returns ok for an effective claude statusline with a command', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { command: 'echo hi' } }), true)
    expect(d).toEqual([{ level: 'ok', key: 'ok' }])
  })
  it('flags overridden when not effective', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { command: 'echo hi' } }), false, asset({ scope: 'project' }))
    expect(d).toContainEqual({ level: 'warning', key: 'overridden', values: { scope: 'project' } })
  })
  it('flags codex hidden as blocked', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { provider: 'codex', hidden: true } }), true)
    expect(d).toContainEqual({ level: 'blocked', key: 'hidden' })
  })
  it('flags disabledByDisableAllHooks as blocked', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { command: 'x', disabledByDisableAllHooks: true } }), true)
    expect(d).toContainEqual({ level: 'blocked', key: 'disabled' })
  })
  it('flags missing command', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { command: '  ' } }), true)
    expect(d).toContainEqual({ level: 'warning', key: 'missingCommand' })
  })
  it('flags unresolved script entry', () => {
    const d = getStatusLineDiagnostics(asset({ meta: { command: './statusline.sh', entryPaths: [] } }), true)
    expect(d).toContainEqual({ level: 'warning', key: 'unresolvedEntry' })
  })
})

describe('getWorstDiagnosticLevel', () => {
  it('prefers blocked over warning over ok', () => {
    expect(getWorstDiagnosticLevel([{ level: 'warning', key: 'w' }, { level: 'blocked', key: 'b' }])).toBe('blocked')
    expect(getWorstDiagnosticLevel([{ level: 'ok', key: 'o' }, { level: 'warning', key: 'w' }])).toBe('warning')
    expect(getWorstDiagnosticLevel([{ level: 'ok', key: 'o' }])).toBe('ok')
  })
})

describe('buildStatusLineViewModels', () => {
  it('marks the highest-scope asset in a group effective, others overridden', () => {
    const projectAsset = asset({ id: 'p', scope: 'project', name: 'sl', meta: { command: 'echo p' } })
    const userAsset = asset({ id: 'u', scope: 'user', name: 'sl', meta: { command: 'echo u' } })
    const vms = buildStatusLineViewModels([projectAsset, userAsset])
    const projectVm = vms.find((v) => v.asset.id === 'p')!
    const userVm = vms.find((v) => v.asset.id === 'u')!
    expect(projectVm.effective).toBe(true)
    expect(projectVm.overriddenBy).toBeUndefined()
    expect(userVm.effective).toBe(false)
    expect(userVm.overriddenBy?.id).toBe('p')
  })

  it('redacts credentials in the command view', () => {
    const vms = buildStatusLineViewModels([asset({ meta: { command: 'mycli --token sk-secret run' } })])
    expect(vms[0].commandView.redacted).toBe(true)
    expect(vms[0].commandView.value).not.toContain('sk-secret')
  })
})
