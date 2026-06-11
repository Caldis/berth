import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CostSourceBadge } from '../../src/renderer/src/components/shared/cost-source-badge'
import i18n from '../../src/renderer/src/i18n'
import type { CostSource } from '@shared/types/asset'

const sources: CostSource[] = ['actual', 'estimated', 'mixed', 'unknown']

describe('CostSourceBadge', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('exposes English hover and assistive descriptions for every cost source', () => {
    for (const source of sources) {
      const { unmount } = render(<CostSourceBadge source={source} />)
      const label = i18n.t(`usage.costSource.${source}`)
      const description = i18n.t(`usage.costSourceDescription.${source}`)
      const badge = screen.getByLabelText(`${label}: ${description}`)

      expect(badge).toHaveTextContent(label)
      expect(badge).toHaveAttribute('title', description)
      expect(screen.queryByText(source)).not.toBeInTheDocument()

      unmount()
    }
  })

  it('exposes Chinese hover and assistive descriptions for every cost source', async () => {
    await i18n.changeLanguage('zh')

    for (const source of sources) {
      const { unmount } = render(<CostSourceBadge source={source} />)
      const label = i18n.t(`usage.costSource.${source}`)
      const description = i18n.t(`usage.costSourceDescription.${source}`)
      const badge = screen.getByLabelText(`${label}: ${description}`)

      expect(badge).toHaveTextContent(label)
      expect(badge).toHaveAttribute('title', description)
      expect(screen.queryByText(source)).not.toBeInTheDocument()

      unmount()
    }
  })
})
