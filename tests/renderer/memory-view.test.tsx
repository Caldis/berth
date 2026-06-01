import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
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
  beforeEach(() => {
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

  it('shows a missing-file state and hides file actions for missing notes', () => {
    render(<MemoryView />)

    expect(screen.getByText('Missing note')).toBeInTheDocument()
    expect(screen.getByText('File missing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Missing note/ }))

    expect(screen.getByText('The indexed note file is missing on disk.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /View Raw/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show in Explorer/ })).not.toBeInTheDocument()
  })
})

