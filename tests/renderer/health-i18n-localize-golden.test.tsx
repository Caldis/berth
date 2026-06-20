// GOLDEN + key-coverage for the renderer side of the GH #6 Phase-2 messageKey
// contract.
//
//  1. KEY COVERAGE: every i18n key the engine emits across a broad fixture set
//     (claude + codex + project + sessions + scan-errors × win32 + darwin) must
//     resolve to a real string in en.json — guards against a check pointing at a
//     missing key.
//  2. LOCALIZED GOLDEN: pins the FULL localized prose (title / message /
//     suggestion / fix.label / fix.description / evidence.label) produced by
//     `localizeHealthCheck` for BOTH en and zh, proving the renderer resolves the
//     engine keys (not raw English) and that en output is byte-stable.
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runHealthChecks } from '@berth/scan-engine/engine/health'
import type { HealthCheck } from '@shared/types/ipc'
import i18n from '../../src/renderer/src/i18n'
import { localizeHealthCheck } from '../../src/renderer/src/lib/health-check-i18n'

let tempDir = ''
let darwinChecks: HealthCheck[] = []
let win32Checks: HealthCheck[] = []

function write(relative: string, content: string): void {
  const full = path.join(tempDir, relative)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

function mkdir(relative: string): void {
  fs.mkdirSync(path.join(tempDir, relative), { recursive: true })
}

beforeAll(() => {
  // Fixed path so path-derived check IDs are deterministic across runs.
  tempDir = path.join(os.tmpdir(), 'berth-health-localize-golden-fixture')
  fs.rmSync(tempDir, { recursive: true, force: true })
  fs.mkdirSync(tempDir, { recursive: true })
  const projectDir = path.join(tempDir, 'project')

  mkdir('.claude/agents')
  mkdir('.claude/skills/broken-skill')
  mkdir('.claude/projects/empty-project')
  write('.claude/AGENTS.md', '@missing-agents.md\n')
  write(
    '.claude/settings.json',
    JSON.stringify({
      permissions: { allow: ['Bash(*)'] },
      hooks: {
        PreToolUse: [
          {
            hooks: [
              { type: 'command', command: 'Get-ChildItem' },
              { type: 'command' },
              { type: 'http' },
              { type: 'mcp_tool', server: 'memory' },
              { type: 'prompt' },
              { type: 'agent' },
              { type: 'frobnicate', command: 'x' },
              { type: 'command', command: 'echo hi', shell: 'bash', args: ['a'] }
            ]
          }
        ]
      }
    })
  )
  write('.claude/agents/broken.md', ['---', 'name: broken', '---', 'No description.'].join('\n'))
  write('.claude.json', JSON.stringify({ mcpServers: { noTransport: { description: 'x' } } }))

  mkdir('project/.claude/skills')
  write('project/.claude/settings.json', '{ invalid json here')
  write('project/.claude/settings.local.json', JSON.stringify({ permissionMode: 'bypassPermissions' }))
  write('project/.mcp.json', JSON.stringify({ mcpServers: { empty: {} } }))
  write('project/CLAUDE.md', '# Claude project\n')
  write('project/AGENTS.md', '# Shared\n')

  mkdir('.codex/agents')
  mkdir('.codex/sessions')
  mkdir('.agents/skills/codex-broken-skill')
  write('.codex/AGENTS.md', '@missing-codex.md\n')
  write(
    '.codex/config.toml',
    [
      '[[hooks.PreToolUse]]',
      'matcher = "Bash"',
      '[[hooks.PreToolUse.hooks]]',
      'type = "command"',
      'command = "powershell -File hook.ps1"',
      '[[hooks.Stop]]',
      '[[hooks.Stop.hooks]]',
      'type = "prompt"',
      'prompt = "Summarize"',
      '[[hooks.Notification]]',
      '[[hooks.Notification.hooks]]',
      'type = "command"'
    ].join('\n')
  )
  write(
    '.codex/hooks.json',
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo stop', async: true }] }] } })
  )
  write('.codex/agents/broken.toml', 'name = "broken"\n')
  write('project/.codex/config.toml', '[mcp_servers.bad\ncommand = "bad"')

  const options = {
    homeDir: tempDir,
    projectDir,
    scanErrors: [
      { path: path.join(tempDir, '.codex', 'agents', 'x.toml'), type: 'agent', message: 'Unexpected token at line 3.' }
    ],
    assets: [
      {
        id: 'sess-1',
        agentId: 'claude-code',
        category: 'session' as const,
        type: 'session' as const,
        scope: 'session' as const,
        name: 'orphan-session.jsonl',
        path: path.join(tempDir, '.claude', 'projects', 'p', 'orphan-session.jsonl'),
        meta: {}
      }
    ]
  }
  darwinChecks = runHealthChecks({ ...options, platform: 'darwin' })
  win32Checks = runHealthChecks({ ...options, platform: 'win32' })
})

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
})

function localizedProse(checks: HealthCheck[], lang: 'en' | 'zh'): unknown {
  i18n.changeLanguage(lang)
  const t = i18n.getFixedT(lang)
  return checks
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((check) => {
      const localized = localizeHealthCheck(check, t)
      return {
        id: localized.id,
        title: localized.title,
        message: localized.message,
        suggestion: localized.suggestion,
        fix: localized.fix ? { label: localized.fix.label, description: localized.fix.description } : undefined,
        evidence: localized.evidence?.map((e) => e.label)
      }
    })
}

describe('renderer health i18n localize (GH #6 Phase-2)', () => {
  it('every emitted i18n key exists in en.json (key-coverage guard)', () => {
    const en = i18n.getDataByLanguage('en')?.translation as Record<string, unknown>
    function get(dotted: string): unknown {
      return dotted.split('.').reduce<unknown>((acc, k) => {
        if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
        return undefined
      }, en)
    }
    const missing: string[] = []
    for (const check of [...darwinChecks, ...win32Checks]) {
      const keys = check.i18nKeys
      if (!keys) continue
      for (const value of Object.values(keys)) {
        if (typeof value !== 'string') continue
        if (typeof get(value) !== 'string') missing.push(value)
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })

  it('localizes the full prose by key for en + zh (golden)', () => {
    expect(localizedProse(darwinChecks, 'en')).toMatchSnapshot('darwin-en')
    expect(localizedProse(win32Checks, 'en')).toMatchSnapshot('win32-en')
    expect(localizedProse(darwinChecks, 'zh')).toMatchSnapshot('darwin-zh')
    expect(localizedProse(win32Checks, 'zh')).toMatchSnapshot('win32-zh')
  })
})
