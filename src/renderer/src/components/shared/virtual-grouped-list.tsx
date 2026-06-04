import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react'
import {
  GroupedVirtuoso,
  type GroupedVirtuosoHandle,
  type ListRange
} from 'react-virtuoso'
import { useAppScrollParent } from '@/hooks/use-app-scroll-parent'
import { cn } from '@/lib/utils'
import {
  findVirtualGroupIndex,
  flattenVirtualGroups,
  virtualGroupCounts,
  visibleVirtualGroups,
  type VirtualListGroup,
  type VirtualListRange
} from '@/lib/virtual-list-model'

export interface VirtualGroupedListHandle {
  scrollToGroup: (groupId: string, align?: 'start' | 'center' | 'end') => void
  scrollToItem: (itemId: string, align?: 'start' | 'center' | 'end') => void
}

interface RenderItemContext<TItem> {
  index: number
  group: VirtualListGroup<TItem>
  groupIndex: number
}

interface VirtualGroupedListProps<TItem> {
  groups: readonly VirtualListGroup<TItem>[]
  getItemKey: (item: TItem) => string
  renderGroup: (group: VirtualListGroup<TItem>, groupIndex: number) => React.ReactNode
  renderItem: (item: TItem, context: RenderItemContext<TItem>) => React.ReactNode
  emptyState?: React.ReactNode
  onActiveGroupChange?: (groupId: string, groupIndex: number) => void
  onRangeChange?: (range: VirtualListRange) => void
  scrollParent?: HTMLElement | null
  overscan?: number | { main: number; reverse: number }
  defaultItemHeight?: number
  className?: string
  listClassName?: string
  testId?: string
}

function VirtualGroupedListInner<TItem>(
  {
    groups,
    getItemKey,
    renderGroup,
    renderItem,
    emptyState,
    onActiveGroupChange,
    onRangeChange,
    scrollParent,
    overscan = { main: 480, reverse: 240 },
    defaultItemHeight,
    className,
    listClassName,
    testId = 'virtual-grouped-list'
  }: VirtualGroupedListProps<TItem>,
  ref: React.ForwardedRef<VirtualGroupedListHandle>
): React.ReactElement {
  const appScrollParent = useAppScrollParent()
  const effectiveScrollParent = scrollParent === undefined ? appScrollParent : scrollParent
  const virtuosoRef = useRef<GroupedVirtuosoHandle | null>(null)
  const lastActiveGroupIdRef = useRef<string | undefined>(undefined)

  const visibleGroups = useMemo(() => visibleVirtualGroups(groups), [groups])
  const groupCounts = useMemo(() => virtualGroupCounts(visibleGroups), [visibleGroups])
  const flatItems = useMemo(() => flattenVirtualGroups(visibleGroups), [visibleGroups])
  const itemIndexByKey = useMemo(() => {
    const indexByKey = new Map<string, number>()
    flatItems.forEach((item, index) => {
      indexByKey.set(getItemKey(item), index)
    })
    return indexByKey
  }, [flatItems, getItemKey])

  const groupIndexById = useMemo(() => {
    const indexById = new Map<string, number>()
    visibleGroups.forEach((group, index) => {
      indexById.set(group.id, index)
    })
    return indexById
  }, [visibleGroups])

  useImperativeHandle(
    ref,
    () => ({
      scrollToGroup: (groupId, align = 'start') => {
        const groupIndex = groupIndexById.get(groupId)
        if (groupIndex == null) return
        virtuosoRef.current?.scrollToIndex({ groupIndex, align })
      },
      scrollToItem: (itemId, align = 'center') => {
        const index = itemIndexByKey.get(itemId)
        if (index == null) return
        virtuosoRef.current?.scrollToIndex({ index, align })
      }
    }),
    [groupIndexById, itemIndexByKey]
  )

  const emitRange = useCallback(
    (range: ListRange) => {
      const startGroupIndex = findVirtualGroupIndex(groupCounts, range.startIndex)
      const endGroupIndex = findVirtualGroupIndex(groupCounts, range.endIndex)
      const startGroup = visibleGroups[startGroupIndex]
      const endGroup = visibleGroups[endGroupIndex]

      onRangeChange?.({
        startIndex: range.startIndex,
        endIndex: range.endIndex,
        startGroupId: startGroup?.id,
        endGroupId: endGroup?.id
      })

      if (!startGroup || lastActiveGroupIdRef.current === startGroup.id) return
      lastActiveGroupIdRef.current = startGroup.id
      onActiveGroupChange?.(startGroup.id, startGroupIndex)
    },
    [groupCounts, onActiveGroupChange, onRangeChange, visibleGroups]
  )

  if (flatItems.length === 0) {
    return (
      <div data-testid={`${testId}-empty`} className={className}>
        {emptyState}
      </div>
    )
  }

  return (
    <div data-testid={testId} className={cn('min-h-0', className)}>
      <GroupedVirtuoso<TItem>
        ref={virtuosoRef}
        data={flatItems}
        groupCounts={groupCounts}
        customScrollParent={effectiveScrollParent ?? undefined}
        computeItemKey={(_index, item) => getItemKey(item)}
        groupContent={(groupIndex) => renderGroup(visibleGroups[groupIndex], groupIndex)}
        itemContent={(index, groupIndex, item) => {
          const group = visibleGroups[groupIndex]
          return renderItem(item, { index, group, groupIndex })
        }}
        rangeChanged={emitRange}
        overscan={overscan}
        defaultItemHeight={defaultItemHeight}
        data-testid={`${testId}-virtuoso`}
        className={cn(
          effectiveScrollParent ? 'min-h-0' : 'h-full min-h-[320px]',
          listClassName
        )}
      />
    </div>
  )
}

export const VirtualGroupedList = forwardRef(VirtualGroupedListInner) as <TItem>(
  props: VirtualGroupedListProps<TItem> & {
    ref?: React.ForwardedRef<VirtualGroupedListHandle>
  }
) => React.ReactElement

export type { VirtualGroupedListProps, RenderItemContext }
