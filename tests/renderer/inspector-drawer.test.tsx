import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { InspectorDrawer } from '../../src/renderer/src/components/layout/inspector-drawer'
import { useAppStore } from '../../src/renderer/src/stores/app'

const RAW_PATH = 'C:\\Users\\test\\.codex\\config.toml'
const RAW_CONTENT = '[hooks]\nenabled = true'

describe('InspectorDrawer focus management', () => {
  const writeText = vi.fn<[(text: string) => Promise<void>]>()

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
    act(() => {
      useAppStore.getState().openInspector(RAW_PATH, RAW_CONTENT)
    })
  })

  afterEach(async () => {
    cleanup()
    writeText.mockReset()
    act(() => {
      useAppStore.getState().closeInspector()
    })
    await i18n.changeLanguage('en')
  })

  it('exposes modal dialog semantics and focuses the close action', async () => {
    render(<InspectorDrawer />)

    const dialog = screen.getByRole('dialog', { name: 'View Raw' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const close = within(dialog).getByRole('button', { name: 'Close' })
    expect(within(dialog).getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()

    await waitFor(() => expect(close).toHaveFocus())
  })

  it('keeps Tab and Shift+Tab inside the open drawer', async () => {
    render(
      <>
        <button type="button">Outside target</button>
        <InspectorDrawer />
      </>
    )

    const dialog = screen.getByRole('dialog', { name: 'View Raw' })
    const copy = within(dialog).getByRole('button', { name: 'Copy to clipboard' })
    const close = within(dialog).getByRole('button', { name: 'Close' })

    copy.focus()
    fireEvent.keyDown(copy, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()

    fireEvent.keyDown(close, { key: 'Tab' })
    expect(copy).toHaveFocus()
  })

  it('closes with Escape and backdrop click', async () => {
    const { container, rerender } = render(<InspectorDrawer />)

    expect(screen.getByRole('dialog', { name: 'View Raw' })).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'View Raw' })).not.toBeInTheDocument()
    })

    act(() => {
      useAppStore.getState().openInspector(RAW_PATH, RAW_CONTENT)
    })
    rerender(<InspectorDrawer />)

    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeInTheDocument()
    act(() => {
      fireEvent.click(backdrop as Element)
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'View Raw' })).not.toBeInTheDocument()
    })
  })

  it('copies the raw content', async () => {
    render(<InspectorDrawer />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(RAW_CONTENT)
    })
  })
})
