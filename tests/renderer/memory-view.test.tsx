import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { MemoryView } from '../../src/renderer/src/components/memory/memory-view'
import type { MemoryListResult } from '../../src/shared/types/memory'

const memoryState = vi.hoisted(() => ({
  result: {
    notes: [],
    sources: []
  } as MemoryListResult,
  loading: false,
  refreshing: false,
  refresh: vi.fn()
}))

vi.mock('../../src/renderer/src/hooks/use-memory', () => ({
  useMemory: () => memoryState
}))

describe('MemoryView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    Element.prototype.scrollIntoView = vi.fn()
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 1
        }
      ],
      notes: [
        {
          id: 'united-memory:missing-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Missing note',
          summary: 'Indexed but not present on disk',
          tags: ['ops'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\missing-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          missing: true
        }
      ]
    }
    memoryState.loading = false
    memoryState.refreshing = false
    memoryState.refresh.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a missing-file state and hides file actions for missing notes', () => {
    render(<MemoryView />)

    expect(screen.getByText('Missing note')).toBeInTheDocument()
    expect(screen.getByText('File missing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Missing note/ }))

    expect(screen.getByText('The indexed note file is missing on disk.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /View Raw/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show in Explorer/ })).not.toBeInTheDocument()
  })

  it('keeps a collapsible details shell with grid-row motion state', () => {
    render(<MemoryView />)

    const details = screen.getByTestId('memory-note-details-united-memory:missing-note')
    expect(details).toHaveAttribute('aria-hidden', 'true')
    expect(details).toHaveClass('grid-rows-[0fr]')

    fireEvent.click(screen.getByRole('button', { name: /Missing note/ }))

    expect(details).toHaveAttribute('aria-hidden', 'false')
    expect(details).toHaveClass('grid-rows-[1fr]')
    expect(screen.getByText('The indexed note file is missing on disk.')).toBeInTheDocument()
  })

  it('clears navigation focus after a short pulse', () => {
    vi.useFakeTimers()
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 2
        }
      ],
      notes: [
        {
          id: 'united-memory:source-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Source note',
          summary: 'Links to another note',
          tags: [],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\source-note.md',
          links: ['target-note'],
          createdAt: null,
          updatedAt: null,
          body: 'Related work'
        },
        {
          id: 'united-memory:target-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Target note',
          summary: 'Jump destination',
          tags: [],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\target-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Destination'
        }
      ]
    }

    render(<MemoryView />)

    fireEvent.click(screen.getByRole('button', { name: /Source note/ }))
    fireEvent.click(screen.getByRole('button', { name: 'target-note' }))

    const targetCard = screen.getByRole('button', { name: /Target note/ }).parentElement
    expect(targetCard).toHaveClass('ring-primary')

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(targetCard).not.toHaveClass('ring-primary')
  })

  it('renders markdown body and makes wiki links navigable', () => {
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 2
        }
      ],
      notes: [
        {
          id: 'united-memory:markdown-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Markdown note',
          summary: 'Rich body',
          tags: ['docs'],
          importance: 'core',
          path: 'C:\\Users\\test\\.united-memory\\mem\\markdown-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: '# Body heading\n\n- first item\n\nUse `inline_code` and [[target-note]].'
        },
        {
          id: 'united-memory:target-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Target note',
          summary: 'Jump destination',
          tags: ['docs'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\target-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Destination'
        }
      ]
    }

    render(<MemoryView />)

    fireEvent.click(screen.getByRole('button', { name: /Markdown note/ }))

    expect(screen.getByRole('heading', { name: 'Body heading' })).toBeInTheDocument()
    expect(screen.getByText('first item')).toBeInTheDocument()
    expect(screen.getByText('inline_code')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'target-note' }))

    const targetCard = screen.getByRole('button', { name: /Target note/ }).parentElement
    expect(targetCard).toHaveClass('ring-primary')
  })

  it('filters memories by importance and tag, then clears filters', () => {
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 2
        }
      ],
      notes: [
        {
          id: 'united-memory:core-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Core note',
          summary: 'Important',
          tags: ['ops'],
          importance: 'core',
          path: 'C:\\Users\\test\\.united-memory\\mem\\core-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Core'
        },
        {
          id: 'united-memory:archive-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Archive note',
          summary: 'Old',
          tags: ['docs'],
          importance: 'archive',
          path: 'C:\\Users\\test\\.united-memory\\mem\\archive-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Archive'
        }
      ]
    }

    render(<MemoryView />)

    fireEvent.click(screen.getByRole('button', { name: 'core 1' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.queryByText('Archive note')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ops 1' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.queryByText('Archive note')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.getByText('Archive note')).toBeInTheDocument()
  })

  it('uses Chinese copy for missing notes and memory filters', async () => {
    await i18n.changeLanguage('zh')

    render(<MemoryView />)

    expect(screen.getByText('文件缺失')).toBeInTheDocument()
    expect(screen.getByText('记忆类型')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全部类型' })).toBeInTheDocument()
    expect(screen.getByText('标签')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全部标签' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Missing note/ }))

    expect(screen.getByText('索引中的记忆文件已不在磁盘上。')).toBeInTheDocument()
    expect(screen.queryByText('File missing')).not.toBeInTheDocument()
    expect(screen.queryByText('The indexed note file is missing on disk.')).not.toBeInTheDocument()
  })
})
