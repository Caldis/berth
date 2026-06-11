import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { InspectorDrawer } from '../../src/renderer/src/components/layout/inspector-drawer'
import { ViewRawButton } from '../../src/renderer/src/components/shared/view-raw-button'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '@shared/types/asset'

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset',
    agentId: 'codex',
    category: 'capability',
    type: 'mcp-server',
    scope: 'user',
    name: 'openaiDeveloperDocs',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {},
    ...overrides
  }
}

describe('ViewRawButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.getState().closeInspector()
    window.api.assets.get = vi.fn()
  })

  it('opens the inspector drawer when raw content is available', async () => {
    vi.mocked(window.api.assets.get).mockResolvedValue({
      ...asset(),
      raw: '[mcp_servers.openaiDeveloperDocs]'
    })

    render(
      <>
        <ViewRawButton asset={asset()} />
        <InspectorDrawer />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: 'View Raw' }))

    expect(await screen.findByRole('dialog', { name: 'View Raw' })).toBeInTheDocument()
    expect(screen.getByText('[mcp_servers.openaiDeveloperDocs]')).toBeInTheDocument()
  })

  it('shows an unavailable state when the source has no raw content', async () => {
    vi.mocked(window.api.assets.get).mockResolvedValue(asset())

    render(<ViewRawButton asset={asset()} />)

    fireEvent.click(screen.getByRole('button', { name: 'View Raw' }))

    const button = await screen.findByRole('button', { name: 'Raw unavailable' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Raw content is unavailable for this asset.')
  })

  it('shows the same unavailable state when loading fails', async () => {
    vi.mocked(window.api.assets.get).mockRejectedValue(new Error('missing file'))

    render(<ViewRawButton asset={asset()} />)

    fireEvent.click(screen.getByRole('button', { name: 'View Raw' }))

    const button = await screen.findByRole('button', { name: 'Raw unavailable' })
    expect(button).toBeDisabled()
  })

  it('disables itself while raw content is loading', async () => {
    let resolve: (value: Asset) => void = () => {}
    vi.mocked(window.api.assets.get).mockReturnValue(new Promise<Asset>((next) => {
      resolve = next
    }))

    render(<ViewRawButton asset={asset()} />)

    fireEvent.click(screen.getByRole('button', { name: 'View Raw' }))

    expect(screen.getByRole('button', { name: 'Loading raw...' })).toBeDisabled()

    resolve({ ...asset(), raw: '[raw]' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Raw' })).toBeInTheDocument()
    })
  })
})
