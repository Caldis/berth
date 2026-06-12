import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import { FilterSelect, SelectItem } from '@/components/ui'

function renderFilterSelect(ui: React.ReactElement) {
  return render(<HeroUIProvider>{ui}</HeroUIProvider>)
}

describe('ui/FilterSelect', () => {
  it('applies the dense app filter trigger contract', () => {
    renderFilterSelect(
      <FilterSelect aria-label="Scope" selectedKeys={['all']} disallowEmptySelection>
        <SelectItem key="all">All scopes</SelectItem>
      </FilterSelect>
    )

    const trigger = screen.getByRole('button', { name: /Scope/ })
    expect(trigger.className).toContain('h-9')
    expect(trigger.className).toContain('min-h-9')
    expect(trigger.className).toContain('border-border')
    expect(trigger.className).toContain('bg-background')
  })

  it('keeps caller trigger classNames after the shared defaults', () => {
    renderFilterSelect(
      <FilterSelect
        aria-label="Model"
        selectedKeys={['gpt']}
        disallowEmptySelection
        classNames={{ trigger: 'w-48 data-[open=true]:border-primary' }}
      >
        <SelectItem key="gpt">gpt</SelectItem>
      </FilterSelect>
    )

    const trigger = screen.getByRole('button', { name: /Model/ })
    expect(trigger.className).toContain('h-9')
    expect(trigger.className).toContain('w-48')
    expect(trigger.className).toContain('data-[open=true]:border-primary')
  })
})
