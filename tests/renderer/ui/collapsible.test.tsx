import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Collapsible, CollapsibleChevron } from '../../../src/renderer/src/components/ui/collapsible'

describe('Collapsible', () => {
  it('open: grid-rows-[1fr] + opacity-100, not hidden/inert, carries id', () => {
    const { container } = render(
      <Collapsible open id="panel-1">
        body
      </Collapsible>
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('grid-rows-[1fr]')
    expect(root.className).toContain('opacity-100')
    expect(root.getAttribute('aria-hidden')).toBe('false')
    expect(root.hasAttribute('inert')).toBe(false)
    expect(root.id).toBe('panel-1')
  })

  it('closed: grid-rows-[0fr] + opacity-0, aria-hidden + inert', () => {
    const { container } = render(<Collapsible open={false}>body</Collapsible>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('grid-rows-[0fr]')
    expect(root.className).toContain('opacity-0')
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(root.hasAttribute('inert')).toBe(true)
  })

  it('is reduced-motion aware and transitions grid rows + opacity', () => {
    const { container } = render(<Collapsible open>body</Collapsible>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('transition-[grid-template-rows,opacity]')
    expect(root.className).toContain('motion-reduce:transition-none')
  })

  it('applies className to the inner content wrapper, not the grid root', () => {
    const { container, getByText } = render(
      <Collapsible open className="border-t px-4 py-3">
        body
      </Collapsible>
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toContain('border-t')
    expect(getByText('body').className).toContain('border-t')
    expect(getByText('body').className).toContain('px-4')
  })

  it('keeps children mounted while collapsed by default (grid clip hides them)', () => {
    const { queryByText } = render(<Collapsible open={false}>hello</Collapsible>)
    expect(queryByText('hello')).not.toBeNull()
  })

  describe('unmountOnExit', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('mounts children immediately on open', () => {
      const { queryByText } = render(
        <Collapsible open unmountOnExit>
          lazy
        </Collapsible>
      )
      expect(queryByText('lazy')).not.toBeNull()
    })

    it('starts unmounted when initially closed', () => {
      const { queryByText } = render(
        <Collapsible open={false} unmountOnExit>
          lazy
        </Collapsible>
      )
      expect(queryByText('lazy')).toBeNull()
    })

    it('unmounts children only after the collapse delay', () => {
      const { rerender, queryByText } = render(
        <Collapsible open unmountOnExit unmountDelayMs={200}>
          lazy
        </Collapsible>
      )
      expect(queryByText('lazy')).not.toBeNull()
      rerender(
        <Collapsible open={false} unmountOnExit unmountDelayMs={200}>
          lazy
        </Collapsible>
      )
      expect(queryByText('lazy')).not.toBeNull() // still mounted during the animation window
      act(() => {
        vi.advanceTimersByTime(210)
      })
      expect(queryByText('lazy')).toBeNull()
    })
  })
})

describe('CollapsibleChevron', () => {
  it('rotates 90deg when open', () => {
    const { container } = render(<CollapsibleChevron open />)
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.getAttribute('class')).toContain('rotate-90')
    expect(svg.getAttribute('class')).toContain('transition-transform')
  })

  it('does not rotate when closed', () => {
    const { container } = render(<CollapsibleChevron open={false} />)
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.getAttribute('class')).not.toContain('rotate-90')
  })
})
