import * as os from 'os'
import { BrowserWindow, ipcMain, nativeTheme, shell, app } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { AgentView, Asset, CostMode, UsageSummary } from '@shared/types/asset'
import type {
  PlatformInfo,
  AgentScanSourceGroup,
  AssetRuntimeStatus,
  AssetSnapshot,
  SearchResult,
  HealthCheck,
  HealthCheckRequest,
  SessionListResult,
  SessionDetailResult,
  AgentTeamListResult,
  SetHookEnabledRequest,
  SetHookEnabledResult
} from '@shared/types/ipc'
import type { AgentCapabilityPluginListResult } from '@shared/types/agent-plugin'
import { getAssetRuntime } from '../engine/assets/runtime'
import { setHookEnabled } from '../engine/hooks-manager'
import { buildSessionDetail } from '../engine/session-detail'
import { listMemory, readMemory } from '../memory'
import { listAgentTeams, markLeadSessionAvailability } from '../agent-teams'
import { listAgentCapabilityPlugins } from '../agent-plugins/registry'
import { activateProjectScope } from '../project-scope-runtime'
import type { AppScopeSelection } from '@shared/scope'

// GH-115 T10b: 注册按域拆分 — 单函数 35 通道混居 (名实分离的 registerAssetHandlers)
// 改为五个域函数, ipc/index.ts 统一装配。各 handler 保持薄读: 域逻辑住 engine。

export function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggle-maximize', (event: IpcMainInvokeEvent): void => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:is-maximized', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle('window:set-always-on-top', (event: IpcMainInvokeEvent, flag: boolean): void => {
    BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(flag))
  })

  ipcMain.handle('window:is-always-on-top', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false
  })

}

export function registerSystemHandlers(): void {
  ipcMain.handle('platform:info', (): PlatformInfo => ({
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    version: app.getVersion()
  }))

  ipcMain.handle('theme:set', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('shell:openPath', (_event, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    shell.openExternal(url)
  })
}

export function registerAssetHandlers(): void {
  ipcMain.handle('assets:snapshot', async (): Promise<AssetSnapshot> => {
    return getAssetRuntime().getSnapshot()
  })

  ipcMain.handle('assets:status', (): AssetRuntimeStatus => {
    return getAssetRuntime().getStatus()
  })

  ipcMain.handle('assets:refresh', async (_event, opts: { wait?: boolean } = {}): Promise<AssetRuntimeStatus> => {
    return getAssetRuntime().refresh({ reason: 'manual', wait: opts.wait })
  })

  ipcMain.handle('assets:scan-sources', async (): Promise<AgentScanSourceGroup[]> => {
    return getAssetRuntime().getScanSourceGroups()
  })

  ipcMain.handle('agent-plugins:list', async (): Promise<AgentCapabilityPluginListResult> => {
    const snapshot = await getAssetRuntime().ensureReady({ reason: 'manual' })
    return listAgentCapabilityPlugins(snapshot.sources, {
      homeDir: os.homedir(),
      projectDir: snapshot.projectDir,
      env: process.env
    })
  })

  ipcMain.handle('project-scope:candidates', async () => {
    return getAssetRuntime().getProjectCandidates()
  })

  ipcMain.handle('project-scope:activate', async (_event, opts: { projectPath?: string } = {}) => {
    return activateProjectScope(opts.projectPath)
  })

  // Update the active scope without rescanning (sub-second scope switching).
  // Server-side reads like search honour this selection.
  ipcMain.handle('project-scope:set-scope', async (_event, selection: AppScopeSelection) => {
    getAssetRuntime().setScopeSelection(selection)
    return { applied: true }
  })

  ipcMain.handle('assets:get', (_event, id: string): Asset | null => {
    return getAssetRuntime().getAsset(id)
  })

  ipcMain.handle('assets:search', async (_event, query: string): Promise<SearchResult[]> => {
    return getAssetRuntime().search(query)
  })

  ipcMain.handle('assets:health-check', async (_event, opts: HealthCheckRequest = {}): Promise<HealthCheck[]> => {
    return getAssetRuntime().getHealthChecks(opts)
  })

}

export function registerSessionHandlers(): void {
  ipcMain.handle(
    'sessions:list',
    async (
      _event,
      opts: { projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }
    ): Promise<SessionListResult> => {
      return getAssetRuntime().listSessions(opts)
    }
  )

  ipcMain.handle(
    'sessions:get',
    async (_event, id: string): Promise<SessionDetailResult | null> => {
      const runtime = getAssetRuntime()
      await runtime.ensureReady({ reason: 'manual' })
      const asset = runtime.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      return buildSessionDetail(asset, runtime.getAssets())
    }
  )

  ipcMain.handle(
    'usage:summary',
    async (_event, opts: { days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }): Promise<UsageSummary> => {
      return getAssetRuntime().getUsageSummary(opts)
    }
  )

}

export function registerDomainHandlers(): void {
  ipcMain.handle('teams:list', async (): Promise<AgentTeamListResult> => {
    const runtime = getAssetRuntime()
    await runtime.ensureReady({ reason: 'manual' })
    const teams = markLeadSessionAvailability(listAgentTeams(), (assetId) => runtime.getAsset(assetId))
    return { teams }
  })

  ipcMain.handle('memory:list', () => listMemory())

  ipcMain.handle('memory:get', (_event, id: string) => readMemory(id))

  ipcMain.handle(
    'hooks:set-hook-enabled',
    async (_event, request: SetHookEnabledRequest): Promise<SetHookEnabledResult> => {
      const result = setHookEnabled(request)
      await getAssetRuntime().refresh({ reason: 'manual', wait: true })
      return result
    }
  )
}
