// Health check option normalization and agent home path resolution.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as os from 'os'
import * as path from 'path'
import { resolveClaudeDirs, resolveCodexHomeDirs } from '../../agent-homes'
import { dirExists, fileExists } from './fs-utils'
import type { HealthCheckOptions, HealthPaths, NormalizedHealthCheckOptions } from './types'

export function normalizeOptions(options: HealthCheckOptions | string): NormalizedHealthCheckOptions {
  if (typeof options === 'string') {
    return {
      homeDir: options,
      platform: process.platform,
      env: process.env
    }
  }
  return {
    ...options,
    homeDir: options.homeDir ?? os.homedir(),
    platform: options.platform ?? process.platform,
    env: options.env ?? process.env
  }
}

export function buildHealthPaths(options: NormalizedHealthCheckOptions): HealthPaths {
  const claudeDirs = resolveClaudeDirs(options.homeDir, options.env)
  const codexDirs = resolveCodexHomeDirs(options.homeDir, options.env)
  return {
    homeDir: options.homeDir,
    claudeDir: claudeDirs[0],
    claudeDirs,
    codexDir: codexDirs[0],
    codexDirs,
    projectDir: options.projectDir
  }
}

export function hasClaudeData(paths: HealthPaths): boolean {
  return (
    paths.claudeDirs.some(dirExists) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.claude')) ||
        fileExists(path.join(paths.projectDir, 'CLAUDE.md')) ||
        fileExists(path.join(paths.projectDir, '.mcp.json'))))
  )
}

export function hasCodexData(paths: HealthPaths): boolean {
  return (
    paths.codexDirs.some((codexDir) => dirExists(codexDir) || dirExists(path.join(codexDir, 'skills'))) ||
    dirExists(path.join(paths.homeDir, '.agents', 'skills')) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.codex')) ||
        fileExists(path.join(paths.projectDir, 'AGENTS.md')) ||
        dirExists(path.join(paths.projectDir, '.agents', 'skills'))))
  )
}
