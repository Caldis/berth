import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WindowControls } from '../../src/renderer/src/components/layout/window-controls'
import i18n from '../../src/renderer/src/i18n'

describe('WindowControls', () => {
  const minimize = vi.fn(async () => {})
  const toggleMaximize = vi.fn(async () => {})
  const close = vi.fn(async () => {})
  const isMaximized = vi.fn(async () => false)
  const removeMaximizedListener = vi.fn()
  let maximizedCallback: ((maximized: boolean) => void) | undefined

  beforeEach(async () => {
    vi.clearAllMocks()
    maximizedCallback = undefined
    await i18n.changeLanguage('en')

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

  it('localizes Windows chrome button labels in Chinese', async () => {
    await i18n.changeLanguage('zh')

    render(<WindowControls />)

    expect(screen.getByLabelText('最小化窗口')).toBeInTheDocument()
    expect(screen.getByLabelText('最大化窗口')).toBeInTheDocument()
    expect(screen.getByLabelText('关闭窗口')).toBeInTheDocument()

    await waitFor(() => expect(maximizedCallback).toBeDefined())
    act(() => {
      maximizedCallback?.(true)
    })

    expect(screen.getByLabelText('还原窗口')).toBeInTheDocument()
    expect(screen.queryByLabelText('Restore window')).not.toBeInTheDocument()
  })

  it('removes maximize listener on unmount', () => {
    const { unmount } = render(<WindowControls />)

    unmount()

    expect(removeMaximizedListener).toHaveBeenCalledTimes(1)
  })
})
