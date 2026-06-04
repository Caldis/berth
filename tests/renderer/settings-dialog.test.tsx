import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React, { useRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroUIProvider } from '@heroui/react'
import i18n from '../../src/renderer/src/i18n'
import { SettingsDialog } from '../../src/renderer/src/components/layout/settings-dialog'

function SettingsDialogHarness(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <HeroUIProvider>
      <button type="button">Outside before</button>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open settings
      </button>
      <SettingsDialog open={open} onOpenChange={setOpen} returnFocusRef={triggerRef} />
      <button type="button">Outside after</button>
    </HeroUIProvider>
  )
}

// GH-105: the dialog now uses HeroUI Modal (React Aria) instead of a hand-rolled
// focus trap. We assert the user-facing outcomes (opens with an accessible name,
// close button + Escape dismiss, focus returns to the trigger) rather than the
// library's internal Tab-cycle order.
describe('SettingsDialog (HeroUI Modal)', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.className = ''
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [], manifests: [] }))
    window.api.assets.scanSources = vi.fn(async () => [])
    window.api.shell.openExternal = vi.fn(async () => {})
    window.api.theme.set = vi.fn(async () => {})
  })

  async function openAndWait(): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    await screen.findByText('The plugin registry is not available.')
    expect(window.api.assets.scanSources).not.toHaveBeenCalled()
  }

  it('renders no dialog until opened', () => {
    render(<SettingsDialogHarness />)
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('opens an accessible Settings dialog with a localized close button', async () => {
    render(<SettingsDialogHarness />)
    await openAndWait()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('closes via the close button', async () => {
    render(<SettingsDialogHarness />)
    await openAndWait()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    })
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<SettingsDialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open settings' })
    // jsdom doesn't focus a button on click the way a browser does, so focus the
    // trigger explicitly first — React Aria captures it as the restore target.
    trigger.focus()
    await openAndWait()

    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    })
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
