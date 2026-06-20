import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { ExpandableAssetCard } from '../../src/renderer/src/components/shared/expandable-asset-card'
import { FOCUS_HIGHLIGHT_CLASS } from '../../src/renderer/src/hooks/use-focus-target'
import type { Asset } from '@shared/types/asset'

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'a1',
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: 'demo-asset',
    path: 'C:/x/demo',
    meta: {},
    ...overrides
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof ExpandableAssetCard>> = {}): void {
  const a = props.asset ?? asset()
  render(
    <MemoryRouter>
      <ExpandableAssetCard
        asset={a}
        testId={`instruction-asset-card-${a.id}`}
        detailId={`instruction-detail-${a.id}`}
        icon={<span data-testid="icon-slot" />}
        title={a.name}
        {...props}
      >
        <div data-testid="detail-child">detail body</div>
      </ExpandableAssetCard>
    </MemoryRouter>
  )
}

describe('ExpandableAssetCard (base scaffold)', () => {
  it('renders the outer testId, icon slot, title and scope badge in the collapsed header', () => {
    renderCard()
    const card = screen.getByTestId('instruction-asset-card-a1')
    expect(card).toBeInTheDocument()
    expect(within(card).getByTestId('icon-slot')).toBeInTheDocument()
    expect(within(card).getByText('demo-asset')).toBeInTheDocument()
    // ScopeBadge for the asset scope ('user') renders in the header.
    expect(within(card).getAllByText('User').length).toBeGreaterThan(0)
  })

  it('supports a cardId (id attr) instead of a testId for the outer element', () => {
    renderCard({ testId: undefined, cardId: 'mcp-card-a1' })
    expect(document.getElementById('mcp-card-a1')).not.toBeNull()
  })

  it('toggles the collapsible body via the header button + aria-expanded/aria-controls', () => {
    renderCard()
    const trigger = screen.getByRole('button', { name: /demo-asset/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'instruction-detail-a1')
    // unmountOnExit: collapsed → children not mounted.
    expect(screen.queryByTestId('detail-child')).toBeNull()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('detail-child')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('auto-expands when focused and applies the focus-highlight class', () => {
    renderCard({ focused: true })
    const card = screen.getByTestId('instruction-asset-card-a1')
    expect(card.className).toContain(FOCUS_HIGHLIGHT_CLASS.split(' ')[0])
    // focused → effect expands the body.
    expect(screen.getByTestId('detail-child')).toBeInTheDocument()
  })

  it('invokes onReveal when focused (used by the MCP card for scrollIntoView)', () => {
    const onReveal = vi.fn()
    renderCard({ focused: true, onReveal })
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('renders the plugin-origin badge slot when origin is provided', () => {
    renderCard({
      origin: { pluginId: 'plugin:acme/demo@1.0.0', pluginName: 'demo' }
    })
    expect(screen.getByTestId('plugin-origin-badge-plugin:acme/demo@1.0.0')).toBeInTheDocument()
  })

  it('omits the plugin-origin badge when no origin is provided', () => {
    renderCard()
    expect(screen.queryByTestId(/plugin-origin-badge-/)).toBeNull()
  })

  it('renders subtitle and headerMeta slots in the header', () => {
    renderCard({
      subtitle: <p data-testid="subtitle-slot">a subtitle</p>,
      headerMeta: <span data-testid="meta-slot">meta</span>
    })
    expect(screen.getByTestId('subtitle-slot')).toBeInTheDocument()
    expect(screen.getByTestId('meta-slot')).toBeInTheDocument()
  })

  it('renders the footer ViewRawButton and a ShowInExplorer button when showInExplorer set', () => {
    renderCard({ focused: true, showInExplorerLabel: 'Show in Explorer', viewRawLabel: 'View File' })
    // expanded body present (focused) → footer too.
    expect(screen.getByRole('button', { name: 'View File' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show in Explorer' })).toBeInTheDocument()
  })

  it('omits the ShowInExplorer button when no showInExplorerLabel (MCP footer)', () => {
    renderCard({ focused: true })
    // ViewRawButton still present (default label "View Raw").
    expect(screen.getByRole('button', { name: 'View Raw' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Explorer/ })).toBeNull()
  })
})
