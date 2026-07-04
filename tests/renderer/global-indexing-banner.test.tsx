import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import '../../src/renderer/src/i18n'
import type { BackgroundIndexStatus } from '@shared/types/ipc'
import type { AppScopeSelection } from '@shared/scope'
import { useAppStore } from '@/stores/app'
import { GlobalIndexingBanner } from '@/components/shared/global-indexing-banner'

function setState(scope: AppScopeSelection, backgroundIndex?: BackgroundIndexStatus): void {
  useAppStore.setState({
    scopeSelection: scope,
    assetRuntimeStatus: { state: 'ready', stale: false, backgroundIndex }
  })
}

beforeEach(() => {
  setState({ mode: 'global' }, undefined)
})

describe('GlobalIndexingBanner (GH-155 决策⑤)', () => {
  it('shows N/M while the initial round is indexing in global scope', () => {
    setState({ mode: 'global' }, { state: 'indexing', indexedProjects: 2, totalProjects: 5 })
    render(<GlobalIndexingBanner />)
    expect(screen.getByTestId('global-indexing-banner')).toBeInTheDocument()
    expect(screen.getByText('Indexed 2/5 projects')).toBeInTheDocument()
    // Raw i18n keys must never leak (friction 20260615-i18n-raw-key-leak).
    expect(screen.queryByText(/nav\.scanStatus\./)).not.toBeInTheDocument()
  })

  it.each<[string, BackgroundIndexStatus | undefined]>([
    ['done (完成后消失)', { state: 'done', indexedProjects: 5, totalProjects: 5 }],
    ['revalidating (静默复核)', { state: 'revalidating', indexedProjects: 5, totalProjects: 5 }],
    ['unsupported', { state: 'unsupported', indexedProjects: 0, totalProjects: 0 }],
    ['absent (queue idle)', undefined],
    ['M=0', { state: 'indexing', indexedProjects: 0, totalProjects: 0 }]
  ])('renders nothing for %s', (_label, backgroundIndex) => {
    setState({ mode: 'global' }, backgroundIndex)
    render(<GlobalIndexingBanner />)
    expect(screen.queryByTestId('global-indexing-banner')).not.toBeInTheDocument()
  })

  it.each<[string, AppScopeSelection]>([
    ['user scope', { mode: 'user' }],
    ['project scope', { mode: 'project', projectPath: '/repo/x', projectPathKey: '/repo/x' }]
  ])('renders nothing outside global scope (%s)', (_label, scope) => {
    setState(scope, { state: 'indexing', indexedProjects: 1, totalProjects: 3 })
    render(<GlobalIndexingBanner />)
    expect(screen.queryByTestId('global-indexing-banner')).not.toBeInTheDocument()
  })
})
