import * as os from 'os'
import { realpathSync as fsRealpathSync } from 'fs'
import { BrowserWindow, dialog, nativeTheme, shell, app } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { AgentView, Asset, CostMode, UsageSummary } from '@shared/types/asset'
import type {
  PlatformInfo,
  AgentScanSourceGroup,
  AssetRuntimeStatus,
  AssetSnapshot,
  ScanEngineInfo,
  ScanEngineSettings,
  SearchResult,
  HealthCheck,
  HealthCheckRequest,
  SessionListResult,
  SessionDetailResult,
  SessionReplayResult,
  SessionReplayEventPayload,
  AgentTeamListResult,
  SetHookEnabledRequest,
  SetHookEnabledResult,
  UpdatePreferences
} from '@shared/types/ipc'
import type { AgentCapabilityPluginListResult } from '@shared/types/agent-plugin'
import type { DashboardInsights } from '@shared/types/insights'
import { getAssetRuntime } from '@berth/scan-engine/engine/assets/runtime'
import { setHookEnabled } from '@berth/scan-engine/engine/hooks-manager'
import { buildSessionDetail } from '@berth/scan-engine/engine/session-detail'
import { buildSessionReplay, readSessionReplayEventPayload } from '@berth/scan-engine/engine/session-replay'
import { getMemoryRoots, listMemory, readMemory } from '../memory'
import { handleIpc } from './typed-ipc'
import { isAllowedRevealPathReal, isSafeExternalUrl } from '../url-guard'
import { getUpdaterRuntime } from '../updater'
import { DEFAULT_UPDATE_PREFERENCES, readUpdatePreferences, writeUpdatePreferences } from '../update-preferences'
import { getMainLog } from '@berth/scan-engine/log'
import { listAgentTeams, markLeadSessionAvailability } from '../agent-teams'
import { listAgentCapabilityPlugins } from '../agent-plugins/registry'
import { activateProjectScope } from '../project-scope-runtime'
import type { AppScopeSelection } from '@shared/scope'

// GH-115 T10b: 注册按域拆分 — 单函数 35 通道混居 (名实分离的 registerAssetHandlers)
// 改为五个域函数, ipc/index.ts 统一装配。各 handler 保持薄读: 域逻辑住 engine。

export function registerWindowHandlers(): void {
  handleIpc('window:minimize', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  handleIpc('window:toggle-maximize', (event: IpcMainInvokeEvent): void => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  handleIpc('window:close', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  handleIpc('window:is-maximized', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  handleIpc('window:set-always-on-top', (event: IpcMainInvokeEvent, flag: boolean): void => {
    BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(flag))
  })

  handleIpc('window:is-always-on-top', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false
  })

}

export function registerSystemHandlers(): void {
  handleIpc('platform:info', (): PlatformInfo => ({
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    version: app.getVersion()
  }))

  handleIpc('theme:set', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
  })

  // GH-119: reveal targets must stay inside known roots — adapter scan roots
  // (incl. missing/not-scanned candidates) ∪ memory roots ∪ active project dir.
  // Collected per call: the set follows project switches with no cache to
  // invalidate, and the click frequency makes the cost irrelevant.
  async function collectAllowedRevealRoots(): Promise<string[]> {
    const runtime = getAssetRuntime()
    const groups = await runtime.getScanSourceGroups()
    const roots = groups.flatMap((group) =>
      [...group.roots, ...(group.sources ?? [])].map((source) => source.path)
    )
    const projectDir = runtime.getSnapshot().projectDir
    if (projectDir) roots.push(projectDir)
    roots.push(...getMemoryRoots())
    return roots
  }

  handleIpc('shell:openPath', async (_event, p: string) => {
    // GH-154 T2: realpath 归一后再比白名单 — 词法谓词不解 symlink, 根内链接可指根外。
    if (!isAllowedRevealPathReal(p, await collectAllowedRevealRoots(), { realpath: (target) => fsRealpathSync(target) })) {
      getMainLog().log('url-guard', `denied reveal-path: ${p}`)
      return
    }
    shell.showItemInFolder(p)
  })

  handleIpc('shell:openExternal', (_event, url: string) => {
    if (!isSafeExternalUrl(url)) {
      getMainLog().log('url-guard', `denied external-url: ${url}`)
      return
    }
    shell.openExternal(url)
  })

  // GH-135 G4: native directory picker for the scan-exclude list. Modal to the
  // focused window; returns [] on cancel.
  handleIpc('dialog:open-directory', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      properties: ['openDirectory', 'multiSelections', 'createDirectory'] as Array<'openDirectory' | 'multiSelections' | 'createDirectory'>
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  })
}

// GH-124: handlers resolve the updater runtime lazily — it is wired in
// index.ts after whenReady; before that (and in the unit-test host) the
// channels degrade to no-ops / default preferences.
export function registerUpdateHandlers(): void {
  handleIpc('update:check', async (): Promise<void> => {
    await getUpdaterRuntime()?.controller.check()
  })

  handleIpc('update:download', async (): Promise<void> => {
    await getUpdaterRuntime()?.controller.download()
  })

  handleIpc('update:install', (): void => {
    getUpdaterRuntime()?.controller.install()
  })

  handleIpc('update:get-preferences', (): UpdatePreferences => {
    const runtime = getUpdaterRuntime()
    return runtime ? readUpdatePreferences(runtime.userDataDir) : { ...DEFAULT_UPDATE_PREFERENCES }
  })

  handleIpc('update:set-preferences', (_event, prefs: UpdatePreferences): void => {
    const runtime = getUpdaterRuntime()
    if (!runtime) return
    writeUpdatePreferences(runtime.userDataDir, prefs)
    runtime.controller.applyPreferences(prefs)
  })
}

export function registerAssetHandlers(): void {
  handleIpc('assets:snapshot', async (): Promise<AssetSnapshot> => {
    // Lean projection (GH-151 S6): raw is served per-asset by assets:get.
    return getAssetRuntime().getLeanSnapshot()
  })

  handleIpc('assets:status', (): AssetRuntimeStatus => {
    return getAssetRuntime().getStatus()
  })

  handleIpc('assets:engine-info', (): ScanEngineInfo => {
    return getAssetRuntime().getEngineInfo()
  })

  handleIpc('assets:set-engine-settings', (_event, settings: Partial<ScanEngineSettings>): ScanEngineInfo => {
    getAssetRuntime().setSettings(settings)
    return getAssetRuntime().getEngineInfo()
  })

  handleIpc('assets:refresh', async (_event, opts: { wait?: boolean } = {}): Promise<AssetRuntimeStatus> => {
    return getAssetRuntime().refresh({ reason: 'manual', wait: opts.wait })
  })

  // GH-135: index controls. pause/resume return engine-info (scheduler.paused +
  // capabilities); cancel returns status (stale, partial kept); rebuild rescans.
  handleIpc('assets:pause', (): ScanEngineInfo => {
    getAssetRuntime().pause()
    return getAssetRuntime().getEngineInfo()
  })

  handleIpc('assets:resume', (): ScanEngineInfo => {
    getAssetRuntime().resume()
    return getAssetRuntime().getEngineInfo()
  })

  handleIpc('assets:cancel', (): AssetRuntimeStatus => {
    getAssetRuntime().cancel()
    return getAssetRuntime().getStatus()
  })

  handleIpc('assets:rebuild', async (_event, opts: { wait?: boolean } = {}): Promise<AssetRuntimeStatus> => {
    return getAssetRuntime().rebuild({ reason: 'manual', wait: opts.wait })
  })

  handleIpc('assets:scan-sources', async (): Promise<AgentScanSourceGroup[]> => {
    return getAssetRuntime().getScanSourceGroups()
  })

  handleIpc('agent-plugins:list', async (): Promise<AgentCapabilityPluginListResult> => {
    const snapshot = await getAssetRuntime().ensureReady({ reason: 'manual' })
    return listAgentCapabilityPlugins(snapshot.sources, {
      homeDir: os.homedir(),
      projectDir: snapshot.projectDir,
      env: process.env
    })
  })

  handleIpc('project-scope:candidates', async () => {
    return getAssetRuntime().getProjectCandidates()
  })

  handleIpc('project-scope:activate', async (_event, opts: { projectPath?: string } = {}) => {
    return activateProjectScope(opts.projectPath)
  })

  // Update the active scope without rescanning (sub-second scope switching).
  // Server-side reads like search honour this selection.
  handleIpc('project-scope:set-scope', async (_event, selection: AppScopeSelection) => {
    getAssetRuntime().setScopeSelection(selection)
    return { applied: true }
  })

  handleIpc('assets:get', (_event, id: string): Asset | null => {
    return getAssetRuntime().getAsset(id)
  })

  handleIpc('assets:search', async (_event, query: string): Promise<SearchResult[]> => {
    return getAssetRuntime().search(query)
  })

  handleIpc('assets:health-check', async (_event, opts: HealthCheckRequest = {}): Promise<HealthCheck[]> => {
    return getAssetRuntime().getHealthChecks(opts)
  })

}

export function registerSessionHandlers(): void {
  handleIpc(
    'sessions:list',
    async (
      _event,
      opts: { projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }
    ): Promise<SessionListResult> => {
      return getAssetRuntime().listSessions(opts)
    }
  )

  handleIpc(
    'sessions:get',
    async (_event, id: string): Promise<SessionDetailResult | null> => {
      const runtime = getAssetRuntime()
      await runtime.ensureReady({ reason: 'manual' })
      const asset = runtime.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      return buildSessionDetail(asset, runtime.getAssets())
    }
  )

  handleIpc(
    'sessions:events',
    async (_event, id: string): Promise<SessionReplayResult | null> => {
      const runtime = getAssetRuntime()
      await runtime.ensureReady({ reason: 'manual' })
      const asset = runtime.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      return buildSessionReplay(asset)
    }
  )

  handleIpc(
    'sessions:event-payload',
    async (_event, id: string, eventId: string): Promise<SessionReplayEventPayload | null> => {
      const runtime = getAssetRuntime()
      await runtime.ensureReady({ reason: 'manual' })
      const asset = runtime.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      return readSessionReplayEventPayload(asset, eventId)
    }
  )

  handleIpc(
    'usage:summary',
    async (_event, opts: { days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }): Promise<UsageSummary> => {
      return getAssetRuntime().getUsageSummary(opts)
    }
  )

  handleIpc(
    'insights:dashboard',
    async (
      _event,
      opts: { days?: number; agentView?: AgentView; projectPath?: string } = {}
    ): Promise<DashboardInsights> => {
      return getAssetRuntime().getDashboardInsights(opts)
    }
  )

}

export function registerDomainHandlers(): void {
  handleIpc('teams:list', async (): Promise<AgentTeamListResult> => {
    const runtime = getAssetRuntime()
    await runtime.ensureReady({ reason: 'manual' })
    const teams = markLeadSessionAvailability(listAgentTeams(), (assetId) => runtime.getAsset(assetId))
    return { teams }
  })

  handleIpc('memory:list', () => listMemory())

  handleIpc('memory:get', (_event, id: string) => readMemory(id))

  handleIpc(
    'hooks:set-hook-enabled',
    async (_event, request: SetHookEnabledRequest): Promise<SetHookEnabledResult> => {
      const result = setHookEnabled(request)
      await getAssetRuntime().refresh({ reason: 'manual', wait: true })
      return result
    }
  )
}
