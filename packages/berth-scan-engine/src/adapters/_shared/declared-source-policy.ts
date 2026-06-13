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
  if (pathPattern.includes('<cursor-config>')) {
    return {
      path: path.normalize(pathPattern.replace(/<cursor-config>/g, resolveCursorConfigDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<copilot-home>')) {
    return {
      path: path.normalize(pathPattern.replace(/<copilot-home>/g, resolveCopilotHomeDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<opencode-config>')) {
    return {
      path: path.normalize(pathPattern.replace(/<opencode-config>/g, resolveOpenCodeConfigDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<opencode-data>')) {
    return {
      path: path.normalize(pathPattern.replace(/<opencode-data>/g, resolveOpenCodeDataDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<openclaw-config>')) {
    return {
      path: path.normalize(pathPattern.replace(/<openclaw-config>/g, resolveOpenClawConfigPath(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<openclaw-state>')) {
    return {
      path: path.normalize(pathPattern.replace(/<openclaw-state>/g, resolveOpenClawStateDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<hermes-home>')) {
    return {
      path: path.normalize(pathPattern.replace(/<hermes-home>/g, resolveHermesHomeDir(options.homeDir, options.env ?? process.env))),
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

function resolveCursorConfigDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const explicitConfigDir = env.CURSOR_CONFIG_DIR?.trim()
  if (explicitConfigDir) return path.resolve(explicitConfigDir)
  const legacyHome = env.CURSOR_HOME?.trim()
  if (legacyHome) return path.resolve(legacyHome)
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    const configHome = env.XDG_CONFIG_HOME?.trim()
    if (configHome) return path.join(configHome, 'cursor')
  }
  return path.join(homeDir, '.cursor')
}

function resolveCopilotHomeDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const customHome = env.COPILOT_HOME?.trim()
  return customHome ? path.resolve(customHome) : path.join(homeDir, '.copilot')
}

function resolveOpenCodeConfigDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const customConfigDir = env.OPENCODE_CONFIG_DIR?.trim()
  if (customConfigDir) return path.resolve(customConfigDir)
  const configHome = env.XDG_CONFIG_HOME?.trim() || path.join(homeDir, '.config')
  return path.join(configHome, 'opencode')
}

function resolveOpenCodeDataDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const dataHome = env.XDG_DATA_HOME?.trim() || path.join(homeDir, '.local', 'share')
  return path.join(dataHome, 'opencode')
}

function resolveOpenClawConfigPath(homeDir: string, env: NodeJS.ProcessEnv): string {
  const configPath = env.OPENCLAW_CONFIG_PATH?.trim()
  return configPath ? path.resolve(configPath) : path.join(resolveOpenClawStateDir(homeDir, env), 'openclaw.json')
}

function resolveOpenClawStateDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const stateDir = env.OPENCLAW_STATE_DIR?.trim()
  if (stateDir) return path.resolve(stateDir)
  const openClawHome = env.OPENCLAW_HOME?.trim()
  return openClawHome ? path.join(path.resolve(openClawHome), '.openclaw') : path.join(homeDir, '.openclaw')
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

function resolveHermesHomeDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  const customHome = env.HERMES_HOME?.trim()
  if (customHome) return path.resolve(customHome)
  if (process.platform === 'win32') {
    const localAppData = env.LOCALAPPDATA?.trim() || path.join(homeDir, 'AppData', 'Local')
    return path.join(localAppData, 'hermes')
  }
  return path.join(homeDir, '.hermes')
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
