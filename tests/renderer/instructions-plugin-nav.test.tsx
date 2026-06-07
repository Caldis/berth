import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Instructions } from '../../src/renderer/src/pages/instructions'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import { FOCUS_HIGHLIGHT_CLASS } from '../../src/renderer/src/hooks/use-focus-target'
import { resetMemoryCacheForTests } from '../../src/renderer/src/hooks/use-memory'
import type { Asset } from '../../src/shared/types/asset'

// Mock react-virtuoso so the grouped list renders rows synchronously in jsdom
// (same approach as instructions-guidance.test.tsx).
type MockProps = {
  groupCounts: number[]
  data?: unknown[]
  context?: unknown
  computeItemKey: (index: number, item: unknown, context: unknown) => React.Key
  groupContent: (groupIndex: number, context: unknown) => React.ReactNode
  itemContent: (index: number, groupIndex: number, item: unknown, context: unknown) => React.ReactNode
  'data-testid'?: string
}

vi.mock('react-virtuoso', async () => {
  const ReactModule = await import('react')
  const GroupedVirtuoso = ReactModule.forwardRef<{ scrollToIndex: () => void }, MockProps>(function MockGroupedVirtuoso(props, ref) {
    ReactModule.useImperativeHandle(ref, () => ({ scrollToIndex: () => {} }))
    const nodes: React.ReactNode[] = []
    let itemIndex = 0
    let listIndex = 0
    for (let groupIndex = 0; groupIndex < props.groupCounts.length; groupIndex += 1) {
      nodes.push(ReactModule.createElement('div', { key: `g-${groupIndex}` }, props.groupContent(groupIndex, props.context)))
      listIndex += 1
      for (let offset = 0; offset < props.groupCounts[groupIndex]; offset += 1) {
        const item = props.data?.[listIndex]
        const key = props.computeItemKey(listIndex, item, props.context)
        nodes.push(ReactModule.createElement('div', { key }, props.itemContent(itemIndex, groupIndex, item, props.context)))
        itemIndex += 1
        listIndex += 1
      }
    }
    return ReactModule.createElement('div', { 'data-testid': props['data-testid'] ?? 'mock-virtuoso' }, nodes)
  })
  return { GroupedVirtuoso }
})

const PLUGIN_ID = 'plugin:acme/demo-plugin@1.0.0'

function pluginSkill(): Asset {
  return {
    id: 'skill-plugin', agentId: 'claude-code', category: 'instruction', type: 'skill', scope: 'user',
    name: 'bundled-skill', path: 'C:/x/demo/skills/bundled-skill',
    meta: { description: 'bundled skill desc', pluginId: PLUGIN_ID, pluginName: 'demo-plugin', origin: 'plugin' }
  }
}
function builtinSkill(): Asset {
  return {
    id: 'skill-builtin', agentId: 'claude-code', category: 'instruction', type: 'skill', scope: 'user',
    name: 'my-own-skill', path: 'C:/x/skills/my-own-skill', meta: { description: 'own desc' }
  }
}

function renderSkills(focusAssetId?: string): void {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/instructions/skills', state: focusAssetId ? { focusAssetId } : undefined }]}>
      <PageChromeProvider>
        <Instructions activeSection="skills" />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('Instructions plugin-origin badge + focus (GH-112 P3)', () => {
  beforeEach(() => {
    resetMemoryCacheForTests()
    useAppStore.setState({ assets: [pluginSkill(), builtinSkill()], agentView: 'all', scopeSelection: { mode: 'global' } })
    window.api.memory = { list: vi.fn(async () => ({ notes: [], sources: [] })), get: vi.fn(async () => null) }
  })

  it('shows a clickable plugin-origin badge only on plugin-provided skills', async () => {
    renderSkills()
    expect(await screen.findByText('bundled-skill')).toBeInTheDocument()
    // Plugin skill has the badge; built-in skill does not.
    expect(screen.getByTestId(`plugin-origin-badge-${PLUGIN_ID}`)).toBeInTheDocument()
    expect(screen.getAllByTestId(`plugin-origin-badge-${PLUGIN_ID}`)).toHaveLength(1)
  })

  it('does not duplicate the scope label in the group header (badge + text)', async () => {
    useAppStore.setState({
      assets: [{ ...builtinSkill(), scope: 'project' }],
      agentView: 'all',
      scopeSelection: { mode: 'global' }
    })
    renderSkills()
    const header = await screen.findByTestId('instructions-group-scope:project')
    // The scope name ("Project") must appear exactly once in the header, not twice.
    expect(within(header).getAllByText('Project')).toHaveLength(1)
  })

  it('highlights and expands the skill card when focused from the plugin page', async () => {
    renderSkills('skill-plugin')
    const card = await screen.findByTestId('instruction-asset-card-skill-plugin')
    expect(card.className).toContain(FOCUS_HIGHLIGHT_CLASS.split(' ')[0])
    // Auto-expanded → detail (description DetailRow) visible.
    expect(within(card).getAllByText(/bundled skill desc/).length).toBeGreaterThan(0)
  })
})
