import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// GH-138 B1 spike: 实证 @dnd-kit 在 React 19 下可挂载 — useSortable 走 setNodeRef (ref-based,
// 无 react-draggable 的 findDOMNode), 这是放弃 react-grid-layout 选 dnd-kit 的兼容前提。
// 兼作回归守卫: React/dnd-kit 升级若破坏挂载, 此测试先红。

function SortableItem({ id }: { id: string }): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid={`item-${id}`}
      {...attributes}
      {...listeners}
    >
      {id}
    </li>
  )
}

describe('@dnd-kit smoke (React 19 compatibility)', () => {
  it('mounts DndContext + SortableContext + useSortable without runtime errors', () => {
    const ids = ['alpha', 'beta', 'gamma']
    const { getByTestId } = render(
      <DndContext>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <ul>
            {ids.map((id) => (
              <SortableItem key={id} id={id} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    )

    expect(getByTestId('item-alpha')).toBeTruthy()
    expect(getByTestId('item-gamma')).toBeTruthy()
    // useSortable 应用 sortable 语义 (ref-based 绑定成功的旁证)
    expect(getByTestId('item-beta').getAttribute('aria-roledescription')).toBe('sortable')
  })
})
