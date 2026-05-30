import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WindowControls } from '../../src/renderer/src/components/layout/window-controls'

describe('WindowControls', () => {
  const minimize = vi.fn(async () => {})
  const toggleMaximize = vi.fn(async () => {})
  const close = vi.fn(async () => {})
  const isMaximized = vi.fn(async () => false)
  const removeMaximizedListener = vi.fn()
  let maximizedCallback: ((maximized: boolean) => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    maximizedCallback = undefined

    window.api.window = {
      minimize,
      toggleMaximize,
      close,
      isMaximized,
      onMaximizedChange: vi.fn((callback: (maximized: boolean) => void) => {
        maximizedCallback = callback
        return removeMaximizedListener
      })
    }
  })

  it('renders Windows chrome buttons and calls preload window APIs', async () => {
    render(<WindowControls />)

    fireEvent.click(screen.getByLabelText('Minimize window'))
    fireEvent.click(screen.getByLabelText('Maximize window'))
    fireEvent.click(screen.getByLabelText('Close window'))

    expect(minimize).toHaveBeenCalledTimes(1)
    expect(toggleMaximize).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(isMaximized).toHaveBeenCalledTimes(1)
  })

  it('switches maximize button label when main reports maximized state', async () => {
    render(<WindowControls />)

    await waitFor(() => expect(maximizedCallback).toBeDefined())
    act(() => {
      maximizedCallback?.(true)
    })

    expect(screen.getByLabelText('Restore window')).toBeInTheDocument()
  })

  it('removes maximize listener on unmount', () => {
    const { unmount } = render(<WindowControls />)

    unmount()

    expect(removeMaximizedListener).toHaveBeenCalledTimes(1)
  })
})
