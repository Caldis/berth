import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'
import {
  PageChromeProvider,
  usePageChrome,
  useFocusPageSearch,
  type PageChromeSearch
} from '../../src/renderer/src/components/layout/page-chrome'

/**
 * GH-109 C1: header 搜索框从手写 <input> 迁到 HeroUI Input。
 * 这是重构特征测试 — 固化"必须存活"的行为契约 (受控 value/onChange、
 * placeholder/aria-label、页内搜索 focus+select、键盘提示), 迁移前后均须绿。
 */
function ChromeSetter({ search }: { search: PageChromeSearch }): React.ReactElement {
  usePageChrome({ search }, [search])
  const focusPageSearch = useFocusPageSearch()
  return (
    <button data-testid="focus-trigger" onClick={() => focusPageSearch()}>
      focus
    </button>
  )
}

function renderHeader(search: PageChromeSearch): void {
  render(
    <MemoryRouter>
      <PageChromeProvider>
        <ChromeSetter search={search} />
        <TopNavigation isWindows={false} />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('TopNavigation header search (GH-109 C1)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the search field with placeholder and aria-label', () => {
    renderHeader({
      value: '',
      onValueChange: () => {},
      placeholder: 'Filter sessions...',
      ariaLabel: 'Filter sessions'
    })
    const input = screen.getByLabelText('Filter sessions')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('placeholder', 'Filter sessions...')
  })

  it('fires onValueChange when typing', () => {
    const onValueChange = vi.fn()
    renderHeader({
      value: '',
      onValueChange,
      placeholder: 'Filter sessions...',
      ariaLabel: 'Filter sessions'
    })
    fireEvent.change(screen.getByLabelText('Filter sessions'), { target: { value: 'abc' } })
    expect(onValueChange).toHaveBeenCalledWith('abc')
  })

  it('exposes the keyboard-shortcut hint', () => {
    renderHeader({ value: '', onValueChange: () => {}, placeholder: 'Filter sessions...' })
    expect(screen.getByText(/⇧⌘K|Ctrl\+Shift\+K/)).toBeInTheDocument()
  })

  it('focuses and selects the field via the registered shortcut handler', () => {
    renderHeader({
      value: 'hello',
      onValueChange: () => {},
      placeholder: 'Filter sessions...',
      ariaLabel: 'Filter sessions'
    })
    const input = screen.getByLabelText('Filter sessions') as HTMLInputElement
    fireEvent.click(screen.getByTestId('focus-trigger'))
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe('hello'.length)
  })
})
