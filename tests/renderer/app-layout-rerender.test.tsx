import { act, render, screen, waitFor } from '@testing-library/react'
import React, { Profiler } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { AppLayout } from '../../src/renderer/src/components/layout/app-layout'
import { IDLE_ASSET_RUNTIME_STATUS, useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '@shared/types/asset'

// GH-153 T8: AppLayout 只需要 "有没有资产" 这一个布尔 — 扫描期 progress tick (状态对象/
// 资产数组每 tick 新引用) 不得再触发布局壳重渲染。把会自行订阅 store 的 chrome 子组件
// 全部 stub 掉, Profiler 的 commit 即等价于 AppLayout 本体重渲染。
vi.mock('../../src/renderer/src/components/layout/sidebar', () => ({
  Sidebar: () => <div data-testid="stub-sidebar" />
}))
vi.mock('../../src/renderer/src/components/layout/top-navigation', () => ({
  TopNavigation: () => <div data-testid="stub-top-navigation" />
}))
vi.mock('../../src/renderer/src/components/layout/search-dialog', () => ({
  SearchDialog: () => null
}))
vi.mock('../../src/renderer/src/components/layout/inspector-drawer', () => ({
  InspectorDrawer: () => null
}))
vi.mock('../../src/renderer/src/components/layout/window-controls', () => ({
  WindowControls: () => null
}))
vi.mock('../../src/renderer/src/components/shared/index-activity', () => ({
  IndexHairline: () => null
}))

function asset(id: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: id,
    path: `/tmp/${id}.md`,
    meta: {}
  }
}

const emptyStats = { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 }

describe('AppLayout render isolation (GH-153 T8)', () => {
  beforeEach(async () => {
    // useTranslation 的 languageChanged/loaded 事件会重渲染 AppLayout — 先让 i18n 落定,
    // 否则事件落进 act 窗口污染 commit 计数。
    await i18n.changeLanguage('en')
    useAppStore.setState({
      assets: [asset('a1')],
      stats: { ...emptyStats, skills: 1 },
      assetRuntimeStatus: { state: 'ready', stale: false },
      assetSnapshotId: 'snap-1',
      assetErrors: []
    })
    window.api.assets.status = vi.fn(async () => ({ state: 'ready' as const, stale: false }))
    window.api.assets.snapshot = vi.fn(async () => ({
      id: 'snap-1',
      assets: [asset('a1')],
      stats: { ...emptyStats, skills: 1 },
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'ready' as const, stale: false }
    }))
    window.api.assets.refresh = vi.fn(async () => ({ state: 'ready' as const, stale: false }))
  })

  it('does not re-render the layout shell on scan progress ticks', async () => {
    const commits: string[] = []

    render(
      <MemoryRouter initialEntries={['/']}>
        <Profiler id="layout" onRender={(_id, phase) => commits.push(phase)}>
          <AppLayout>
            <div data-testid="page-body" />
          </AppLayout>
        </Profiler>
      </MemoryRouter>
    )

    expect(screen.getByTestId('page-body')).toBeInTheDocument()
    // 等 bootstrap 落定 (status + snapshot 均已消费), 再取基线。
    await waitFor(() => {
      expect(window.api.assets.snapshot).toHaveBeenCalled()
    })
    await act(async () => {})
    await act(async () => {})
    const baseline = commits.length

    // 扫描 tick: 状态新对象 + 资产数组新引用, 但 "有资产" 布尔不变 → 布局壳零重渲染。
    act(() => {
      useAppStore.getState().applyAssetProgress({
        status: { state: 'scanning', reason: 'watcher', stale: false, progress: { phase: 'parsing', current: 1, total: 3 } },
        partial: { assets: [asset('a1'), asset('a2')], stats: { ...emptyStats, skills: 2 } }
      })
    })
    expect(commits.length).toBe(baseline)

    // 对照组: 空态布尔翻转必须触发重渲染 (探针有效性自证; 不钉具体次数 — React 对
    // useSyncExternalStore 翻转可能产生级联 update commit, 次数是实现细节)。
    act(() => {
      useAppStore.setState({ assets: [] })
    })
    expect(commits.length).toBeGreaterThan(baseline)
  })

  it('keeps idle-status writes from re-rendering the shell either', async () => {
    const commits: string[] = []

    render(
      <MemoryRouter initialEntries={['/']}>
        <Profiler id="layout" onRender={(_id, phase) => commits.push(phase)}>
          <AppLayout>
            <div data-testid="page-body" />
          </AppLayout>
        </Profiler>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(window.api.assets.snapshot).toHaveBeenCalled()
    })
    await act(async () => {})
    const baseline = commits.length

    act(() => {
      useAppStore.getState().setAssetRuntimeStatus({ ...IDLE_ASSET_RUNTIME_STATUS })
    })
    expect(commits.length).toBe(baseline)
  })
})
