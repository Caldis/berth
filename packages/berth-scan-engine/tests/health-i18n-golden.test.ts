// GOLDEN oracle for GH #6 Phase-2 (messageKey contract).
//
// Pins the FULL engine HealthCheck output — every prose field (title / message /
// suggestion / fix.label / fix.description / evidence.label) AND the emitted
// i18nKeys + params — for a fixed fixture set covering
//   claude + codex + project + sessions + scan-errors  ×  win32 + darwin.
//
// This snapshot is the safety net for the dual-carry migration: it MUST stay
// byte-identical through 2A (add fields) -> 2B (annotate keys) -> 2C (renderer
// prefers keys). The renderer key-coverage + localized-output goldens live under
// tests/renderer; this one guards the engine contract independent of the UI.
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runHealthChecks } from '../src/engine/health'
import type { HealthCheck } from '@shared/types/ipc'

let tempDir = ''
let homeDir = ''
let projectDir = ''

function write(relative: string, content: string): void {
  const full = path.join(tempDir, relative)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

function mkdir(relative: string): void {
  fs.mkdirSync(path.join(tempDir, relative), { recursive: true })
}

beforeAll(() => {
  // Fixed (non-random) path so the path-derived check IDs (hashString of
  // resolved import / transcript paths) stay deterministic — the golden must be
  // byte-stable across runs, not just within one run.
  tempDir = path.join(os.tmpdir(), 'berth-health-golden-fixture')
  fs.rmSync(tempDir, { recursive: true, force: true })
  fs.mkdirSync(tempDir, { recursive: true })
  homeDir = tempDir
  projectDir = path.join(tempDir, 'project')

  // --- Claude Code fixtures (user + project) ---
  mkdir('.claude/agents')
  mkdir('.claude/skills/broken-skill')
  mkdir('.claude/projects/empty-project')
  // No .claude/CLAUDE.md -> user-claude-md-missing (source/info)
  write('.claude/AGENTS.md', '@missing-agents.md\n')
  write(
    '.claude/settings.json',
    JSON.stringify({
      permissions: { allow: ['Bash(*)'] },
      hooks: {
        PreToolUse: [
          {
            hooks: [
              { type: 'command', command: 'Get-ChildItem' }, // windows-shell hint on win32
              { type: 'command' }, // missing command
              { type: 'http' }, // missing url
              { type: 'mcp_tool', server: 'memory' }, // missing tool
              { type: 'prompt' }, // missing prompt
              { type: 'agent' }, // missing prompt
              { type: 'frobnicate', command: 'x' }, // unknown type
              { type: 'command', command: 'echo hi', shell: 'bash', args: ['a'] } // shell ignored w/ args
            ]
          }
        ]
      }
    })
  )
  write('.claude/agents/broken.md', ['---', 'name: broken', '---', 'No description.'].join('\n'))
  // settings.local.json invalid JSON -> syntax error
  write('.claude/.placeholder', '') // ensure dir
  write('.claude.json', JSON.stringify({ mcpServers: { noTransport: { description: 'x' } } }))

  mkdir('project/.claude/skills')
  write('project/.claude/settings.json', '{ invalid json here')
  write('project/.claude/settings.local.json', JSON.stringify({ permissionMode: 'bypassPermissions' }))
  write('project/.mcp.json', JSON.stringify({ mcpServers: { empty: {} } }))
  write('project/CLAUDE.md', '# Claude project\n')
  write('project/AGENTS.md', '# Shared\n') // claude has AGENTS.md but CLAUDE.md does not import it

  // --- Codex fixtures (user + project) ---
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
      'command = "powershell -File hook.ps1"', // windows-command override hint on win32
      '[[hooks.Stop]]',
      '[[hooks.Stop.hooks]]',
      'type = "prompt"', // parsed but skipped type
      'prompt = "Summarize"',
      '[[hooks.Notification]]',
      '[[hooks.Notification.hooks]]',
      'type = "command"' // missing command
    ].join('\n')
  )
  // hooks.json present alongside config.toml hooks -> duplicated
  write(
    '.codex/hooks.json',
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo stop', async: true }] }] } })
  )
  write('.codex/agents/broken.toml', 'name = "broken"\n') // missing description/developer_instructions

  write('project/.codex/config.toml', '[mcp_servers.bad\ncommand = "bad"') // invalid TOML
})

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
})

// Stable, field-by-field projection of every check so the snapshot reads as a
// readable contract (no Set/Buffer noise) and pins exactly what localization
// depends on.
// Portable: DROP the finding `id` (hash suffix derives from the host os.tmpdir() path) and
// placeholder UNKEYED prose (raw JSON/TOML/fs parser errors are Node/V8-version-specific).
// Sort host-independently. Pins the i18n contract (keys+params) + KEYED engine prose only,
// so the snapshot is byte-stable across mac (local) and CI ubuntu.
function project(checks: HealthCheck[]): unknown {
  const sortKey = (c: HealthCheck): string =>
    JSON.stringify([c.category, c.severity, c.agentId, c.i18nKeys ?? {}, c.params ?? {}])
  return checks
    .slice()
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .map((c) => {
      const k = c.i18nKeys
      return {
        category: c.category,
        severity: c.severity,
        agentId: c.agentId,
        i18nKeys: c.i18nKeys,
        params: c.params,
        title: k?.title ? c.title : '<unkeyed>',
        message: k?.message ? c.message : '<unkeyed>',
        suggestion: c.suggestion === undefined ? undefined : k?.suggestion ? c.suggestion : '<unkeyed>',
        fix: c.fix
          ? {
              label: k?.fixLabel ? c.fix.label : '<unkeyed>',
              description: k?.fixDescription ? c.fix.description : '<unkeyed>'
            }
          : undefined,
        evidence: c.evidence?.map((e) => (e.labelKey ? e.label : '<unkeyed>'))
      }
    })
}

describe('health i18n golden (GH #6 Phase-2 contract)', () => {
  it('darwin: full prose + emitted i18n keys/params', () => {
    const checks = runHealthChecks({
      homeDir,
      projectDir,
      platform: 'darwin',
      scanErrors: [
        { path: path.join(homeDir, '.codex', 'agents', 'x.toml'), type: 'agent', message: 'Unexpected token at line 3.' },
        { path: path.join(homeDir, '.claude', 'settings.json'), type: 'hook', message: 'Trailing comma not allowed.' }
      ],
      assets: [
        {
          id: 'sess-1',
          agentId: 'claude-code',
          category: 'observability',
          type: 'session',
          scope: 'session',
          name: 'orphan-session.jsonl',
          path: path.join(homeDir, '.claude', 'projects', 'p', 'orphan-session.jsonl'),
          meta: {}
        }
      ]
    })
    expect(project(checks)).toMatchSnapshot()
  })

  it('win32: full prose + emitted i18n keys/params', () => {
    const checks = runHealthChecks({
      homeDir,
      projectDir,
      platform: 'win32'
    })
    expect(project(checks)).toMatchSnapshot()
  })
})
