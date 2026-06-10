import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroUIProvider } from '@heroui/react'
import { Sparkles } from 'lucide-react'
import { AssetCountChip } from '@/components/sessions/asset-count-chip'

function renderChip(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<HeroUIProvider>{ui}</HeroUIProvider>)
}

describe('AssetCountChip', () => {
  it('renders the count', () => {
    renderChip(<AssetCountChip icon={Sparkles} count={3} names={['a', 'b', 'c']} label="Skills" />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders nothing when count is zero', () => {
    const { container } = render(
      <AssetCountChip icon={Sparkles} count={0} names={[]} label="Skills" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('exposes names through an accessible label, truncated with overflow', () => {
    renderChip(
      <AssetCountChip
        icon={Sparkles}
        count={5}
        names={['a', 'b', 'c', 'd', 'e']}
        label="Skills"
        max={3}
      />
    )
    expect(screen.getByLabelText('Skills: a, b, c +2')).toBeInTheDocument()
  })

  it('lists every name when within the max', () => {
    renderChip(
      <AssetCountChip icon={Sparkles} count={2} names={['ctx', 'seatalk']} label="MCP" />
    )
    expect(screen.getByLabelText('MCP: ctx, seatalk')).toBeInTheDocument()
  })
})
