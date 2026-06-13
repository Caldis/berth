import * as fs from 'fs'
import * as path from 'path'
import type { AgentAdapterSourcePolicy } from '../../adapter-api'
import type { ScanRoot } from '@shared/types/asset'
import type { AgentCapabilityPluginSourceDescriptor } from '@shared/types/agent-plugin'

export interface ResolveDeclaredSourceOptions {
  homeDir: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export function declaredSourceFromPolicy(
  policy: AgentAdapterSourcePolicy,
  options: ResolveDeclaredSourceOptions
): ScanRoot {
  const resolved = resolvePathPattern(policy.pathPattern, options)
  const status = resolved.needsProject && !options.projectDir
    ? 'not-scanned'
    : sourceExists(resolved.path, policy.kind)
      ? 'scanned'
      : 'missing'
  const sensitivityReason = policy.sensitivity === 'normal' ? undefined : policy.sensitivity

  return {
    path: resolved.path,
    scope: policy.scope,
    code: policy.code,
    categories: policy.categories,
    kind: policy.kind,
    status,
    reason: resolved.needsProject && !options.projectDir
      ? 'project-not-selected'
      : sensitivityReason
  }
}

export function sourceFromDescriptor(
  descriptor: AgentCapabilityPluginSourceDescriptor,
  options: ResolveDeclaredSourceOptions
): ScanRoot {
  const resolved = resolvePathPattern(descriptor.pathPattern, options)
  const status = resolved.needsProject && !options.projectDir
    ? 'not-scanned'
    : sourceExists(resolved.path, descriptor.kind)
      ? 'scanned'
      : 'missing'

  return {
    path: resolved.path,
    scope: descriptor.scope,
    code: descriptor.code,
    categories: descriptor.categories,
    kind: descriptor.kind,
    status,
    reason: resolved.needsProject && !options.projectDir ? 'project-not-selected' : undefined
  }
}

export function resolvePathPattern(
  pathPattern: string,
  options: ResolveDeclaredSourceOptions
): { path: string; needsProject: boolean } {
  if (pathPattern === '~') return { path: options.homeDir, needsProject: false }
  if (pathPattern.startsWith('~/')) {
    return { path: path.resolve(options.homeDir, pathPattern.slice(2)), needsProject: false }
  }
  if (pathPattern.includes('<cursor-user-data>')) {
    return {
      path: path.normalize(pathPattern.replace(/<cursor-user-data>/g, resolveCursorUserDataDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<project>')) {
    return {
      path: options.projectDir
        ? path.normalize(pathPattern.replace(/<project>/g, options.projectDir))
        : pathPattern,
      needsProject: true
    }
  }
  return { path: path.normalize(pathPattern), needsProject: false }
}

function resolveCursorUserDataDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  if (process.platform === 'win32') {
    const appData = env.APPDATA?.trim() || path.join(homeDir, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor')
  }
  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'Cursor')
  }
  const configHome = env.XDG_CONFIG_HOME?.trim() || path.join(homeDir, '.config')
  return path.join(configHome, 'Cursor')
}

function sourceExists(sourcePath: string, kind: ScanRoot['kind']): boolean {
  if (kind === 'policy') return true
  try {
    const stat = fs.statSync(sourcePath)
    return kind === 'directory' ? stat.isDirectory() : stat.isFile()
  } catch {
    return false
  }
}
