import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React, { useRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SettingsDialog } from '../../src/renderer/src/components/layout/settings-dialog'

function SettingsDialogHarness(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div>
      <button type="button">Outside before</button>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open settings
      </button>
      <SettingsDialog open={open} onOpenChange={setOpen} returnFocusRef={triggerRef} />
      <button type="button">Outside after</button>
    </div>
  )
}

describe('SettingsDialog focus management', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.className = ''
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [], manifests: [] }))
    window.api.assets.scanSources = vi.fn(async () => [])
    window.api.shell.openExternal = vi.fn(async () => {})
    window.api.theme.set = vi.fn(async () => {})
  })

  async function waitForSettingsContent(): Promise<void> {
    await screen.findByText('The plugin registry is not available.')
    await screen.findByText('No supported local sources found.')
  }

  it('keeps Tab and Shift+Tab inside the open dialog', async () => {
    render(<SettingsDialogHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    await waitForSettingsContent()

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    const close = within(dialog).getByRole('button', { name: 'Close' })
    const reportIssue = within(dialog).getByRole('button', { name: 'Report Issue' })

    expect(close).toHaveFocus()

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })

    expect(reportIssue).toHaveFocus()

    fireEvent.keyDown(reportIssue, { key: 'Tab' })

    expect(close).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Outside after' })).not.toHaveFocus()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<SettingsDialogHarness />)

    const trigger = screen.getByRole('button', { name: 'Open settings' })
    fireEvent.click(trigger)
    await waitForSettingsContent()

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })
})
