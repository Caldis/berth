import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '../../src/renderer/src/i18n'
import { UpdateSection } from '../../src/renderer/src/components/settings/update-section'
import type { UpdateState } from '@shared/types/ipc'

// GH-124/GH-134: the update card must cover every update:state phase, disable
// the check button while busy, and expose the autoCheck/autoDownload/beta
// switches. macOS is signed (GH-134) so download/install are always real.
let pushState: (state: UpdateState) => void

beforeEach(() => {
  pushState = () => {}
  window.api.update.onState = vi.fn((cb: (s: UpdateState) => void) => {
    pushState = cb
    return () => {}
  })
  window.api.update.getPreferences = vi.fn(async () => ({
    autoCheck: true,
    autoDownload: false,
    allowPrerelease: false
  }))
  window.api.update.check = vi.fn(async () => {})
  window.api.update.download = vi.fn(async () => {})
  window.api.update.install = vi.fn(async () => {})
  window.api.update.setPreferences = vi.fn(async () => {})
})

describe('UpdateSection', () => {
  it('renders idle with an enabled check button and the three preference switches', async () => {
    render(<UpdateSection />)
    expect(await screen.findByTestId('update-check')).toBeEnabled()
    expect(screen.getByTestId('update-status').textContent).toContain('Checks for updates')
    expect(screen.getByTestId('update-auto-check')).toBeInTheDocument()
    expect(screen.getByTestId('update-auto-download')).toBeInTheDocument()
    expect(screen.getByTestId('update-beta')).toBeInTheDocument()
  })

  it('toggling the beta switch persists a merged preferences payload (GH-134)', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-beta')

    await act(async () => {
      screen.getByTestId('update-beta').click()
    })
    expect(window.api.update.setPreferences).toHaveBeenCalledWith({
      autoCheck: true,
      autoDownload: false,
      allowPrerelease: true
    })
  })

  it('disables the check button while checking and shows progress while downloading', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-check')

    act(() => pushState({ phase: 'checking' }))
    expect(screen.getByTestId('update-check')).toBeDisabled()

    act(() => pushState({ phase: 'downloading', percent: 37 }))
    expect(screen.getByTestId('update-status').textContent).toContain('37%')
  })

  it('available → download button wired to update:download', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-check')

    act(() => pushState({ phase: 'available', version: '0.3.0' }))
    expect(screen.getByTestId('update-status').textContent).toContain('0.3.0')
    screen.getByTestId('update-download').click()
    expect(window.api.update.download).toHaveBeenCalled()
  })

  it('downloaded → restart & install wired to update:install', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-check')

    act(() => pushState({ phase: 'downloaded', version: '0.3.0' }))
    screen.getByTestId('update-install').click()
    expect(window.api.update.install).toHaveBeenCalled()
  })

  it('error state surfaces the message and keeps check available', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-check')

    act(() => pushState({ phase: 'error', error: 'net down' }))
    expect(screen.getByTestId('update-status').textContent).toContain('net down')
    expect(screen.getByTestId('update-check')).toBeEnabled()
  })
})
