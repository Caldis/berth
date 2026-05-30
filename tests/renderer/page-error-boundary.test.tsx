import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { PageErrorBoundary } from '../../src/renderer/src/components/layout/page-error-boundary'

let shouldThrow = true

function MaybeBroken(): React.ReactElement {
  if (shouldThrow) throw new Error('boom')
  return <div>Recovered page</div>
}

describe('PageErrorBoundary', () => {
  afterEach(() => {
    shouldThrow = true
    vi.restoreAllMocks()
  })

  it('renders a retryable fallback when a page throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PageErrorBoundary titleKey="usage.pageErrorTitle" bodyKey="usage.pageErrorBody">
        <MaybeBroken />
      </PageErrorBoundary>
    )

    expect(screen.getByText('Usage page failed')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByText('Recovered page')).toBeInTheDocument()
  })
})
