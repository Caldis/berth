import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from '../../src/renderer/src/components/shared/empty-state'
import { NoticePanel } from '../../src/renderer/src/components/shared/notice-panel'
import { WarningBanner } from '../../src/renderer/src/components/shared/warning-banner'
import { MessageSquare } from 'lucide-react'

describe('shared guidance primitives', () => {
  it('renders an instructive empty state with optional action', () => {
    const onClear = vi.fn()

    render(
      <EmptyState
        icon={MessageSquare}
        title="No sessions yet"
        description="Berth shows local agent conversations after they are scanned."
        action={<button onClick={onClear}>Reset filters</button>}
      />
    )

    expect(screen.getByText('No sessions yet')).toBeInTheDocument()
    expect(screen.getByText(/local agent conversations/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('keeps the old message-only empty state API working', () => {
    render(<EmptyState icon={MessageSquare} message="Nothing found" />)

    expect(screen.getByText('Nothing found')).toBeInTheDocument()
  })

  it('renders info and warning notices with the same structure', () => {
    render(
      <div>
        <NoticePanel tone="info" title="Local estimate" message="Provider billing may differ." />
        <NoticePanel tone="warning" title="Missing prices" message="Some models were not priced." />
      </div>
    )

    expect(screen.getByText('Local estimate')).toBeInTheDocument()
    expect(screen.getByText('Provider billing may differ.')).toBeInTheDocument()
    expect(screen.getByText('Missing prices')).toBeInTheDocument()
    expect(screen.getByText('Some models were not priced.')).toBeInTheDocument()
  })

  it('keeps WarningBanner as a destructive notice wrapper', () => {
    render(<WarningBanner title="Scan failed" message="Try again after checking local files." />)

    expect(screen.getByText('Scan failed')).toBeInTheDocument()
    expect(screen.getByText('Try again after checking local files.')).toBeInTheDocument()
  })
})
