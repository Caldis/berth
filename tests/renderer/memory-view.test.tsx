import { act, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { MemoryView } from '../../src/renderer/src/components/memory/memory-view'
import { InspectorDrawer } from '../../src/renderer/src/components/layout/inspector-drawer'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { SearchDialog } from '../../src/renderer/src/components/layout/search-dialog'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { MemoryListResult } from '../../src/shared/types/memory'

type MockGroupedVirtuosoHandle = {
  scrollToIndex: (location: unknown) => void
}

type MockGroupedVirtuosoProps = {
  groupCounts: number[]
  data?: unknown[]
  context?: unknown
  computeItemKey: (index: number, item: unknown, context: unknown) => React.Key
  groupContent: (groupIndex: number, context: unknown) => React.ReactNode
  itemContent: (index: number, groupIndex: number, item: unknown, context: unknown) => React.ReactNode
  'data-testid'?: string
}

const memoryVirtuosoMock = vi.hoisted(() => ({
  visibleLimit: 20,
  props: undefined as MockGroupedVirtuosoProps | undefined,
  scrollToIndex: vi.fn()
}))

vi.mock('react-virtuoso', async () => {
  const ReactModule = await import('react')

  const GroupedVirtuoso = ReactModule.forwardRef<MockGroupedVirtuosoHandle, MockGroupedVirtuosoProps>(function MockGroupedVirtuoso(props, ref) {
    memoryVirtuosoMock.props = props
    ReactModule.useImperativeHandle(ref, () => ({
      scrollToIndex: memoryVirtuosoMock.scrollToIndex
    }))

    const nodes: React.ReactNode[] = []
    let itemIndex = 0
    let listIndex = 0
    let renderedRows = 0

    for (let groupIndex = 0; groupIndex < props.groupCounts.length; groupIndex += 1) {
      nodes.push(
        ReactModule.createElement(
          'div',
          { key: `group-${groupIndex}`, 'data-testid': `memory-virtual-group-${groupIndex}` },
          props.groupContent(groupIndex, props.context)
        )
      )
      listIndex += 1

      for (let offset = 0; offset < props.groupCounts[groupIndex]; offset += 1) {
        const item = props.data?.[listIndex]
        const key = props.computeItemKey(listIndex, item, props.context)
        if (renderedRows < memoryVirtuosoMock.visibleLimit) {
          nodes.push(
            ReactModule.createElement(
              'div',
              { key, 'data-testid': `memory-virtual-row-${key}` },
              props.itemContent(itemIndex, groupIndex, item, props.context)
            )
          )
          renderedRows += 1
        }
        itemIndex += 1
        listIndex += 1
      }
    }

    return ReactModule.createElement(
      'div',
      { 'data-testid': props['data-testid'] ?? 'memory-mock-virtuoso' },
      nodes
    )
  })

  return { GroupedVirtuoso }
})

const memoryState = vi.hoisted(() => ({
  result: {
    notes: [],
    sources: []
  } as MemoryListResult,
  loading: false,
  refreshing: false,
  error: null as string | null,
  refresh: vi.fn()
}))

vi.mock('../../src/renderer/src/hooks/use-memory', () => ({
  useMemory: () => memoryState,
  // setup.ts 的全局 beforeEach 会调用该 reset; mock 模块需提供同名导出
  resetMemoryCacheForTests: () => {}
}))

function expectImportanceBadge(label: string, title: string): void {
  // The badge is a ui/Chip (GH-109 C6): the `title` hint sits on the Chip root,
  // the label text on the inner content span — so resolve via the nearest
  // titled ancestor rather than the text element itself.
  const badge = screen
    .getAllByText(label)
    .find((element) => element.closest('[title]')?.getAttribute('title') === title)
  expect(badge).toBeDefined()
}

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
    memoryState.error = null
    memoryState.refresh.mockClear()
    memoryVirtuosoMock.scrollToIndex.mockClear()
    useAppStore.getState().closeInspector()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a full-view error state distinct from empty when load fails with no data (GH-118 T3)', () => {
    memoryState.result = { notes: [], sources: [] }
    memoryState.error = 'memory boom'

    render(<MemoryView />)

    expect(screen.getByText('Memories could not be loaded')).toBeInTheDocument()
    expect(screen.queryByText('No memories yet')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(memoryState.refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the loaded list visible with a compact error banner on refresh failure (GH-118 T3)', () => {
    memoryState.error = 'refresh boom'

    render(<MemoryView />)

    expect(screen.getByText('Memories could not be loaded')).toBeInTheDocument()
    expect(screen.getByText('Missing note')).toBeInTheDocument()
  })

  it('shows a missing-file state and hides file actions for missing notes', () => {
    render(<MemoryView />)

    expect(screen.getByText('Missing note')).toBeInTheDocument()
    expect(screen.getByText('File missing')).toBeInTheDocument()
    expectImportanceBadge('Active', 'Active — loaded on demand when relevant')
    expect(screen.queryByText('active')).not.toBeInTheDocument()

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

    fireEvent.click(screen.getByRole('button', { name: 'Core 1' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.queryByText('Archive note')).not.toBeInTheDocument()
    expectImportanceBadge('Core', 'Core — loaded into context every session')
    expect(screen.queryByText('core')).not.toBeInTheDocument()

    // The tag browse grid is collapsed by default — reveal it before picking a tag.
    fireEvent.click(screen.getByTestId('memory-tags-filter-toggle'))
    fireEvent.click(within(screen.getByTestId('memory-tags-filter-panel')).getByRole('button', { name: 'ops 1' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.queryByText('Archive note')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.getByText('Archive note')).toBeInTheDocument()
  })

  it('collapses the tag browse grid by default and reveals it on demand', () => {
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
          id: 'united-memory:tag-heavy-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Tag heavy note',
          summary: 'Many tags',
          tags: Array.from({ length: 24 }, (_, index) => `tag-${index + 1}`),
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\tag-heavy-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Many tags'
        }
      ]
    }

    render(<MemoryView />)

    // Default: search box visible, browse grid collapsed (low footprint).
    expect(screen.getByTestId('memory-tags-filter-search')).toBeInTheDocument()
    const toggle = screen.getByTestId('memory-tags-filter-toggle')
    const grid = screen.getByTestId('memory-tags-filter-grid')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(grid).toHaveClass('grid-rows-[0fr]')
    expect(grid).toHaveAttribute('aria-hidden', 'true')
    // Legacy hover/popover/row surfaces are gone.
    expect(screen.queryByTestId('memory-tags-filter-popover')).not.toBeInTheDocument()
    expect(screen.queryByTestId('memory-tags-filter-row')).not.toBeInTheDocument()

    // Reveal on demand via the toggle.
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(grid).toHaveClass('grid-rows-[1fr]')
    const panel = screen.getByTestId('memory-tags-filter-panel')
    expect(panel).toHaveClass('overflow-y-auto')
    expect(within(panel).getByRole('button', { name: 'tag-24 1' })).toBeInTheDocument()
  })

  it('typing in the search box reveals matches and selections show as removable pills', () => {
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
          id: 'united-memory:multi-tag-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Multi tag note',
          summary: 'alpha beta gamma',
          tags: ['alpha', 'beta', 'gamma'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\multi-tag-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'tags'
        }
      ]
    }

    render(<MemoryView />)

    // Open and select a tag that will NOT match the upcoming query.
    fireEvent.click(screen.getByTestId('memory-tags-filter-toggle'))
    const panel = screen.getByTestId('memory-tags-filter-panel')
    fireEvent.click(within(panel).getByRole('button', { name: 'alpha 1' }))

    // Selection surfaces as a removable pill — visible regardless of the query.
    const selected = screen.getByTestId('memory-tags-filter-selected')
    expect(within(selected).getByRole('button', { name: 'alpha' })).toBeInTheDocument()

    // Typing auto-reveals the grid and filters the browse list by substring.
    fireEvent.change(screen.getByTestId('memory-tags-filter-search'), { target: { value: 'be' } })
    expect(within(panel).getByRole('button', { name: 'beta 1' })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'gamma 1' })).not.toBeInTheDocument()
    // The active selection stays visible as a pill even though it does not match.
    expect(within(selected).getByRole('button', { name: 'alpha' })).toBeInTheDocument()
  })

  it('filters memories by the intersection of multiple selected tags', () => {
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 3
        }
      ],
      notes: [
        {
          id: 'united-memory:note-a',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Note A',
          summary: 'esp32 + react',
          tags: ['esp32', 'react'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\note-a.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'A'
        },
        {
          id: 'united-memory:note-b',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Note B',
          summary: 'esp32 only',
          tags: ['esp32'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\note-b.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'B'
        },
        {
          id: 'united-memory:note-c',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Note C',
          summary: 'react only',
          tags: ['react'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\note-c.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'C'
        }
      ]
    }

    render(<MemoryView />)

    fireEvent.click(screen.getByTestId('memory-tags-filter-toggle'))
    const panel = screen.getByTestId('memory-tags-filter-panel')

    fireEvent.click(within(panel).getByRole('button', { name: 'esp32 2' }))
    expect(screen.getByText('Note A')).toBeInTheDocument()
    expect(screen.getByText('Note B')).toBeInTheDocument()
    expect(screen.queryByText('Note C')).not.toBeInTheDocument()

    fireEvent.click(within(panel).getByRole('button', { name: 'react 2' }))
    expect(screen.getByText('Note A')).toBeInTheDocument()
    expect(screen.queryByText('Note B')).not.toBeInTheDocument()
    expect(screen.queryByText('Note C')).not.toBeInTheDocument()

    // Removing the selected pills clears the intersection back to everything.
    const selected = screen.getByTestId('memory-tags-filter-selected')
    fireEvent.click(within(selected).getByRole('button', { name: 'esp32' }))
    fireEvent.click(within(selected).getByRole('button', { name: 'react' }))
    expect(screen.getByText('Note A')).toBeInTheDocument()
    expect(screen.getByText('Note B')).toBeInTheDocument()
    expect(screen.getByText('Note C')).toBeInTheDocument()
  })

  it('shows an empty state when the tag search matches nothing', () => {
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
          id: 'united-memory:tagged-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Tagged note',
          summary: 'one tag',
          tags: ['ops'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\tagged-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'tagged'
        }
      ]
    }

    render(<MemoryView />)

    fireEvent.change(screen.getByTestId('memory-tags-filter-search'), { target: { value: 'zzz' } })

    const panel = screen.getByTestId('memory-tags-filter-panel')
    expect(within(panel).getByText('No matching tags')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'ops 1' })).not.toBeInTheDocument()
  })

  it('virtualizes large memory lists without a redundant source jump rail', () => {
    memoryState.result = {
      sources: [
        {
          id: 'united-memory',
          label: 'United Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.united-memory',
          noteCount: 40
        },
        {
          id: 'claude-native',
          label: 'Claude Memory',
          available: true,
          rootPath: 'C:\\Users\\test\\.claude',
          noteCount: 40
        }
      ],
      notes: Array.from({ length: 80 }, (_, index) => ({
        id: `${index < 40 ? 'united-memory' : 'claude-native'}:note-${index}`,
        sourceId: index < 40 ? 'united-memory' : 'claude-native',
        sourceLabel: index < 40 ? 'United Memory' : 'Claude Memory',
        title: `Memory note ${index}`,
        summary: `Summary ${index}`,
        tags: ['ops'],
        importance: 'active',
        path: `C:\\Users\\test\\.memory\\note-${index}.md`,
        links: [],
        createdAt: null,
        updatedAt: new Date(Date.UTC(2026, 5, 3, 0, 0, index)).toISOString(),
        body: `Body ${index}`
      }))
    }

    render(<MemoryView />)

    expect(screen.getByText('Memory note 79')).toBeInTheDocument()
    expect(screen.queryByText('Memory note 0')).not.toBeInTheDocument()
    expect(screen.getAllByTestId(/memory-note-card-/)).toHaveLength(memoryVirtuosoMock.visibleLimit)

    // The left source jump rail is removed — the top source filter already
    // covers per-source navigation, so the rail was pure redundancy.
    expect(screen.queryByTestId('memory-category-jump-nav')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Memory groups' })).not.toBeInTheDocument()
  })

  it('opens memory note content through the shared file viewer', async () => {
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
          id: 'united-memory:raw-note',
          sourceId: 'united-memory',
          sourceLabel: 'United Memory',
          title: 'Raw note',
          summary: 'Body',
          tags: ['ops'],
          importance: 'active',
          path: 'C:\\Users\\test\\.united-memory\\mem\\raw-note.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          body: 'Raw memory body'
        }
      ]
    }

    render(
      <>
        <MemoryView />
        <InspectorDrawer />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: /Raw note/ }))
    fireEvent.click(screen.getByRole('button', { name: 'View Raw' }))

    const dialog = await screen.findByRole('dialog', { name: 'View Raw' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Raw memory body')).toBeInTheDocument()
  })

  it('moves memory search to top navigation and focuses it with the shortcut', () => {
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

    render(
      <MemoryRouter initialEntries={['/instructions/memories']}>
        <PageChromeProvider>
          <TopNavigation isWindows={false} />
          <MemoryView />
          <SearchDialog />
        </PageChromeProvider>
      </MemoryRouter>
    )

    const pageSearch = screen.getByRole('textbox', { name: 'Search memories...' })
    expect(screen.getAllByPlaceholderText('Search memories...')).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(pageSearch).toHaveFocus()

    fireEvent.change(pageSearch, { target: { value: 'core' } })

    expect(screen.getByText('Core note')).toBeInTheDocument()
    expect(screen.queryByText('Archive note')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /Search assets/ })).not.toBeInTheDocument()
  })

  it('uses Chinese copy for missing notes and memory filters', async () => {
    await i18n.changeLanguage('zh')

    render(<MemoryView />)

    expect(screen.getByText('文件缺失')).toBeInTheDocument()
    expectImportanceBadge('活跃', '活跃 — 相关时按需加载')
    expect(screen.queryByText('active')).not.toBeInTheDocument()
    expect(screen.getByText('记忆类型')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全部类型' })).toBeInTheDocument()
    expect(screen.getByText('标签')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全部标签' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('筛选标签…')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Missing note/ }))

    expect(screen.getByText('索引中的记忆文件已不在磁盘上。')).toBeInTheDocument()
    expect(screen.queryByText('File missing')).not.toBeInTheDocument()
    expect(screen.queryByText('The indexed note file is missing on disk.')).not.toBeInTheDocument()
  })
})
