import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroUIProvider } from '@heroui/react'
import i18n from '../../src/renderer/src/i18n'
import { AgentScopeSwitcher } from '../../src/renderer/src/components/dashboard/agent-scope-switcher'

// GH-138: 全局 agent 范围筛选器 (纯展示组件) 的渲染/交互验收 —
// 触发器文案、菜单项 (All agents + 各 agent 名 + 计数)、onChange 选值、
// 单 agent 时不渲染。HeroUI Dropdown 在 jsdom 下走 portal + click 展开。
const AGENTS = [
  { agentId: 'claude-code', count: 42 },
  { agentId: 'codex', count: 7 }
]

function openMenu(): void {
  // HeroUI Dropdown 触发器是 aria-haspopup 按钮; click 展开 portal 菜单。
  fireEvent.click(screen.getByRole('button', { name: 'Agent' }))
}

describe('AgentScopeSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('en')
  })

  it('shows the current selection on the trigger ("All agents")', () => {
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="all" onChange={() => {}} />
      </HeroUIProvider>
    )

    expect(screen.getByRole('button', { name: 'Agent' })).toHaveTextContent('All agents')
  })

  it('shows the selected agent display name on the trigger', () => {
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="codex" onChange={() => {}} />
      </HeroUIProvider>
    )

    expect(screen.getByRole('button', { name: 'Agent' })).toHaveTextContent('Codex')
  })

  it('lists "All agents" plus each agent with its count when opened', async () => {
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="all" onChange={() => {}} />
      </HeroUIProvider>
    )

    openMenu()

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('All agents')).toBeInTheDocument()

    const claudeItem = within(menu).getByText('Claude Code').closest('[role="menuitemradio"]')
    expect(claudeItem).not.toBeNull()
    expect(within(claudeItem as HTMLElement).getByText('42')).toBeInTheDocument()

    const codexItem = within(menu).getByText('Codex').closest('[role="menuitemradio"]')
    expect(codexItem).not.toBeNull()
    expect(within(codexItem as HTMLElement).getByText('7')).toBeInTheDocument()
  })

  it('marks the active item as selected', async () => {
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="codex" onChange={() => {}} />
      </HeroUIProvider>
    )

    openMenu()

    const menu = await screen.findByRole('menu')
    const codexItem = within(menu).getByText('Codex').closest('[role="menuitemradio"]')
    expect(codexItem).toHaveAttribute('aria-checked', 'true')
    const allItem = within(menu).getByText('All agents').closest('[role="menuitemradio"]')
    expect(allItem).toHaveAttribute('aria-checked', 'false')
  })

  it('fires onChange with the agentId when an agent is selected', async () => {
    const onChange = vi.fn()
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="all" onChange={onChange} />
      </HeroUIProvider>
    )

    openMenu()
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByText('Codex'))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('codex'))
  })

  it('fires onChange with "all" when "All agents" is selected', async () => {
    const onChange = vi.fn()
    render(
      <HeroUIProvider>
        <AgentScopeSwitcher agents={AGENTS} value="codex" onChange={onChange} />
      </HeroUIProvider>
    )

    openMenu()
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByText('All agents'))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('all'))
  })

  it('renders nothing for a single-agent list', () => {
    // No provider wrapper: a null-returning component renders no DOM at all.
    const { container } = render(
      <AgentScopeSwitcher agents={[{ agentId: 'claude-code', count: 3 }]} value="all" onChange={() => {}} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Agent' })).not.toBeInTheDocument()
  })
})
