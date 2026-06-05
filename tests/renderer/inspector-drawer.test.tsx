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
  const originalNavigatorDescriptors = {
    platform: Object.getOwnPropertyDescriptor(window.navigator, 'platform'),
    userAgent: Object.getOwnPropertyDescriptor(window.navigator, 'userAgent'),
    userAgentData: Object.getOwnPropertyDescriptor(window.navigator, 'userAgentData')
  }

  function setNavigatorPlatform(value: string): void {
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: ''
    })
    Object.defineProperty(window.navigator, 'userAgentData', {
      configurable: true,
      value: { platform: value }
    })
  }

  function restoreNavigatorProperty(key: string, descriptor?: PropertyDescriptor): void {
    if (descriptor) {
      Object.defineProperty(window.navigator, key, descriptor)
      return
    }
    Reflect.deleteProperty(window.navigator, key)
  }

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    setNavigatorPlatform('Win32')
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
    restoreNavigatorProperty('platform', originalNavigatorDescriptors.platform)
    restoreNavigatorProperty('userAgent', originalNavigatorDescriptors.userAgent)
    restoreNavigatorProperty('userAgentData', originalNavigatorDescriptors.userAgentData)
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

  it('keeps the drawer header clear of Windows titlebar controls', () => {
    render(<InspectorDrawer />)

    expect(screen.getByRole('dialog', { name: 'View Raw' })).toHaveClass('z-[9990]', 'top-0', 'h-full')
    expect(screen.getByTestId('file-viewer-header')).toHaveClass('pr-48')
    // The macOS-only title-bar spacer must not render on Windows.
    expect(screen.queryByTestId('file-viewer-mac-titlebar')).not.toBeInTheDocument()
  })

  it('flushes the macOS drawer to the top while sparing the traffic-light strip from the backdrop', () => {
    setNavigatorPlatform('MacIntel')

    render(<InspectorDrawer />)

    // Backdrop still starts below the 40px strip so the left-side traffic lights
    // are not dimmed by the scrim.
    expect(screen.getByTestId('file-viewer-backdrop')).toHaveClass('top-10')
    // The drawer panel itself is flush to the window top (no gap above it)...
    const dialog = screen.getByRole('dialog', { name: 'View Raw' })
    expect(dialog).toHaveClass('top-0', 'h-full')
    expect(dialog).not.toHaveClass('top-10')
    // ...while a draggable spacer keeps the header buttons below the macOS system
    // title-bar strip, where -webkit-app-region: no-drag is unreliable.
    expect(screen.getByTestId('file-viewer-mac-titlebar')).toHaveClass('titlebar-drag')
    expect(screen.getByTestId('file-viewer-header')).not.toHaveClass('pr-48')
  })

  it('resizes the file viewer from the left edge', () => {
    render(<InspectorDrawer />)

    const dialog = screen.getByRole('dialog', { name: 'View Raw' })
    const resizeHandle = screen.getByRole('separator', { name: 'Resize file viewer' })

    expect(dialog).toHaveStyle({ width: 'min(100vw, 672px)' })

    fireEvent.mouseDown(resizeHandle, { clientX: 300 })
    fireEvent.mouseMove(document, { clientX: 180 })
    fireEvent.mouseUp(document)

    expect(dialog).toHaveStyle({ width: 'min(100vw, 792px)' })
  })
})
