import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { EmptyState, PAGE_EMPTY_FILL } from '../../src/renderer/src/components/shared/empty-state'
import { MessageSquare } from 'lucide-react'

describe('EmptyState fullHeight variant', () => {
  it('fills its parent and centers the placeholder when fullHeight', () => {
    const { container } = render(<EmptyState fullHeight icon={MessageSquare} message="暂无内容" />)
    const root = container.firstChild as HTMLElement

    expect(root.className).toContain('flex-1')
    expect(root.className).toContain('h-full')
    expect(root.className).toContain('items-center')
    expect(root.className).toContain('justify-center')
  })

  it('does not add fill classes by default (block/local usage unchanged)', () => {
    const { container } = render(<EmptyState icon={MessageSquare} message="暂无内容" />)
    const root = container.firstChild as HTMLElement

    expect(root.className).not.toContain('flex-1')
    expect(root.className).not.toContain('h-full')
  })

  it('still honours a caller className override (e.g. border-0 for block usage)', () => {
    const { container } = render(
      <EmptyState icon={MessageSquare} message="暂无内容" className="border-0 py-8" />
    )
    const root = container.firstChild as HTMLElement

    expect(root.className).toContain('border-0')
  })

  it('exposes a page-fill min-height helper bound to the content-area height vars', () => {
    expect(PAGE_EMPTY_FILL).toContain('min-h-[calc(')
    expect(PAGE_EMPTY_FILL).toContain('--berth-page-top-offset')
    expect(PAGE_EMPTY_FILL).toContain('--berth-page-gutter')
  })
})
