import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SearchDialog } from '../../src/renderer/src/components/layout/search-dialog'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { SearchResult } from '@shared/types/ipc'

function searchResult(id: string, overrides: Partial<SearchResult['asset']> = {}): SearchResult {
  return {
    id,
    score: 1,
    matches: [{ field: 'metadata', snippet: 'berth' }],
    asset: {
      id,
      agentId: 'codex',
      category: 'state',
      type: 'session',
      scope: 'session',
      name: `Session ${id}`,
      path: `C:/Users/mail/.codex/sessions/${id}.jsonl`,
      meta: {
        project: 'berth',
        model: 'gpt-5'
      },
      ...overrides
    }
  }
}

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

describe('SearchDialog', () => {
  let searchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await i18n.changeLanguage('zh')
    searchMock = vi.fn(async () => [])
    window.api.assets.search = searchMock
    act(() => {
      useAppStore.setState({ searchOpen: true })
    })
  })

  afterEach(async () => {
    cleanup()
    act(() => {
      useAppStore.setState({ searchOpen: false })
    })
    await i18n.changeLanguage('en')
  })

  it('uses localized quick action labels', () => {
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    for (const label of ['总览', '会话', '指令', '能力', '用量']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }

    for (const label of ['Overview', 'Sessions', 'Instructions', 'Capabilities', 'Usage']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('exposes modal dialog semantics and focuses the search input', async () => {
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    const dialog = screen.getByRole('dialog', { name: /搜索资产/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveClass('motion-safe:fade-in')
    expect(dialog).toHaveClass('motion-safe:zoom-in-95')

    const input = within(dialog).getByRole('textbox', { name: /搜索资产/ })
    await waitFor(() => expect(input).toHaveFocus())

    const backdrop = screen.getByTestId('search-dialog-backdrop')
    expect(backdrop).toHaveClass('backdrop-blur-sm')
    expect(backdrop).toHaveClass('motion-safe:fade-in')
  })

  it('keeps Tab and Shift+Tab inside the open dialog', async () => {
    render(
      <MemoryRouter>
        <button type="button">Outside target</button>
        <SearchDialog />
      </MemoryRouter>
    )

    const dialog = screen.getByRole('dialog', { name: /搜索资产/ })
    const input = within(dialog).getByRole('textbox', { name: /搜索资产/ })
    const usageAction = within(dialog).getByRole('button', { name: '用量' })

    await waitFor(() => expect(input).toHaveFocus())

    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })
    expect(usageAction).toHaveFocus()

    fireEvent.keyDown(usageAction, { key: 'Tab' })
    expect(input).toHaveFocus()
  })

  it('closes with Escape', async () => {
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    expect(screen.getByRole('dialog', { name: /搜索资产/ })).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /搜索资产/ })).not.toBeInTheDocument()
    })
  })

  it('closes with backdrop click', async () => {
    const { container } = render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeInTheDocument()
    act(() => {
      fireEvent.click(backdrop as Element)
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /搜索资产/ })).not.toBeInTheDocument()
    })
  })

  it('closes when a quick action is selected', async () => {
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: '用量' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /搜索资产/ })).not.toBeInTheDocument()
    })
  })

  it('queries assets and renders identifiable result rows', async () => {
    searchMock.mockResolvedValueOnce([
      searchResult('session-abc', {
        name: 'Fix global search',
        meta: { project: 'berth', model: 'gpt-5' }
      })
    ])
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByRole('textbox', { name: /搜索资产/ }), {
      target: { value: 'berth' }
    })

    await waitFor(() => expect(searchMock).toHaveBeenCalledWith('berth'))
    expect(await screen.findByRole('option', { name: /Fix global search/ })).toBeInTheDocument()
    expect(screen.getByText('会话')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText(/元数据: berth/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '总览' })).not.toBeInTheDocument()
  })

  it('shows loading, empty, and error states for non-empty queries', async () => {
    let resolveSearch: (value: SearchResult[]) => void = () => {}
    searchMock.mockReturnValueOnce(new Promise<SearchResult[]>((resolve) => {
      resolveSearch = resolve
    }))
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    const input = screen.getByRole('textbox', { name: /搜索资产/ })
    fireEvent.change(input, { target: { value: 'missing' } })

    expect(await screen.findByText('正在搜索…')).toBeInTheDocument()
    act(() => resolveSearch([]))
    expect(await screen.findByText('未找到结果。')).toBeInTheDocument()

    searchMock.mockRejectedValueOnce(new Error('search failed'))
    fireEvent.change(input, { target: { value: 'broken' } })

    expect(await screen.findByText('搜索失败。')).toBeInTheDocument()
  })

  it('navigates selected results with click and Enter', async () => {
    searchMock.mockResolvedValue([
      searchResult('first'),
      searchResult('second', { name: 'Second session' })
    ])
    render(
      <MemoryRouter initialEntries={['/']}>
        <SearchDialog />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    const input = screen.getByRole('textbox', { name: /搜索资产/ })
    fireEvent.change(input, { target: { value: 'session' } })

    const second = await screen.findByRole('option', { name: /Second session/ })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(second).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/sessions/second')
      expect(screen.queryByRole('dialog', { name: /搜索资产/ })).not.toBeInTheDocument()
    })
  })

  it('routes asset results to the promoted first-level pages', async () => {
    searchMock.mockResolvedValueOnce([
      searchResult('hook-stop', {
        category: 'capability',
        type: 'hook',
        name: 'Stop hook',
        path: 'C:/Users/mail/.codex/config.toml',
        meta: { eventType: 'Stop' }
      })
    ])
    render(
      <MemoryRouter initialEntries={['/']}>
        <SearchDialog />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByRole('textbox', { name: /搜索资产/ }), {
      target: { value: 'hook' }
    })

    fireEvent.click(await screen.findByRole('option', { name: /Stop hook/ }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/capabilities/hooks')
      expect(screen.queryByRole('dialog', { name: /搜索资产/ })).not.toBeInTheDocument()
    })
  })
})
