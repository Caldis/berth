import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { ReplayKindChip, replayKindColorClasses } from '../../src/renderer/src/components/sessions/replay-kind-chip'
import { REPLAY_KINDS } from '../../src/renderer/src/lib/replay-model'

// GH-120 AC1: 每种事件 kind 有独立主题色 (text-replay-* 染色 class), 失败态保留 danger 语义。

describe('ReplayKindChip theme colors', () => {
  it.each(REPLAY_KINDS.map((kind) => [kind]))('binds the %s kind to its own replay color', (kind) => {
    const { container } = render(<ReplayKindChip event={{ kind, status: undefined }} />)
    expect(container.innerHTML).toContain(`text-replay-${kind}`)
  })

  it('keeps the danger override for failed tool/result events', () => {
    const { container } = render(<ReplayKindChip event={{ kind: 'tool', status: 'error' }} />)
    expect(container.innerHTML).not.toContain('text-replay-tool')
    expect(container.innerHTML).toContain('text-danger')
  })

  it('exposes per-kind classes for list/timeline/panel consumers', () => {
    expect(replayKindColorClasses('user', undefined).text).toBe('text-replay-user')
    expect(replayKindColorClasses('result', 'error').text).toBe('text-danger')
    expect(new Set(REPLAY_KINDS.map((kind) => replayKindColorClasses(kind, undefined).text)).size).toBe(
      REPLAY_KINDS.length
    )
  })

  it('renders the kind label', () => {
    render(<ReplayKindChip event={{ kind: 'user', status: undefined }} />)
    expect(screen.getByText('User')).toBeInTheDocument()
  })
})
