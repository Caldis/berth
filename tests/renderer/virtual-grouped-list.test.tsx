import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '../../src/renderer/src/components/shared/virtual-grouped-list'

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

const virtuosoMock = vi.hoisted(() => ({
  props: undefined as MockGroupedVirtuosoProps | undefined,
  scrollToIndex: vi.fn()
}))

vi.mock('react-virtuoso', async () => {
  const ReactModule = await import('react')

  const GroupedVirtuoso = ReactModule.forwardRef<MockGroupedVirtuosoHandle, MockGroupedVirtuosoProps>(function MockGroupedVirtuoso(props, ref) {
    virtuosoMock.props = props
    ReactModule.useImperativeHandle(ref, () => ({
      scrollToIndex: virtuosoMock.scrollToIndex
    }))

    const nodes: React.ReactNode[] = []
    let itemIndex = 0
    let listIndex = 0

    for (let groupIndex = 0; groupIndex < props.groupCounts.length; groupIndex += 1) {
      nodes.push(
        ReactModule.createElement(
          'div',
          { key: `group-${groupIndex}`, 'data-testid': `group-${groupIndex}` },
          props.groupContent(groupIndex, props.context)
        )
      )
      listIndex += 1

      for (let offset = 0; offset < props.groupCounts[groupIndex]; offset += 1) {
        const item = props.data?.[listIndex]
        const key = props.computeItemKey(listIndex, item, props.context)
        nodes.push(
          ReactModule.createElement(
            'div',
            { key, 'data-testid': `row-${key}` },
            props.itemContent(itemIndex, groupIndex, item, props.context)
          )
        )
        itemIndex += 1
        listIndex += 1
      }
    }

    return ReactModule.createElement(
      'div',
      { 'data-testid': props['data-testid'] ?? 'mock-virtuoso' },
      nodes
    )
  })

  return { GroupedVirtuoso }
})

type TestItem = {
  id: string
  title: string
}

const groups = [
  {
    id: 'alpha',
    label: 'Alpha',
    count: 2,
    items: [
      { id: 'a-1', title: 'Alpha one' },
      { id: 'a-2', title: 'Alpha two' }
    ]
  },
  {
    id: 'beta',
    label: 'Beta',
    count: 1,
    items: [{ id: 'b-1', title: 'Beta one' }]
  }
]

describe('VirtualGroupedList', () => {
  beforeEach(() => {
    virtuosoMock.props = undefined
    virtuosoMock.scrollToIndex.mockClear()
  })

  it('passes stable group counts and business keys to GroupedVirtuoso', () => {
    render(
      <VirtualGroupedList<TestItem>
        groups={groups}
        getItemKey={(item) => item.id}
        renderGroup={(group) => <h2>{group.label}</h2>}
        renderItem={(item, context) => (
          <article
            data-testid={`article-${item.id}`}
            data-group-index={context.groupIndex}
            data-group-item-index={context.groupItemIndex}
            data-first={context.isFirstInGroup ? 'true' : 'false'}
            data-last={context.isLastInGroup ? 'true' : 'false'}
          >
            {item.title}
          </article>
        )}
        testId="test-list"
      />
    )

    expect(virtuosoMock.props.groupCounts).toEqual([2, 1])
    expect(virtuosoMock.props.data).toBeUndefined()
    expect(screen.getByTestId('group-0')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('group-1')).toHaveTextContent('Beta')
    expect(screen.getByTestId('row-a-1')).toHaveTextContent('Alpha one')
    expect(screen.getByTestId('row-a-2')).toHaveTextContent('Alpha two')
    expect(screen.getByTestId('row-b-1')).toHaveTextContent('Beta one')
    expect(screen.getByTestId('article-a-1')).toHaveAttribute('data-first', 'true')
    expect(screen.getByTestId('article-a-1')).toHaveAttribute('data-last', 'false')
    expect(screen.getByTestId('article-a-2')).toHaveAttribute('data-group-item-index', '1')
    expect(screen.getByTestId('article-a-2')).toHaveAttribute('data-last', 'true')
    expect(screen.getByTestId('article-b-1')).toHaveAttribute('data-group-index', '1')
    expect(screen.getByTestId('article-b-1')).toHaveAttribute('data-last', 'true')
  })

  it('reports the active group from visible item range', () => {
    const onActiveGroupChange = vi.fn()
    const onRangeChange = vi.fn()

    render(
      <VirtualGroupedList<TestItem>
        groups={groups}
        getItemKey={(item) => item.id}
        renderGroup={(group) => group.label}
        renderItem={(item) => item.title}
        onActiveGroupChange={onActiveGroupChange}
        onRangeChange={onRangeChange}
      />
    )

    act(() => {
      virtuosoMock.props.rangeChanged({ startIndex: 2, endIndex: 2 })
    })

    expect(onActiveGroupChange).toHaveBeenCalledWith('beta', 1)
    expect(onRangeChange).toHaveBeenCalledWith({
      startIndex: 2,
      endIndex: 2,
      startGroupId: 'beta',
      endGroupId: 'beta'
    })
  })

  it('exposes stable group and item navigation through the wrapper ref', () => {
    const ref = React.createRef<VirtualGroupedListHandle>()

    render(
      <VirtualGroupedList<TestItem>
        ref={ref}
        groups={groups}
        getItemKey={(item) => item.id}
        renderGroup={(group) => group.label}
        renderItem={(item) => item.title}
      />
    )

    act(() => {
      ref.current?.scrollToGroup('beta')
      ref.current?.scrollToItem('a-2', 'center')
    })

    expect(virtuosoMock.scrollToIndex).toHaveBeenNthCalledWith(1, {
      groupIndex: 1,
      align: 'start'
    })
    expect(virtuosoMock.scrollToIndex).toHaveBeenNthCalledWith(2, {
      index: 1,
      align: 'center'
    })
  })

  it('renders the empty state without mounting GroupedVirtuoso', () => {
    render(
      <VirtualGroupedList<TestItem>
        groups={[]}
        getItemKey={(item) => item.id}
        renderGroup={(group) => group.label}
        renderItem={(item) => item.title}
        emptyState={<p>No rows</p>}
      />
    )

    expect(screen.getByText('No rows')).toBeInTheDocument()
    expect(virtuosoMock.props).toBeUndefined()
  })
})
