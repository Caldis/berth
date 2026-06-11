import { fireEvent, render, screen, within } from '@testing-library/react'
import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import type { SessionReplayEventKind } from '@shared/types/ipc'
import { ReplayKindFilter } from '../../src/renderer/src/components/sessions/replay-kind-filter'
import { REPLAY_KINDS } from '../../src/renderer/src/lib/replay-model'

// GH-120 AC2: 筛选器选项 = [Check 槽 | kind 图标(主题色) | 名称 | 计数], Check 在行首而非行尾。

const COUNTS = new Map<SessionReplayEventKind, number>(REPLAY_KINDS.map((kind, i) => [kind, i + 1]))

function openListbox(): Promise<HTMLElement> {
  fireEvent.click(screen.getByTestId('replay-kind-filter'))
  return screen.findByRole('listbox', { name: 'Event types' })
}

describe('ReplayKindFilter', () => {
  it('renders one option per kind with a leading check slot, themed icon and count', async () => {
    render(<ReplayKindFilter selected={new Set(['user'])} counts={COUNTS} onChange={() => {}} />)
    const listbox = await openListbox()
    const options = within(listbox).getAllByRole('option')
    expect(options).toHaveLength(REPLAY_KINDS.length)

    const userOption = within(listbox).getByRole('option', { name: /User/ })
    const checkSlot = within(userOption).getByTestId('replay-kind-check-user')
    // Check 槽是选项内容的第一个元素 (左侧), 选中态内含勾形 svg
    expect(checkSlot.parentElement?.firstElementChild).toBe(checkSlot)
    expect(checkSlot.querySelector('svg')).not.toBeNull()
    // 未选中 kind 的槽保留占位但无勾
    const toolSlot = within(listbox).getByTestId('replay-kind-check-tool')
    expect(toolSlot.querySelector('svg')).toBeNull()
    // 图标继承 kind 主题色
    expect(userOption.innerHTML).toContain('text-replay-user')
    // 计数渲染 (user 是 REPLAY_KINDS[0] → count 1)
    expect(within(userOption).getByText('1')).toBeInTheDocument()
    // HeroUI 默认行尾 selectedIcon 被隐藏: 选项内不再有第二个勾
    expect(userOption.querySelectorAll('svg')).toHaveLength(2) // check + kind icon
  })

  it('emits the new kind set on toggle and null when none remain', async () => {
    const onChange = vi.fn()
    function Harness(): React.ReactElement {
      const [selected, setSelected] = useState<ReadonlySet<SessionReplayEventKind> | null>(null)
      return (
        <ReplayKindFilter
          selected={selected}
          counts={COUNTS}
          onChange={(next) => {
            onChange(next)
            setSelected(next)
          }}
        />
      )
    }
    render(<Harness />)
    // multiple 模式下选择不关闭弹层 — 全程在同一 listbox 内操作,
    // 重复点 trigger 反而会先关闭弹层 (CI Linux/macOS 上时序必败)。
    const listbox = await openListbox()
    fireEvent.click(within(listbox).getByRole('option', { name: /User/ }))
    expect(onChange).toHaveBeenLastCalledWith(new Set(['user']))

    fireEvent.click(within(listbox).getByRole('option', { name: /User/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('summarizes the trigger value: placeholder for all, names for few, count for many', async () => {
    const { rerender } = render(<ReplayKindFilter selected={null} counts={COUNTS} onChange={() => {}} />)
    expect(screen.getByTestId('replay-kind-filter').textContent).toContain('All events')

    rerender(<ReplayKindFilter selected={new Set(['user', 'tool'])} counts={COUNTS} onChange={() => {}} />)
    const trigger = screen.getByTestId('replay-kind-filter')
    expect(trigger.textContent).toContain('User')
    expect(trigger.textContent).toContain('Tool')

    rerender(
      <ReplayKindFilter selected={new Set(['user', 'tool', 'model'])} counts={COUNTS} onChange={() => {}} />
    )
    expect(screen.getByTestId('replay-kind-filter').textContent).toContain('3')
  })
})
