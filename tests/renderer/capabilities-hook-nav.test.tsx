import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { HooksLifecycleView } from '../../src/renderer/src/components/capabilities/hooks-lifecycle-view'
import { FOCUS_HIGHLIGHT_CLASS } from '../../src/renderer/src/hooks/use-focus-target'
import type { Asset } from '../../src/shared/types/asset'

const PLUGIN_ID = 'plugin:acme/demo-plugin@1.0.0'

function pluginHook(id: string): Asset {
  return {
    id, agentId: 'claude-code', category: 'capability', type: 'hook', scope: 'user', name: id,
    path: 'C:/Users/test/.claude/settings.json',
    meta: { eventType: 'Stop', command: 'echo hi', pluginId: PLUGIN_ID, pluginName: 'demo-plugin', origin: 'plugin' }
  }
}

function renderHooks(assets: Asset[], focusAssetId?: string): void {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/capabilities/hooks', state: focusAssetId ? { focusAssetId } : undefined }]}>
      <HooksLifecycleView assets={assets} agentView="all" search="" scope="all" plugins={[]} />
    </MemoryRouter>
  )
}

describe('Hooks plugin-origin badge + focus (GH-112 P4)', () => {
  beforeEach(() => {
    window.api.assets.healthCheck = async () => []
  })

  it('shows a clickable plugin-origin badge on a plugin-provided hook', () => {
    renderHooks([pluginHook('hook-1')])
    expect(screen.getByTestId(`plugin-origin-badge-${PLUGIN_ID}`)).toBeInTheDocument()
    expect(screen.getByText('From demo-plugin')).toBeInTheDocument()
  })

  it('highlights the focused hook row when jumped-to from the plugin page', () => {
    renderHooks([pluginHook('hook-1')], 'hook-1')
    const row = document.getElementById('hook-row-hook-1')
    expect(row).not.toBeNull()
    expect(row?.className).toContain(FOCUS_HIGHLIGHT_CLASS.split(' ')[0])
  })
})
