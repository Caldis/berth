import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { TokenSparkBar } from '@/components/sessions/token-spark-bar'
import { normalizeTokenUsage } from '@shared/token-usage'

const breakdown = normalizeTokenUsage({
  inputTokens: 10,
  outputTokens: 5,
  cacheReadInputTokens: 20,
  cacheCreationInputTokens: 3
})

describe('TokenSparkBar', () => {
  it('renders the total token count with its unit', () => {
    render(<TokenSparkBar usage={breakdown} />)
    expect(screen.getByText('38 tok')).toBeInTheDocument()
  })

  it('renders one width-styled segment per visible token category', () => {
    render(<TokenSparkBar usage={breakdown} />)
    const bar = screen.getByTestId('token-spark-bar-segments')
    // input + output + cache (read+write merged) = 3 visible segments
    expect(bar.children).toHaveLength(3)
    Array.from(bar.children).forEach((child) => {
      expect((child as HTMLElement).style.width).toMatch(/%$/)
    })
  })

  it('exposes the input/output breakdown through an accessible label', () => {
    render(<TokenSparkBar usage={normalizeTokenUsage({ inputTokens: 10, outputTokens: 5 })} />)
    const el = screen.getByLabelText(/Input 10/)
    expect(el).toHaveAccessibleName(/Output 5/)
  })

  it('shows only the total and no bar when there are no token segments', () => {
    render(<TokenSparkBar usage={normalizeTokenUsage({})} />)
    expect(screen.getByText('0 tok')).toBeInTheDocument()
    expect(screen.queryByTestId('token-spark-bar-segments')).not.toBeInTheDocument()
  })
})
