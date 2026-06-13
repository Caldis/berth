import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ThemeProvider } from '../../src/renderer/src/components/theme-provider'
import { SettingsContent } from '../../src/renderer/src/components/settings/settings-content'
import type { AssetRuntimeStatus, ScanEngineInfo } from '@shared/types/ipc'

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
      controls: [
        { id: 'manual-refresh', value: 'available', editable: false, supported: true },
        {
          id: 'watcher-debounce-ms',
          value: 1000,
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
          unit: 'ms',
          editable: true,
          supported: true,
          settingKey: 'watcherMinIntervalMs',
          min: 0,
          max: 300000,
          step: 1000
        },
        { id: 'pause', value: 'unsupported', editable: false, supported: false }
      ],
      capabilities: {
        workerMode: 'one-shot',
        schedulerMode: 'single-flight',
        scopeMode: 'scan-on-miss',
        cacheMode: 'sqlite-swr',
        incrementalFileChanges: true,
        pauseSupported: false,
        cancelSupported: false,
        writableSettingsSupported: true
      },
      limits: [
        { id: 'metadata-only-sensitive-files', level: 'info', enabled: true },
        { id: 'third-party-code-not-executed', level: 'info', enabled: true }
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

    const reportIssue = await screen.findByRole('button', { name: 'Report Issue' })
    expect(reportIssue).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()

    fireEvent.click(reportIssue)

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://github.com/Caldis/berth/issues')
  })

  it('localizes the report issue action in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderSettingsContent()

    const reportIssue = await screen.findByRole('button', { name: '报告问题' })
    expect(reportIssue).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Report Issue' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('does not render the inert advanced mode switch (issue settings-advanced-mode-inert)', async () => {
    renderSettingsContent()

    await waitForSettingsAsyncSections()

    // GH-124 起 About 区有一个功能性 autoDownload switch; 原"零 switch"断言
    // 收紧为: 每个 switch 都有可达名, 且 advanced-mode 那个不存在。
    const switches = screen.queryAllByRole('switch')
    expect(switches).toHaveLength(1)
    expect(switches[0]).toHaveAccessibleName('Download updates automatically')
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
    expect(screen.getByLabelText('Watcher debounce')).toHaveValue(1000)
    expect(screen.getByText('Pause scanning')).toBeInTheDocument()
    expect(screen.getByText('Not supported yet')).toBeInTheDocument()
  })

  it('saves editable scan engine controls', async () => {
    renderSettingsContent()

    const watcherDebounce = await screen.findByLabelText('Watcher debounce')
    fireEvent.change(watcherDebounce, { target: { value: '1500' } })
    const row = watcherDebounce.closest('form')
    expect(row).not.toBeNull()
    fireEvent.click(within(row!).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(window.api.assets.setEngineSettings).toHaveBeenCalledWith({ watcherDebounceMs: 1500 })
    })
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
