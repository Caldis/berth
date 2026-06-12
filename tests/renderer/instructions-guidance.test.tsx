import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Instructions } from '../../src/renderer/src/pages/instructions'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '@shared/types/asset'
import { resetMemoryCacheForTests } from '../../src/renderer/src/hooks/use-memory'

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

const instructionsVirtuosoMock = vi.hoisted(() => ({
  visibleLimit: 25,
  props: undefined as MockGroupedVirtuosoProps | undefined,
  scrollToIndex: vi.fn()
}))

vi.mock('react-virtuoso', async () => {
  const ReactModule = await import('react')

  const GroupedVirtuoso = ReactModule.forwardRef<MockGroupedVirtuosoHandle, MockGroupedVirtuosoProps>(function MockGroupedVirtuoso(props, ref) {
    instructionsVirtuosoMock.props = props
    ReactModule.useImperativeHandle(ref, () => ({
      scrollToIndex: instructionsVirtuosoMock.scrollToIndex
    }))

    const nodes: React.ReactNode[] = []
    let itemIndex = 0
    let listIndex = 0
    let renderedRows = 0

    for (let groupIndex = 0; groupIndex < props.groupCounts.length; groupIndex += 1) {
      nodes.push(
        ReactModule.createElement(
          'div',
          { key: `group-${groupIndex}`, 'data-testid': `instructions-virtual-group-${groupIndex}` },
          props.groupContent(groupIndex, props.context)
        )
      )
      listIndex += 1

      for (let offset = 0; offset < props.groupCounts[groupIndex]; offset += 1) {
        const item = props.data?.[listIndex]
        const key = props.computeItemKey(listIndex, item, props.context)
        if (renderedRows < instructionsVirtuosoMock.visibleLimit) {
          nodes.push(
            ReactModule.createElement(
              'div',
              { key, 'data-testid': `instructions-virtual-row-${key}` },
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
      { 'data-testid': props['data-testid'] ?? 'instructions-mock-virtuoso' },
      nodes
    )
  })

  return { GroupedVirtuoso }
})

function skillAsset(id: string, scope: Asset['scope'], path: string, projectPath?: string): Asset {
  return {
    id,
    agentId: 'codex',
    category: 'instruction',
    type: 'skill',
    scope,
    name: id,
    path,
    meta: {
      description: `${id} description`,
      // Cross-project assets carry an explicit owner under the GH-113 T3 model.
      ...(projectPath ? { projectPath } : {})
    }
  }
}

describe('Instructions guidance surfaces', () => {
  beforeEach(() => {
    resetMemoryCacheForTests()
    useAppStore.setState({
      assets: [],
      scopeSelection: { mode: 'global' },
      assetRuntimeStatus: { ...useAppStore.getState().assetRuntimeStatus, state: 'ready' }
    })
    window.api.memory = {
      list: vi.fn(async () => ({ notes: [], sources: [] })),
      get: vi.fn(async () => null)
    }
    instructionsVirtuosoMock.scrollToIndex.mockClear()
  })

  it('shows a skeleton (not a misleading empty) when the skills tab is empty mid-scan (GH-113 A4)', () => {
    // Partial scan: a hook已到达 but the skills category hasn't been reached yet.
    useAppStore.setState({
      assets: [
        { id: 'h1', agentId: 'codex', category: 'capability', type: 'hook', scope: 'user', name: 'Stop', path: '/x/config.toml', meta: {} }
      ],
      assetRuntimeStatus: { ...useAppStore.getState().assetRuntimeStatus, state: 'scanning' }
    })
    render(
      <MemoryRouter initialEntries={['/instructions/skills']}>
        <PageChromeProvider>
          <Instructions activeSection="skills" />
        </PageChromeProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/Scanning/)).toBeTruthy()
  })

  it('shows a feature guide for the Memories tab before the memory list', async () => {
    render(
      <MemoryRouter initialEntries={['/instructions/memories']}>
        <PageChromeProvider>
          <TopNavigation isWindows={false} />
          <Instructions activeSection="memories" />
        </PageChromeProvider>
      </MemoryRouter>
    )

    await screen.findByRole('button', { name: 'Page guide' })
    fireEvent.mouseEnter(screen.getByTestId('page-guide-hover-region'))
    expect(await screen.findByText('Memory notes across sources')).toBeInTheDocument()
    expect(screen.getByText(/Berth groups native memory files and durable local notes/)).toBeInTheDocument()
    expect(screen.queryByText('Source types')).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId('page-guide-panel')).getByText('Details'))
    expect(screen.getByText('Source types')).toBeInTheDocument()
    expect(screen.queryByText('instructions.guidance.memories.insights.sources.title')).not.toBeInTheDocument()
  })

  it('uses an instructive memory empty state when no sources are found', async () => {
    render(<MemoryRouter><Instructions activeSection="memories" /></MemoryRouter>)

    expect(await screen.findByText('No memory sources found')).toBeInTheDocument()
    expect(screen.getByText(/Berth looks for native Claude Code memory and united-memory/)).toBeInTheDocument()
  })

  it('filters instruction assets by selected project scope', async () => {
    useAppStore.setState({
      scopeSelection: {
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      },
      assets: [
        skillAsset('User skill', 'user', 'C:/Users/mail/.codex/skills/user/SKILL.md'),
        skillAsset('Project skill', 'project', 'D:/Code/berth/.agents/skills/project/SKILL.md'),
        skillAsset('Other project skill', 'project', 'D:/Code/other/.agents/skills/project/SKILL.md', 'D:/Code/other')
      ],
    })

    render(<MemoryRouter><Instructions /></MemoryRouter>)

    expect(await screen.findByText('Project skill')).toBeInTheDocument()
    expect(screen.getByText('User skill')).toBeInTheDocument()
    expect(screen.queryByText('Other project skill')).not.toBeInTheDocument()
  })

  it('moves instruction search into the top navigation and filters scope via top chips', async () => {
    useAppStore.setState({
      assets: [
        skillAsset('User skill', 'user', 'C:/Users/mail/.codex/skills/user/SKILL.md'),
        skillAsset('Project skill', 'project', 'D:/Code/berth/.agents/skills/project/SKILL.md')
      ],
      scopeSelection: { mode: 'global' }
    })

    render(
      <MemoryRouter initialEntries={['/instructions/skills']}>
        <PageChromeProvider>
          <TopNavigation isWindows={false} />
          <Instructions activeSection="skills" />
        </PageChromeProvider>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Skills' })).toBeInTheDocument()
    const pageSearch = screen.getByRole('textbox', { name: 'Filter Skills...' })
    expect(screen.getAllByPlaceholderText('Filter Skills...')).toHaveLength(1)

    fireEvent.change(pageSearch, { target: { value: 'Project' } })

    expect(screen.queryByText('User skill')).not.toBeInTheDocument()
    expect(screen.getByText('Project skill')).toBeInTheDocument()

    const scopeFilter = screen.getByTestId('instructions-scope-filter')
    fireEvent.click(within(scopeFilter).getByRole('button', { name: 'User 1' }))

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.queryByText('Project skill')).not.toBeInTheDocument()
  })

  it('virtualizes large skill lists without a redundant scope jump rail', async () => {
    useAppStore.setState({
      assets: Array.from({ length: 80 }, (_, index) =>
        skillAsset(
          `Skill ${index}`,
          index < 40 ? 'user' : 'project',
          index < 40
            ? `C:/Users/mail/.codex/skills/skill-${index}/SKILL.md`
            : `D:/Code/berth/.agents/skills/skill-${index}/SKILL.md`
        )
      ),
      scopeSelection: { mode: 'global' }
    })

    render(
      <MemoryRouter initialEntries={['/instructions/skills']}>
        <PageChromeProvider>
          <TopNavigation isWindows={false} />
          <Instructions activeSection="skills" />
        </PageChromeProvider>
      </MemoryRouter>
    )

    expect(await screen.findByText('Skill 0')).toBeInTheDocument()
    expect(screen.queryByText('Skill 79')).not.toBeInTheDocument()
    expect(screen.getAllByTestId(/instruction-asset-card-/)).toHaveLength(instructionsVirtuosoMock.visibleLimit)

    // The left scope jump rail is removed — top scope chips already cover it.
    expect(screen.queryByTestId('instructions-category-jump-nav')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Instruction groups' })).not.toBeInTheDocument()
    expect(screen.getByTestId('instructions-scope-filter')).toBeInTheDocument()
  })
})
