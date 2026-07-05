import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveProjectConfigRoots } from '@berth/scan-engine/project-config-roots'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-project-roots-'))
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('resolveProjectConfigRoots', () => {
  it('returns no project roots without a project dir', () => {
    expect(resolveProjectConfigRoots()).toEqual([])
    expect(resolveProjectConfigRoots('')).toEqual([])
  })

  it('walks from repository root to the selected child cwd', () => {
    const repo = path.join(tempDir!, 'repo')
    const child = path.join(repo, 'packages', 'app')
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true })
    fs.mkdirSync(child, { recursive: true })

    expect(resolveProjectConfigRoots(child)).toEqual([
      path.resolve(repo),
      path.resolve(repo, 'packages'),
      path.resolve(child)
    ])
  })

  it('keeps a stable single root for a repository root selection', () => {
    const repo = path.join(tempDir!, 'repo')
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true })

    expect(resolveProjectConfigRoots(repo + path.sep)).toEqual([path.resolve(repo)])
  })

  it('does not walk into user directories when a repository root cannot be found', () => {
    const project = path.join(tempDir!, 'detached-project', 'src')
    fs.mkdirSync(project, { recursive: true })

    expect(resolveProjectConfigRoots(project)).toEqual([path.resolve(project)])
  })

  it('never yields the user home directory as a project config root', () => {
    const home = path.join(tempDir!, 'home')
    fs.mkdirSync(home, { recursive: true })

    // cwd=$HOME session recorded home as a "project": no config roots at all.
    expect(resolveProjectConfigRoots(home, { homeDir: home })).toEqual([])

    // A dotfiles repo (.git at home) must not re-admit it.
    fs.mkdirSync(path.join(home, '.git'), { recursive: true })
    expect(resolveProjectConfigRoots(home, { homeDir: home })).toEqual([])

    // A chain walking THROUGH home keeps the non-home roots.
    const sub = path.join(home, 'scripts')
    fs.mkdirSync(sub, { recursive: true })
    expect(resolveProjectConfigRoots(sub, { homeDir: home })).toEqual([path.resolve(sub)])
  })
})
