import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'

function hookAsset(): Asset {
  return {
    id: 'codex-stop',
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: 'Stop hook',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {
      eventType: 'Stop',
      command: 'pwsh hooks\\stop.ps1'
    }
  }
}

describe('Capabilities guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [hookAsset()], agentView: 'all' })
  })

  it('keeps hook concept guidance in the page guide instead of the lifecycle tool', async () => {
    render(<Capabilities />)

    fireEvent.click(screen.getByRole('button', { name: /Hooks/ }))

    expect(await screen.findByText('Lifecycle automation')).toBeInTheDocument()
    expect(screen.getByText('Trigger point')).toBeInTheDocument()
    expect(screen.getByText('Agent differences')).toBeInTheDocument()
    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.getByText('Hook health checks')).toBeInTheDocument()
  })
})
