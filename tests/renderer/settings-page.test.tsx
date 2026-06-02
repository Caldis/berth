import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SettingsContent } from '../../src/renderer/src/pages/settings'

describe('SettingsContent page chrome', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [], manifests: [] }))
    window.api.assets.scanSources = vi.fn(async () => [])
    window.api.shell.openExternal = vi.fn(async () => {})
  })

  it('renders the report issue action in English', async () => {
    render(<SettingsContent showTitle={false} />)

    const reportIssue = await screen.findByRole('button', { name: 'Report Issue' })
    expect(reportIssue).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()

    fireEvent.click(reportIssue)

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://github.com/Caldis/berth/issues')
  })

  it('localizes the report issue action in Chinese', async () => {
    await i18n.changeLanguage('zh')

    render(<SettingsContent showTitle={false} />)

    const reportIssue = await screen.findByRole('button', { name: '报告问题' })
    expect(reportIssue).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Report Issue' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument()
  })
})
