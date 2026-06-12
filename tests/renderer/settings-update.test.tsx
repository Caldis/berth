import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '../../src/renderer/src/i18n'
import { UpdateSection } from '../../src/renderer/src/components/settings/update-section'
import type { UpdateState } from '@shared/types/ipc'

// GH-124: the update card must cover every update:state phase, disable the
// check button while busy, and swap download/install for the releases link on
// platformLimited (unsigned macOS degradation).
let pushState: (state: UpdateState) => void

beforeEach(() => {
  pushState = () => {}
  window.api.update.onState = vi.fn((cb: (s: UpdateState) => void) => {
    pushState = cb
    return () => {}
  })
  window.api.update.getPreferences = vi.fn(async () => ({ autoDownload: false }))
  window.api.update.check = vi.fn(async () => {})
  window.api.update.download = vi.fn(async () => {})
  window.api.update.install = vi.fn(async () => {})
  window.api.update.setPreferences = vi.fn(async () => {})
})

describe('UpdateSection', () => {
  it('renders idle with an enabled check button and the autoDownload switch', async () => {
    render(<UpdateSection />)
    expect(await screen.findByTestId('update-check')).toBeEnabled()
    expect(screen.getByTestId('update-status').textContent).toContain('Checks for updates')
    expect(screen.getByTestId('update-auto-download')).toBeInTheDocument()
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
    expect(screen.queryByTestId('update-go-to-downloads')).not.toBeInTheDocument()
  })

  it('platformLimited available → releases link instead of download', async () => {
    render(<UpdateSection />)
    await screen.findByTestId('update-check')

    act(() => pushState({ phase: 'available', version: '0.3.0', platformLimited: true }))
    expect(screen.getByTestId('update-go-to-downloads')).toBeInTheDocument()
    expect(screen.queryByTestId('update-download')).not.toBeInTheDocument()
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
