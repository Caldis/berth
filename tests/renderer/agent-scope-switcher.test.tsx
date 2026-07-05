import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { AgentScopeSwitcher } from '../../src/renderer/src/components/layout/agent-scope-switcher'
import { useAppStore } from '../../src/renderer/src/stores/app'

// 可变插件列表 (beforeEach 改写); mock 仅覆盖 useAgentCapabilityPlugins, 其余 use-ipc 导出保留。
const pluginState = vi.hoisted(() => ({ value: [] as ReturnType<typeof makePlugin>[] }))
vi.mock('../../src/renderer/src/hooks/use-ipc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/renderer/src/hooks/use-ipc')>()),
  useAgentCapabilityPlugins: () => ({
    plugins: pluginState.value,
    manifests: [],
    loading: false,
    stale: false,
    error: null
  })
}))

function makePlugin(agentId: string, displayName: string, detected = true) {
  return {
    id: agentId,
    displayName,
    detected,
    agentCompatibility: { agentId, name: displayName }
  } as never
}

describe('AgentScopeSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    pluginState.value = [makePlugin('claude-code', 'Claude Code'), makePlugin('codex', 'Codex')]
    useAppStore.setState({ agentView: 'all' })
  })

  it('shows the current selection on the trigger (Agent: All by default)', () => {
    render(<AgentScopeSwitcher collapsed={false} />)
    const trigger = screen.getByRole('button', { name: 'Agent' })
    // trigger 是 "维度: 值" 读出格式; all 用短值, 全称留在列表项。
    expect(within(trigger).getByText('Agent:')).toBeInTheDocument()
    expect(within(trigger).getByText('All')).toBeInTheDocument()
  })

  it('lists All agents + every detected capability-plugin agent', () => {
    render(<AgentScopeSwitcher collapsed={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }))
    expect(screen.getByRole('option', { name: 'All agents' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Claude Code' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Codex' })).toBeInTheDocument()
  })

  it('writes the chosen agentId to the global store and reflects it on the trigger', () => {
    render(<AgentScopeSwitcher collapsed={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }))
    fireEvent.click(screen.getByRole('option', { name: 'Codex' }))
    expect(useAppStore.getState().agentView).toBe('codex')
    expect(within(screen.getByRole('button', { name: 'Agent' })).getByText('Codex')).toBeInTheDocument()
  })

  it('resets to all when selecting All agents', () => {
    useAppStore.setState({ agentView: 'codex' })
    render(<AgentScopeSwitcher collapsed={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }))
    fireEvent.click(screen.getByRole('option', { name: 'All agents' }))
    expect(useAppStore.getState().agentView).toBe('all')
  })

  it('excludes undetected plugins and renders nothing with fewer than 2 agents', () => {
    pluginState.value = [makePlugin('claude-code', 'Claude Code'), makePlugin('cursor', 'Cursor', false)]
    const { container } = render(<AgentScopeSwitcher collapsed={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an active indicator on the trigger only when a specific agent is selected', () => {
    const { unmount } = render(<AgentScopeSwitcher collapsed={false} />)
    expect(
      screen.getByRole('button', { name: 'Agent' }).querySelector('[data-scope-active-dot]')
    ).toBeNull()
    unmount()

    useAppStore.setState({ agentView: 'codex' })
    render(<AgentScopeSwitcher collapsed={false} />)
    expect(
      screen.getByRole('button', { name: 'Agent' }).querySelector('[data-scope-active-dot]')
    ).not.toBeNull()
  })
})
