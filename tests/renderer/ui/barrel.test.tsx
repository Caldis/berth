import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import * as UI from '@/components/ui'
import { Button, Card, CardBody, Chip } from '@/components/ui'

/**
 * P3 (GH-105): the shared ui/ barrel is the single import surface for DS
 * primitives. Verify the key exports resolve and render under HeroUIProvider.
 */
describe('components/ui barrel', () => {
  it('exposes the primitives pages depend on', () => {
    for (const name of [
      'Button',
      'Card',
      'CardHeader',
      'CardBody',
      'Input',
      'Select',
      'SelectItem',
      'FilterSelect',
      'Tabs',
      'Tab',
      'Switch',
      'Slider',
      'Modal',
      'Drawer',
      'Dropdown',
      'Popover',
      'Tooltip',
      'Chip',
      'Avatar',
      'Accordion',
      'AccordionItem',
      'Skeleton',
      'Spinner',
      'Listbox',
      'Kbd',
      'Alert',
      'Collapsible',
      'CollapsibleChevron',
      'useDisclosure'
    ]) {
      expect(UI[name as keyof typeof UI], `missing export: ${name}`).toBeDefined()
    }
    expect(UI.MOTION.durationMs.base).toBe(200)
  })

  it('renders Button + Card + Chip from the barrel', () => {
    render(
      <HeroUIProvider>
        <Card data-testid="card">
          <CardBody>
            <Button color="primary" data-testid="btn">
              Go
            </Button>
            <Chip tone="success" data-testid="chip">
              Active
            </Chip>
          </CardBody>
        </Card>
      </HeroUIProvider>
    )
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('btn')).toHaveTextContent('Go')
    expect(screen.getByTestId('chip')).toHaveTextContent('Active')
  })
})
