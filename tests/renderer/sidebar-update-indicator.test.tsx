import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import '../../src/renderer/src/i18n'
import { SidebarUpdateIndicator, UpdateNotesPanel } from '../../src/renderer/src/components/layout/sidebar-update-indicator'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { UpdateState } from '@shared/types/ipc'

// GH-156: the sidebar footer indicator mirrors bobcorn's status-strip model —
// nothing while idle, single-click phase advance, release notes in the hover
// panel. Panel content is tested directly (hover popovers detach too fast in
// jsdom, see sidebar-scan-status.test).

function setPhase(state: UpdateState): void {
  useAppStore.setState({ updateState: state })
}

function renderIndicator(collapsed = false): ReturnType<typeof render> {
  return render(
    <HeroUIProvider>
      <SidebarUpdateIndicator collapsed={collapsed} />
    </HeroUIProvider>
  )
}

function renderPanel(props: { onExpand?: () => void; variant?: 'card' | 'dialog' } = {}): ReturnType<typeof render> {
  return render(
    <HeroUIProvider>
      <UpdateNotesPanel {...props} />
    </HeroUIProvider>
  )
}

beforeEach(() => {
  setPhase({ phase: 'idle' })
  window.api.update.check = vi.fn(async () => {})
  window.api.update.download = vi.fn(async () => {})
  window.api.update.install = vi.fn(async () => {})
  window.api.update.getPreferences = vi.fn(async () => ({
    autoCheck: true,
    autoDownload: false,
    allowPrerelease: false
  }))
  window.api.update.onState = vi.fn(() => () => {})
})

describe('SidebarUpdateIndicator', () => {
  it('renders nothing while idle or up-to-date', () => {
    const { container } = renderIndicator()
    expect(container.querySelector('[data-testid="sidebar-update-trigger"]')).toBeNull()

    act(() => setPhase({ phase: 'not-available' }))
    expect(container.querySelector('[data-testid="sidebar-update-trigger"]')).toBeNull()
  })

  it('checking: shows the label and ignores clicks', () => {
    setPhase({ phase: 'checking' })
    renderIndicator()
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button.textContent).toContain('Checking for updates')
    fireEvent.click(button)
    expect(window.api.update.check).not.toHaveBeenCalled()
    expect(window.api.update.download).not.toHaveBeenCalled()
  })

  it('available: shows the version and click starts the download (AC1/AC2)', () => {
    setPhase({ phase: 'available', version: '9.9.9' })
    renderIndicator()
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button.textContent).toContain('v9.9.9 available')
    fireEvent.click(button)
    expect(window.api.update.download).toHaveBeenCalledTimes(1)
  })

  it('downloading: shows percent, renders a progress bar, ignores clicks (AC1)', () => {
    setPhase({ phase: 'downloading', percent: 37 })
    renderIndicator()
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button.textContent).toContain('37%')
    fireEvent.click(button)
    expect(window.api.update.download).not.toHaveBeenCalled()
    expect(window.api.update.install).not.toHaveBeenCalled()
  })

  it('downloaded: click relaunches into the update (AC2)', () => {
    setPhase({ phase: 'downloaded', version: '9.9.9' })
    renderIndicator()
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button.textContent).toContain('Relaunch to v9.9.9')
    fireEvent.click(button)
    expect(window.api.update.install).toHaveBeenCalledTimes(1)
  })

  it('error: surfaces the message via title, click retries the check (AC2/AC4)', () => {
    setPhase({ phase: 'error', error: 'boom happened' })
    renderIndicator()
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button.textContent).toContain('Update failed')
    expect(button).toHaveAttribute('title', 'boom happened')
    fireEvent.click(button)
    expect(window.api.update.check).toHaveBeenCalledTimes(1)
  })

  it('collapsed: icon-only trigger keeps the full state in the accessible name (AC5)', () => {
    setPhase({ phase: 'available', version: '9.9.9' })
    renderIndicator(true)
    const button = screen.getByTestId('sidebar-update-trigger')
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('v9.9.9'))
    // icon-only: the label text is not rendered inline
    expect(button.textContent).toBe('')
  })

  it('opens the notes popover on trigger click without leaking raw i18n keys (AC3)', async () => {
    setPhase({ phase: 'downloading', percent: 50 })
    renderIndicator()
    fireEvent.click(screen.getByTestId('sidebar-update-trigger'))
    const panel = await screen.findByTestId('sidebar-update-popover')
    expect(panel.textContent).toContain('50%')
    expect(panel.textContent).not.toMatch(/update\.(indicator|notes)\./)
  })

  it('clicking the panel inside the popover opens the zoom modal (AC3)', async () => {
    setPhase({
      phase: 'available',
      version: '9.9.9',
      releaseNotes: [{ version: '9.9.9', note: '<p>Big fix</p>' }]
    })
    renderIndicator()
    fireEvent.click(screen.getByTestId('sidebar-update-trigger'))
    const panel = await screen.findByTestId('update-notes-panel')
    fireEvent.click(panel)
    // HeroUI modal renders into a portal; the dialog heading carries the title.
    expect(await screen.findByText("What's new")).toBeInTheDocument()
  })
})

describe('UpdateNotesPanel', () => {
  it('renders cross-version entries as sanitized text with a version range (AC3)', () => {
    setPhase({
      phase: 'available',
      version: '9.9.9',
      releaseNotes: [
        { version: '9.9.9', note: '<p>Fixed <b>crash</b></p><script>window.__x=1</script>' },
        { version: '9.9.8', note: '<ul><li>older change</li></ul>' }
      ]
    })
    renderPanel()
    const panel = screen.getByTestId('update-notes-panel')
    expect(panel.textContent).toContain('v9.9.8 → v9.9.9')
    expect(panel.textContent).toContain('Fixed crash')
    expect(panel.textContent).toContain('• older change')
    // HTML is extracted to text, never injected
    expect(panel.querySelector('script')).toBeNull()
    expect(panel.querySelector('b')).toBeNull()
    expect(panel.textContent).not.toMatch(/update\.(indicator|notes)\./)
  })

  it('shows the empty message when an update carries no notes (AC3)', () => {
    setPhase({ phase: 'available', version: '9.9.9' })
    renderPanel()
    expect(screen.getByTestId('update-notes-panel').textContent).toContain('No release notes available')
  })

  it('error phase: shows the error body and retry hint (AC4)', () => {
    setPhase({ phase: 'error', error: 'net down' })
    renderPanel()
    expect(screen.getByTestId('update-error-message').textContent).toBe('net down')
    expect(screen.getByTestId('update-notes-panel').textContent).toContain('retry')
  })

  it('invokes onExpand when clicked in an expandable phase (AC3)', () => {
    setPhase({ phase: 'downloaded', version: '9.9.9', releaseNotes: [{ version: '9.9.9', note: 'x' }] })
    const onExpand = vi.fn()
    renderPanel({ onExpand })
    fireEvent.click(screen.getByTestId('update-notes-panel'))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('is keyboard reachable: focusable with role=button, Enter expands (AC9)', () => {
    setPhase({ phase: 'available', version: '9.9.9', releaseNotes: [{ version: '9.9.9', note: 'x' }] })
    const onExpand = vi.fn()
    renderPanel({ onExpand })
    const panel = screen.getByTestId('update-notes-panel')
    expect(panel).toHaveAttribute('role', 'button')
    expect(panel).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(panel, { key: 'Enter' })
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('shows the checking body inside the panel while checking (review #7)', () => {
    setPhase({ phase: 'checking' })
    renderPanel()
    expect(screen.getByTestId('update-notes-panel').textContent).toContain('Checking for updates')
  })
})
