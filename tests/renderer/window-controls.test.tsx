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
  const setAlwaysOnTop = vi.fn(async () => {})
  const isAlwaysOnTop = vi.fn(async () => false)
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
      setAlwaysOnTop,
      isAlwaysOnTop,
      onMaximizedChange: vi.fn((callback: (maximized: boolean) => void) => {
        maximizedCallback = callback
        return removeMaximizedListener
      })
    }
  })

  it('renders Windows chrome buttons and calls preload window APIs', async () => {
    render(<WindowControls />)

    await waitFor(() => expect(isAlwaysOnTop).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByLabelText('Pin window'))
    fireEvent.click(screen.getByLabelText('Minimize window'))
    fireEvent.click(screen.getByLabelText('Maximize window'))
    fireEvent.click(screen.getByLabelText('Close window'))

    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(minimize).toHaveBeenCalledTimes(1)
    expect(toggleMaximize).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(isMaximized).toHaveBeenCalledTimes(1)
    expect(isAlwaysOnTop).toHaveBeenCalledTimes(1)
  })

  it('centers the control group within the supplied navigation height', () => {
    render(<WindowControls navigationHeight={96} />)

    const controls = screen.getByTestId('window-controls')
    expect(controls).toHaveClass('-translate-y-1/2')
    expect(controls).toHaveClass('right-[1.15rem]')
    expect(controls).toHaveStyle({ top: '48px' })
  })

  it('centers within the default block-layout header height when no prop is supplied', () => {
    render(<WindowControls />)

    const controls = screen.getByTestId('window-controls')
    expect(controls).toHaveClass('-translate-y-1/2')
    expect(controls).toHaveStyle({ top: '36px' })
  })

  it('uses navigation-scaled hit targets and quiet icon styling', async () => {
    render(<WindowControls />)

    const divider = screen.getByTestId('window-controls-divider')
    expect(divider).toHaveAttribute('aria-hidden', 'true')
    expect(divider).toHaveClass('h-6')
    expect(divider).toHaveClass('w-px')
    expect(divider).toHaveClass('mr-3')
    expect(divider).toHaveClass('bg-border/80')

    const buttons = [
      screen.getByRole('button', { name: 'Pin window' }),
      screen.getByRole('button', { name: 'Minimize window' }),
      screen.getByRole('button', { name: 'Maximize window' }),
      screen.getByRole('button', { name: 'Close window' })
    ]
    expect(divider.compareDocumentPosition(buttons[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    for (const button of buttons) {
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('w-9')
      expect(button).not.toHaveClass('w-10')
      expect(button.querySelector('svg')).toHaveAttribute('stroke-width', '1.8')
    }

    expect(screen.getByRole('button', { name: 'Close window' })).toHaveClass('hover:bg-destructive/10')
    expect(screen.getByRole('button', { name: 'Close window' })).not.toHaveClass('hover:bg-destructive')

    await waitFor(() => expect(isAlwaysOnTop).toHaveBeenCalledTimes(1))
  })

  it('toggles pin state and exposes pressed semantics', async () => {
    render(<WindowControls />)

    await waitFor(() => expect(isAlwaysOnTop).toHaveBeenCalledTimes(1))

    const pinButton = screen.getByRole('button', { name: 'Pin window' })
    expect(pinButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(pinButton)
    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Unpin window' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Unpin window' }))
    expect(setAlwaysOnTop).toHaveBeenCalledWith(false)
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

    expect(screen.getByLabelText('固定窗口')).toBeInTheDocument()
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
