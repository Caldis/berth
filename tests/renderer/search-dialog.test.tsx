import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SearchDialog } from '../../src/renderer/src/components/layout/search-dialog'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('SearchDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
    useAppStore.setState({ searchOpen: true })
  })

  afterEach(async () => {
    cleanup()
    useAppStore.setState({ searchOpen: false })
    await i18n.changeLanguage('en')
  })

  it('uses localized quick action labels', () => {
    render(
      <MemoryRouter>
        <SearchDialog />
      </MemoryRouter>
    )

    for (const label of ['总览', '会话', '指令', '能力', '用量']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }

    for (const label of ['Overview', 'Sessions', 'Instructions', 'Capabilities', 'Usage']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})
