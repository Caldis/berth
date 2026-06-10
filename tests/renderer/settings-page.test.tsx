import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ThemeProvider } from '../../src/renderer/src/components/theme-provider'
import { SettingsContent } from '../../src/renderer/src/components/settings/settings-content'

describe('SettingsContent page chrome', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.className = ''
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [], manifests: [] }))
    window.api.assets.scanSources = vi.fn(async () => [])
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

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
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
