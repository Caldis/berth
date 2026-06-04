import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CategoryJumpNav } from '../../src/renderer/src/components/shared/category-jump-nav'

const items = [
  { id: 'today', label: 'Today', count: 12, targetIndex: 0 },
  { id: 'heading:parent:/Users/caldis/Desktop/Archive', kind: 'heading' as const, label: 'Desktop/Archive', count: 0, targetIndex: 12, title: '/Users/caldis/Desktop/Archive' },
  { id: 'archive', label: 'Archive', count: 4, targetIndex: 12, title: '/Users/caldis/Desktop/Archive' }
]

describe('CategoryJumpNav', () => {
  it('renders accessible jump items with active state and counts', () => {
    render(
      <CategoryJumpNav
        items={items}
        activeId="archive"
        label="Session groups"
        onSelect={() => {}}
      />
    )

    expect(screen.getByRole('navigation', { name: 'Session groups' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Today, 12 items' })).toBeInTheDocument()
    expect(screen.getByText('Desktop/Archive').closest('div')).toHaveAttribute('title', '/Users/caldis/Desktop/Archive')
    expect(screen.queryByRole('button', { name: 'Desktop/Archive, 0 items' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive, 4 items' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Archive, 4 items' })).toHaveAttribute('title', '/Users/caldis/Desktop/Archive')
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('calls onSelect with the target item id', () => {
    const onSelect = vi.fn()

    render(<CategoryJumpNav items={items} activeId="today" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Archive, 4 items' }))

    expect(onSelect).toHaveBeenCalledWith('archive')
  })

  it('uses a compact horizontal layout before the desktop sticky column', () => {
    render(<CategoryJumpNav items={items} activeId="today" onSelect={() => {}} testId="jump-nav" />)

    expect(screen.getByTestId('jump-nav')).toHaveClass('overflow-x-auto')
    expect(screen.getByTestId('jump-nav')).toHaveClass('lg:overflow-x-hidden')
    expect(screen.getByTestId('jump-nav')).toHaveClass('lg:sticky')
    expect(screen.getByTestId('jump-nav-list')).toHaveClass('lg:w-full')
    expect(screen.getByTestId('jump-nav-list')).toHaveClass('lg:flex-col')
  })
})
