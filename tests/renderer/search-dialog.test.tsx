import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SearchDialog } from '../../src/renderer/src/components/layout/search-dialog'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('SearchDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
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

    const input = within(dialog).getByRole('textbox', { name: /搜索资产/ })
    await waitFor(() => expect(input).toHaveFocus())
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
})
