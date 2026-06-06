import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanInstructions, type ScanContext } from '../../src/main/adapters/claude-code/scanner'
import type { Asset } from '../../src/shared/types/asset'

/**
 * GH-110 P5.1 — no-side-effect coverage for the output-mode / command / subagent
 * scanners. The user flagged these three asset types as lacking dedicated tests;
 * these fixtures assert (a) the scan produces the right assets and (b) scanning
 * is strictly read-only (file contents, mtimes, and the directory tree are
 * unchanged afterwards — the scanner never writes back).
 */

const AGENT_MD = `---
name: code-reviewer
description: Reviews diffs for regressions
model: claude-opus-4-8
---
# Code reviewer
Use when reviewing a pull request.
`

const COMMAND_MD = `---
description: Ship the current branch
---
Run the deploy pipeline for $ARGUMENTS.
`

const OUTPUT_MODE_MD = `---
name: terse
---
Answer in at most three sentences.
`

interface FileSnapshot {
  content: string
  mtimeMs: number
}

function listFilesRecursive(root: string): string[] {
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? root, entry.name))
    .sort()
}

function snapshotFiles(files: string[]): Map<string, FileSnapshot> {
  const snap = new Map<string, FileSnapshot>()
  for (const file of files) {
    snap.set(file, { content: fs.readFileSync(file, 'utf-8'), mtimeMs: fs.statSync(file).mtimeMs })
  }
  return snap
}

describe('output-mode / command / subagent scanning (GH-110 P5.1)', () => {
  let claudeDir: string

  beforeEach(() => {
    claudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-p51-'))
    fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(claudeDir, 'commands'), { recursive: true })
    fs.mkdirSync(path.join(claudeDir, 'output-modes'), { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'agents', 'code-reviewer.md'), AGENT_MD)
    fs.writeFileSync(path.join(claudeDir, 'commands', 'deploy.md'), COMMAND_MD)
    fs.writeFileSync(path.join(claudeDir, 'output-modes', 'terse.md'), OUTPUT_MODE_MD)
  })

  afterEach(() => {
    fs.rmSync(claudeDir, { recursive: true, force: true })
  })

  function runScan(): { assets: Asset[]; ctx: ScanContext } {
    // agent/command/output-mode are category 'instruction' → scanned by scanInstructions.
    const ctx: ScanContext = { claudeDir, errors: [] }
    return { assets: scanInstructions(ctx), ctx }
  }

  it('parses the subagent with its frontmatter and body length', () => {
    const { assets, ctx } = runScan()
    const agent = assets.find((a) => a.type === 'agent')

    expect(ctx.errors).toEqual([])
    expect(agent).toBeDefined()
    expect(agent).toMatchObject({
      type: 'agent',
      scope: 'user',
      name: 'code-reviewer',
      meta: { description: 'Reviews diffs for regressions', model: 'claude-opus-4-8' }
    })
    expect(agent?.meta.bodyLength).toBeGreaterThan(0)
  })

  it('parses the slash command (name from filename, line count, raw retained)', () => {
    const { assets } = runScan()
    const command = assets.find((a) => a.type === 'command')

    expect(command).toMatchObject({ type: 'command', scope: 'user', name: 'deploy' })
    expect(command?.meta.lineCount).toBe(COMMAND_MD.split('\n').length)
    expect(command?.raw).toContain('deploy pipeline')
  })

  it('parses the output mode', () => {
    const { assets } = runScan()
    const outputMode = assets.find((a) => a.type === 'output-mode')

    expect(outputMode).toMatchObject({ type: 'output-mode', scope: 'user', name: 'terse' })
    expect(outputMode?.meta.lineCount).toBe(OUTPUT_MODE_MD.split('\n').length)
  })

  it('is strictly read-only: file contents, mtimes, and the tree are unchanged', () => {
    const before = snapshotFiles(listFilesRecursive(claudeDir))

    runScan()
    runScan() // scan twice — still no writes.

    const afterFiles = listFilesRecursive(claudeDir)
    // No files created or removed by scanning.
    expect(afterFiles).toEqual([...before.keys()])
    // Every file's content and mtime is untouched.
    for (const [file, snap] of before) {
      expect(fs.readFileSync(file, 'utf-8')).toBe(snap.content)
      expect(fs.statSync(file).mtimeMs).toBe(snap.mtimeMs)
    }
  })
})
