import type { App } from 'electron'
import { mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const AGENT_INSTANCE_ARG = '--berth-agent-instance'
const AGENT_INSTANCE_ARG_PREFIX = `${AGENT_INSTANCE_ARG}=`
const MAX_INSTANCE_ID_LENGTH = 80

type PathApp = Pick<App, 'setPath'>

export type AgentDevProfile = {
  id: string
  profileDir: string
}

export type AgentDevProfileOptions = {
  isDev: boolean
  argv?: string[]
  env?: NodeJS.ProcessEnv
  tempRoot?: string
}

export function normalizeAgentInstanceId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const normalized = trimmed
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_INSTANCE_ID_LENGTH)

  if (!normalized || normalized === '.' || normalized === '..') return undefined
  return normalized
}

export function resolveAgentDevInstanceId(options: AgentDevProfileOptions): string | undefined {
  if (!options.isDev) return undefined

  const argv = options.argv ?? []
  const env = options.env ?? process.env

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg?.startsWith(AGENT_INSTANCE_ARG_PREFIX)) {
      return normalizeAgentInstanceId(arg.slice(AGENT_INSTANCE_ARG_PREFIX.length))
    }
    if (arg === AGENT_INSTANCE_ARG) {
      return normalizeAgentInstanceId(argv[index + 1])
    }
  }

  return normalizeAgentInstanceId(env.BERTH_AGENT_INSTANCE_ID)
}

export function resolveAgentDevProfileDir(id: string, tempRoot?: string): string {
  return join(tempRoot ?? join(tmpdir(), 'berth-agent-dev'), id, 'profile')
}

export function configureAgentDevProfile(
  app: PathApp,
  options: AgentDevProfileOptions
): AgentDevProfile | undefined {
  const id = resolveAgentDevInstanceId(options)
  if (!id) return undefined

  const profileDir = resolveAgentDevProfileDir(
    id,
    options.tempRoot ?? options.env?.BERTH_AGENT_DEV_ROOT
  )
  mkdirSync(profileDir, { recursive: true })
  app.setPath('userData', profileDir)
  app.setPath('sessionData', profileDir)
  return { id, profileDir }
}

export function shouldRequestSingleInstanceLock(profile: AgentDevProfile | undefined): boolean {
  void profile
  return true
}
