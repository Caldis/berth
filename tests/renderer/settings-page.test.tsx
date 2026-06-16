import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ThemeProvider } from '../../src/renderer/src/components/theme-provider'
import { SettingsContent } from '../../src/renderer/src/components/settings/settings-content'
import type { AssetRuntimeStatus, ScanEngineInfo } from '@shared/types/ipc'
import type { Asset } from '@shared/types/asset'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('SettingsContent page chrome', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.className = ''
    await i18n.changeLanguage('en')
    window.api.assets.engineInfo = vi.fn(async (): Promise<ScanEngineInfo> => ({
      engine: {
        name: '@berth/scan-engine',
        packageName: '@berth/scan-engine',
        version: '0.1.0'
      },
      status: {
        state: 'ready' as const,
        reason: 'startup' as const,
        stale: false,
        lastCompletedAt: '2026-06-13T02:00:00.000Z'
      },
      snapshot: {
        id: 'snapshot-1',
        indexedAssets: 12,
        indexedFiles: 7,
        errors: 1,
        sourceGroups: 2,
        sourceRows: 5
      },
      scheduler: {
        scanning: false,
        paused: false,
        scheduledRefresh: { active: false },
        queuedRefresh: { active: false },
        periodicScan: { enabled: true, intervalMs: 86_400_000, nextScanAt: '2026-06-16T02:00:00.000Z' }
      },
      controls: [
        {
          id: 'watcher-debounce-ms',
          value: 1000,
          kind: 'number',
          group: 'watcher',
          unit: 'ms',
          editable: true,
          supported: true,
          settingKey: 'watcherDebounceMs',
          min: 0,
          max: 10000,
          step: 100
        },
        {
          id: 'watcher-min-interval-ms',
          value: 30000,
          kind: 'number',
          group: 'watcher',
          unit: 'ms',
          editable: true,
          supported: true,
          settingKey: 'watcherMinIntervalMs',
          min: 0,
          max: 300000,
          step: 1000
        },
        { id: 'scheduled-refresh', value: 'none', unit: 'state', editable: false, supported: true },
        { id: 'queued-refresh', value: 'none', unit: 'state', editable: false, supported: true },
        { id: 'pause', value: 'unsupported', editable: false, supported: false },
        { id: 'last-scan-reason', value: 'manual', unit: 'state', editable: false, supported: true },
        { id: 'last-scan-duration', value: 1234, unit: 'ms', editable: false, supported: true },
        { id: 'source-groups', value: 3, editable: false, supported: true },
        {
          id: 'exclude-paths',
          value: ['/Users/me/tmp'],
          kind: 'string-list',
          group: 'scope',
          editable: true,
          supported: true,
          settingKey: 'excludePaths'
        }
      ],
      capabilities: {
        workerMode: 'one-shot',
        schedulerMode: 'single-flight-queued-project-scope',
        scopeMode: 'scan-on-miss',
        cacheMode: 'sqlite-swr',
        incrementalFileChanges: true,
        pauseSupported: false,
        cancelSupported: false,
        writableSettingsSupported: true,
        osThrottleSupported: false
      },
      limits: [
        { id: 'metadata-only-sensitive-files', level: 'info', enabled: true },
        { id: 'third-party-code-not-executed', level: 'info', enabled: true }
      ],
      scanHistory: [
        { at: '2026-06-16T10:00:00.000Z', reason: 'startup', durationMs: 3200, assetCount: 1229, fileCount: 1146, errorCount: 0, ok: true, sourceCount: 12 },
        { at: '2026-06-16T11:00:00.000Z', reason: 'watcher', durationMs: 2800, assetCount: 1230, fileCount: 1147, errorCount: 0, ok: true, sourceCount: 12 },
        { at: '2026-06-16T12:00:00.000Z', reason: 'manual', durationMs: 3500, assetCount: 1231, fileCount: 1148, errorCount: 1, ok: true, projectDir: '/repo/app', sourceCount: 3 }
      ]
    }))
    window.api.assets.setEngineSettings = vi.fn(async () => window.api.assets.engineInfo())
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [], manifests: [] }))
    window.api.assets.scanSources = vi.fn(async () => [])
    window.api.assets.refresh = vi.fn(async (): Promise<AssetRuntimeStatus> => ({
      state: 'scanning',
      reason: 'manual',
      stale: true
    }))
    window.api.shell.openExternal = vi.fn(async () => {})
    window.api.theme.set = vi.fn(async () => {})
  })

  function renderSettingsContent(): ReturnType<typeof render> {
    return render(
      <ThemeProvider defaultTheme="system">
        <SettingsContent showTitle={false} />
      </ThemeProvider>
    )
  }

  async function waitForSettingsAsyncSections(): Promise<void> {
    await screen.findByText('The plugin registry is not available.')
    expect(screen.queryByText('No supported local sources found.')).not.toBeInTheDocument()
    expect(window.api.assets.scanSources).not.toHaveBeenCalled()
  }

  it('renders the report issue action in English', async () => {
    renderSettingsContent()

    const website = await screen.findByRole('button', { name: 'Website' })
    const reportIssue = await screen.findByRole('button', { name: 'Report Issue' })
    expect(website).toBeInTheDocument()
    expect(reportIssue).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()

    fireEvent.click(website)
    expect(window.api.shell.openExternal).toHaveBeenCalledWith('http://berth.caldis.me/')

    fireEvent.click(reportIssue)

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://github.com/Caldis/berth/issues')
  })

  it('uses the shared app icon in the About section', async () => {
    renderSettingsContent()

    await waitForSettingsAsyncSections()
    const appIcon = screen.getByTestId('settings-app-icon')
    expect(appIcon).toHaveAttribute('src', expect.stringContaining('app_icon.png'))
    expect(appIcon).toHaveAttribute('aria-hidden', 'true')
  })

  it('localizes the report issue action in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderSettingsContent()

    const reportIssue = await screen.findByRole('button', { name: '报告问题' })
    expect(reportIssue).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '官网' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Report Issue' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('does not render the inert advanced mode switch (issue settings-advanced-mode-inert)', async () => {
    renderSettingsContent()

    await waitForSettingsAsyncSections()

    // GH-124/GH-134 起 About 区有三个功能性更新 switch (autoCheck/autoDownload/
    // beta); 原"零 switch"断言收紧为: 每个 switch 都有可达名, 且 advanced-mode 不存在。
    expect(screen.queryAllByRole('switch')).toHaveLength(3)
    expect(screen.getByRole('switch', { name: 'Check for updates on launch' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Download updates automatically' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Receive beta (pre-release) updates' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /advanced/i })).not.toBeInTheDocument()
  })

  it('shows scan engine status and current control surface', async () => {
    renderSettingsContent()

    await screen.findByText('Scan Engine')
    expect(await screen.findByText('@berth/scan-engine')).toBeInTheDocument()
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('12 assets')).toBeInTheDocument()
    expect(screen.getByText('7 files')).toBeInTheDocument()
    expect(screen.getByText('1 error')).toBeInTheDocument()
    expect(screen.getByText('Watcher debounce')).toBeInTheDocument()
    // GH-135: shown in seconds (engine stores 1000ms) with a unit suffix, not raw ms.
    expect(screen.getByLabelText('Watcher debounce')).toHaveValue(1)
    expect(screen.getByText('Scheduled refresh')).toBeInTheDocument()
    expect(screen.getByText('Queued refresh')).toBeInTheDocument()
    expect(screen.getAllByText('None')).toHaveLength(2)
    expect(screen.getByText('Pause scanning')).toBeInTheDocument()
    expect(screen.getByText('Not supported yet')).toBeInTheDocument()
    // GH-135: the next scheduled periodic scan is surfaced in the always-reachable panel.
    expect(screen.getByText(/Next scan:/)).toBeInTheDocument()
    // GH-135 G6: fixed-descriptor noise removed; meaningful runtime info shown instead.
    expect(screen.queryByText('Manual refresh')).not.toBeInTheDocument()
    expect(screen.getByText('Last scan duration')).toBeInTheDocument()
    expect(screen.getByText('1.2 s')).toBeInTheDocument()
    expect(screen.getByText('Indexed sources')).toBeInTheDocument()
  })

  it('saves editable scan engine controls in display units (GH-135)', async () => {
    renderSettingsContent()

    const watcherDebounce = await screen.findByLabelText('Watcher debounce')
    const row = watcherDebounce.closest('form')
    expect(row).not.toBeNull()
    // The field carries a seconds unit suffix; entering 1.5s converts back to 1500ms.
    expect(within(row!).getByText('s', { exact: true })).toBeInTheDocument()
    fireEvent.change(watcherDebounce, { target: { value: '1.5' } })
    fireEvent.click(within(row!).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(window.api.assets.setEngineSettings).toHaveBeenCalledWith({ watcherDebounceMs: 1500 })
    })
  })

  it('opens the rebuild dialog with translated labels and confirms (GH-135 E3)', async () => {
    window.api.assets.rebuild = vi.fn(
      async (): Promise<AssetRuntimeStatus> => ({ state: 'scanning', reason: 'manual', stale: true })
    )
    renderSettingsContent()

    const trigger = await screen.findByRole('button', { name: 'Rebuild index' })
    fireEvent.click(trigger)

    // Destructive confirm dialog: title + body + translated action buttons (no raw i18n keys).
    expect(await screen.findByText('Rebuild the index?')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Clear and rebuild' })
    expect(cancel).toBeInTheDocument()
    expect(screen.queryByText('common.cancel')).not.toBeInTheDocument()

    fireEvent.click(confirm)
    await waitFor(() => expect(window.api.assets.rebuild).toHaveBeenCalled())
  })

  it('manages excluded paths via the native directory picker (GH-135 G4)', async () => {
    window.api.dialog.openDirectory = vi.fn(async () => ['/Users/me/new-dir'])
    renderSettingsContent()

    // Existing excluded path renders as a removable row (no free-text textarea).
    expect(await screen.findByText('/Users/me/tmp')).toBeInTheDocument()

    // Adding via the native picker merges + de-dupes, then saves the engine setting.
    fireEvent.click(screen.getByRole('button', { name: 'Add directory' }))
    await waitFor(() => expect(window.api.dialog.openDirectory).toHaveBeenCalled())
    await waitFor(() =>
      expect(window.api.assets.setEngineSettings).toHaveBeenCalledWith({
        excludePaths: ['/Users/me/tmp', '/Users/me/new-dir']
      })
    )
  })

  it('removes an excluded path (GH-135 G4)', async () => {
    renderSettingsContent()

    const removeButton = await screen.findByRole('button', { name: 'Remove /Users/me/tmp' })
    fireEvent.click(removeButton)
    await waitFor(() =>
      expect(window.api.assets.setEngineSettings).toHaveBeenCalledWith({ excludePaths: [] })
    )
  })

  it('opens the scanned-assets detail modal from the metric (GH-135 G2)', async () => {
    useAppStore.setState({
      assets: [
        {
          id: 's1',
          agentId: 'claude-code',
          category: 'capability',
          type: 'skill',
          scope: 'user',
          name: 'Skill One',
          path: '/x/s1',
          meta: {}
        } as Asset
      ]
    })
    renderSettingsContent()

    // The assets metric is a button; clicking it opens the scanned-results modal.
    fireEvent.click(await screen.findByText('12 assets'))
    expect(await screen.findByText('Scanned assets')).toBeInTheDocument()
  })

  it('shows the scan history trend block from engine data (GH-135 G7)', async () => {
    renderSettingsContent()

    // Title + UI-derived summary (count) from the engine's raw scanHistory (3 entries).
    expect(await screen.findByText('Scan history')).toBeInTheDocument()
    expect(screen.getByText('3 scans')).toBeInTheDocument()
  })

  it('refreshes the scan engine from settings', async () => {
    renderSettingsContent()

    const refreshIndex = await screen.findByRole('button', { name: 'Refresh index' })
    fireEvent.click(refreshIndex)

    await waitFor(() => {
      expect(window.api.assets.refresh).toHaveBeenCalledWith({ wait: false })
    })
    expect(window.api.assets.engineInfo).toHaveBeenCalled()
  })

  it('localizes the plugin registry copy in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderSettingsContent()

    await screen.findByText('插件注册表当前不可用。')
    expect(screen.queryByText('未发现支持的本地来源。')).not.toBeInTheDocument()
    expect(window.api.assets.scanSources).not.toHaveBeenCalled()
  })

  it('exposes appearance choices as named radio groups', async () => {
    renderSettingsContent()

    const themeGroup = screen.getByRole('radiogroup', { name: 'Theme' })
    const systemTheme = within(themeGroup).getByRole('radio', { name: 'System' })
    const darkTheme = within(themeGroup).getByRole('radio', { name: 'Dark' })
    expect(systemTheme).toHaveAttribute('aria-checked', 'true')
    expect(systemTheme).toHaveAttribute('tabindex', '0')
    expect(darkTheme).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(darkTheme)

    expect(darkTheme).toHaveAttribute('aria-checked', 'true')
    expect(systemTheme).toHaveAttribute('aria-checked', 'false')
    expect(window.api.theme.set).toHaveBeenCalledWith('dark')

    const languageGroup = screen.getByRole('radiogroup', { name: 'Language' })
    const english = within(languageGroup).getByRole('radio', { name: 'English' })
    const chinese = within(languageGroup).getByRole('radio', { name: '中文' })
    expect(english).toHaveAttribute('aria-checked', 'true')
    expect(chinese).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(chinese)

    await waitFor(() => {
      expect(chinese).toHaveAttribute('aria-checked', 'true')
    })
    expect(localStorage.getItem('berth-language')).toBe('zh')
  })

  it('supports arrow-key selection inside appearance radio groups', async () => {
    renderSettingsContent()

    const themeGroup = screen.getByRole('radiogroup', { name: 'Theme' })
    const systemTheme = within(themeGroup).getByRole('radio', { name: 'System' })
    const darkTheme = within(themeGroup).getByRole('radio', { name: 'Dark' })

    systemTheme.focus()
    fireEvent.keyDown(systemTheme, { key: 'ArrowLeft' })

    expect(darkTheme).toHaveAttribute('aria-checked', 'true')
    expect(darkTheme).toHaveFocus()

    const languageGroup = screen.getByRole('radiogroup', { name: 'Language' })
    const english = within(languageGroup).getByRole('radio', { name: 'English' })
    const chinese = within(languageGroup).getByRole('radio', { name: '中文' })

    english.focus()
    fireEvent.keyDown(english, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(chinese).toHaveAttribute('aria-checked', 'true')
    })
    expect(chinese).toHaveFocus()
  })
})
