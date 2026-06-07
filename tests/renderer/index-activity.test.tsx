import { render, screen, renderHook } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import '../../src/renderer/src/i18n'
import type { Asset } from '@shared/types/asset'
import type { AssetRuntimeStatus } from '@shared/types/ipc'
import { useAppStore } from '@/stores/app'
import { useIndexActivity } from '@/hooks/use-index-activity'
import { IndexHairline, IndexingInline } from '@/components/shared/index-activity'

function asset(id: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: id,
    path: `/x/${id}`,
    meta: {}
  }
}

function setStatus(status: Partial<AssetRuntimeStatus>, assets: Asset[] = []): void {
  useAppStore.setState({
    assetRuntimeStatus: { state: 'idle', stale: false, ...status },
    assets,
    assetErrors: []
  })
}

beforeEach(() => {
  setStatus({ state: 'idle' })
})

describe('useIndexActivity', () => {
  it('is inactive when idle/ready', () => {
    setStatus({ state: 'ready' }, [asset('a')])
    const { result } = renderHook(() => useIndexActivity())
    expect(result.current.active).toBe(false)
    expect(result.current.scanned).toBe(1)
  })

  it('is determinate only during the parsing phase with a known total', () => {
    setStatus({ state: 'scanning', progress: { phase: 'parsing', current: 30, total: 120 } }, [asset('a')])
    const { result } = renderHook(() => useIndexActivity())
    expect(result.current.active).toBe(true)
    expect(result.current.determinate).toBe(true)
    expect(result.current.pct).toBe(25)
  })

  it('sweeps indeterminately for non-parsing phases', () => {
    setStatus({ state: 'scanning', progress: { phase: 'discovering', current: 0, total: 0 } })
    const { result } = renderHook(() => useIndexActivity())
    expect(result.current.active).toBe(true)
    expect(result.current.determinate).toBe(false)
    expect(result.current.pct).toBe(0)
  })
})

describe('IndexingInline', () => {
  it('renders a live count while indexing and nothing when idle', () => {
    setStatus({ state: 'scanning', progress: { phase: 'parsing', current: 2, total: 10 } }, [asset('a'), asset('b')])
    const { rerender } = render(<IndexingInline />)
    expect(screen.getByTestId('indexing-inline')).toBeInTheDocument()
    expect(screen.getByTestId('indexing-inline').textContent).toMatch(/2/)

    setStatus({ state: 'ready' }, [asset('a')])
    rerender(<IndexingInline />)
    expect(screen.queryByTestId('indexing-inline')).not.toBeInTheDocument()
  })
})

describe('IndexHairline', () => {
  it('fills to the parse percentage when determinate', () => {
    setStatus({ state: 'scanning', progress: { phase: 'parsing', current: 1, total: 4 } })
    const { container } = render(<IndexHairline />)
    const fill = container.querySelector('[style*="width"]') as HTMLElement | null
    expect(fill?.style.width).toBe('25%')
  })

  it('fades out (opacity-0) when idle', () => {
    setStatus({ state: 'idle' })
    const { container } = render(<IndexHairline />)
    expect(container.firstElementChild?.className).toContain('opacity-0')
  })
})
