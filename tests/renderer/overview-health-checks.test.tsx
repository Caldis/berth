import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'

describe('overview health checks', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('renders info, warning and error checks grouped by agent', async () => {
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      totalTokens: 0,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        unknownTokens: 0,
        totalTokens: 0,
        hasBreakdown: false
      },
      costSource: 'unknown',
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))
    window.api.assets.healthCheck = vi.fn(async () => [
      {
        id: 'claude-code:source:user-claude-md-missing',
        severity: 'info',
        category: 'source',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'User CLAUDE.md not found',
        message: 'No user-level CLAUDE.md found.',
        suggestion: 'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.',
        scope: 'user',
        path: 'C:\\Users\\test\\.claude\\CLAUDE.md',
        assetType: 'claude-md'
      },
      {
        id: 'codex:configuration:user-hook-windows-command',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        suggestion: 'Add commandWindows or command_windows when the command differs on Windows.',
        evidence: [{ label: 'Codex hooks', url: 'https://developers.openai.com/codex/hooks' }],
        fix: {
          label: 'Suggested fix',
          description: 'Add commandWindows or command_windows when the command differs on Windows.',
          snippet: 'commandWindows = "powershell -File hook.ps1"'
        },
        target: { route: '/configuration/capabilities?tab=hooks', path: 'C:\\Users\\test\\.codex\\config.toml' },
        confidence: 'medium',
        scope: 'user',
        path: 'C:\\Users\\test\\.codex\\config.toml',
        assetType: 'hook'
      },
      {
        id: 'codex:syntax:user-config-invalid',
        severity: 'error',
        category: 'syntax',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Invalid Codex config.toml',
        message: 'config.toml contains invalid TOML.',
        suggestion: 'Fix the TOML syntax in Codex config.toml.',
        scope: 'user',
        path: 'C:\\Users\\test\\.codex\\config.toml',
        assetType: 'mcp-server'
      }
    ])
    window.api.shell.openPath = vi.fn(async () => {})
    window.api.shell.openExternal = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) }
    })

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/configuration/capabilities" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('User CLAUDE.md not found')).toBeInTheDocument()
    expect(screen.getByText('Codex hook has no Windows command override')).toBeInTheDocument()
    expect(screen.getByText('Invalid Codex config.toml')).toBeInTheDocument()
    expect(screen.getByText('Codex hooks')).toBeInTheDocument()
    expect(screen.getByText(/Suggested fix:/)).toBeInTheDocument()
    expect(screen.getByText('commandWindows = "powershell -File hook.ps1"')).toBeInTheDocument()
    expect(screen.getByText('1 info')).toBeInTheDocument()
    expect(screen.getByText('1 warning')).toBeInTheDocument()
    expect(screen.getByText('1 error')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Codex hooks'))

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://developers.openai.com/codex/hooks')

    const copyFixSnippetButton = screen.getByRole('button', { name: 'Copy fix snippet' })
    expect(copyFixSnippetButton).toHaveAttribute('aria-label', 'Copy fix snippet')
    expect(copyFixSnippetButton).toHaveAttribute('title', 'Copy fix snippet')

    fireEvent.click(copyFixSnippetButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('commandWindows = "powershell -File hook.ps1"')

    const ignoreInfoButton = screen.getByRole('button', { name: 'Ignore info check' })
    expect(ignoreInfoButton).toHaveAttribute('aria-label', 'Ignore info check')
    expect(ignoreInfoButton).toHaveAttribute('title', 'Ignore info check')

    fireEvent.click(ignoreInfoButton)

    expect(screen.queryByText('User CLAUDE.md not found')).not.toBeInTheDocument()
    expect(localStorage.getItem('berth-ignored-health-checks')).toContain('claude-code:source:user-claude-md-missing')

    fireEvent.click(screen.getByText('Codex hook has no Windows command override').closest('[role="button"]')!)

    expect(await screen.findByText('/configuration/capabilities?tab=hooks')).toBeInTheDocument()
    expect(window.api.shell.openPath).not.toHaveBeenCalled()
  })

  it('localizes health check action titles in Chinese', async () => {
    await i18n.changeLanguage('zh')
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      totalTokens: 0,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        unknownTokens: 0,
        totalTokens: 0,
        hasBreakdown: false
      },
      costSource: 'unknown',
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))
    window.api.assets.healthCheck = vi.fn(async () => [
      {
        id: 'claude-code:source:user-claude-md-missing',
        severity: 'info',
        category: 'source',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'User CLAUDE.md not found',
        message: 'No user-level CLAUDE.md found.',
        scope: 'user',
        assetType: 'claude-md'
      },
      {
        id: 'codex:configuration:user-hook-windows-command',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        fix: {
          label: 'Suggested fix',
          description: 'Add commandWindows or command_windows when the command differs on Windows.',
          snippet: 'commandWindows = "powershell -File hook.ps1"'
        },
        confidence: 'medium',
        scope: 'user',
        assetType: 'hook'
      },
      {
        id: 'codex:syntax:user-config-invalid',
        severity: 'error',
        category: 'syntax',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Invalid Codex config.toml',
        message: 'config.toml contains invalid TOML.',
        scope: 'user',
        assetType: 'mcp-server'
      },
      {
        id: 'codex:structure:user-skill-system-missing-entrypoint',
        severity: 'warning',
        category: 'structure',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Skill is missing SKILL.md',
        message: '.system has no SKILL.md entrypoint.',
        evidence: [{ label: 'Codex skills', url: 'https://developers.openai.com/codex/skills' }],
        fix: {
          label: 'Suggested fix',
          description: 'Add SKILL.md or move non-skill files outside the skills directory.'
        },
        scope: 'user',
        assetType: 'skill'
      },
      {
        id: 'codex:configuration:user-config-schema-comment-missing',
        severity: 'info',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex config schema comment is not declared',
        message: 'config.toml does not include the official Codex TOML schema comment.',
        evidence: [{ label: 'Codex config reference', url: 'https://developers.openai.com/codex/config-reference' }],
        fix: {
          label: 'Add Codex config schema',
          description: 'Add the official Codex TOML schema comment near the top of config.toml.'
        },
        scope: 'user',
        assetType: 'mcp-server'
      },
      {
        id: 'claude-code:configuration:user-settings-schema-missing',
        severity: 'info',
        category: 'configuration',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'Claude settings schema is not declared',
        message: 'settings.json does not declare the Claude Code settings JSON schema.',
        evidence: [{ label: 'Claude Code settings', url: 'https://code.claude.com/docs/en/settings' }],
        fix: {
          label: 'Add Claude settings schema',
          description: 'Add the official Claude Code settings schema near the top of the JSON file.'
        },
        scope: 'user',
        assetType: 'claude-md'
      }
    ])
    window.api.shell.openPath = vi.fn(async () => {})
    window.api.shell.openExternal = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) }
    })

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Overview />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('技能')).toBeInTheDocument()
    expect(screen.queryByText('Skills')).not.toBeInTheDocument()
    expect(screen.getByText('插件')).toBeInTheDocument()
    expect(screen.queryByText('Plugins')).not.toBeInTheDocument()
    expect(screen.getAllByText('1 条信息').length).toBeGreaterThan(0)
    expect(screen.getByText(/个警告/)).toBeInTheDocument()
    expect(screen.getByText('1 个错误')).toBeInTheDocument()
    expect(screen.queryByText('1 info')).not.toBeInTheDocument()
    expect(screen.queryByText('1 warning')).not.toBeInTheDocument()
    expect(screen.queryByText('1 error')).not.toBeInTheDocument()
    const ignoreInfoButtons = screen.getAllByRole('button', { name: '忽略信息检查' })
    expect(ignoreInfoButtons.length).toBeGreaterThan(0)
    expect(ignoreInfoButtons[0]).toHaveAttribute('aria-label', '忽略信息检查')
    expect(ignoreInfoButtons[0]).toHaveAttribute('title', '忽略信息检查')

    const copyFixSnippetButton = screen.getByRole('button', { name: '复制修复片段' })
    expect(copyFixSnippetButton).toBeInTheDocument()
    expect(copyFixSnippetButton).toHaveAttribute('aria-label', '复制修复片段')
    expect(copyFixSnippetButton).toHaveAttribute('title', '复制修复片段')
    expect(screen.queryByRole('button', { name: 'Ignore info check' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy fix snippet' })).not.toBeInTheDocument()
    expect(screen.getByText('Skill 缺少 SKILL.md')).toBeInTheDocument()
    expect(screen.getByText('.system 没有 SKILL.md 入口文件。')).toBeInTheDocument()
    expect(screen.getAllByText(/建议修复:/).length).toBeGreaterThan(0)
    expect(screen.getByText('添加 SKILL.md, 或将非 Skill 文件移出 skills 目录。')).toBeInTheDocument()
    expect(screen.getByText('Codex Skills 文档')).toBeInTheDocument()
    expect(screen.getByText('Codex 配置 schema 未声明')).toBeInTheDocument()
    expect(screen.getByText('config.toml 没有包含官方 Codex TOML schema 注释。')).toBeInTheDocument()
    expect(screen.getByText(/添加 Codex 配置 schema/)).toBeInTheDocument()
    expect(screen.getByText('在 config.toml 顶部附近添加官方 Codex TOML schema 注释。')).toBeInTheDocument()
    expect(screen.getByText('Codex 配置参考')).toBeInTheDocument()
    expect(screen.getByText('Claude Code settings schema 未声明')).toBeInTheDocument()
    expect(screen.getByText('settings.json 没有声明 Claude Code settings JSON schema。')).toBeInTheDocument()
    expect(screen.getByText(/添加 Claude Code settings schema/)).toBeInTheDocument()
    expect(screen.getByText('在 JSON 文件顶部附近添加官方 Claude Code settings schema。')).toBeInTheDocument()
    expect(screen.getByText('Claude Code 设置文档')).toBeInTheDocument()
    expect(screen.getAllByText('用户级').length).toBeGreaterThan(0)
    expect(screen.getByText('中等可信')).toBeInTheDocument()
    expect(screen.getAllByText('MCP 服务').length).toBeGreaterThan(0)
    expect(screen.queryByText('user')).not.toBeInTheDocument()
    expect(screen.queryByText('medium')).not.toBeInTheDocument()
    expect(screen.queryByText('mcp-server')).not.toBeInTheDocument()
    expect(screen.queryByText('Skill is missing SKILL.md')).not.toBeInTheDocument()
    expect(screen.queryByText('Suggested fix')).not.toBeInTheDocument()
    expect(screen.queryByText('Codex config schema comment is not declared')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude settings schema is not declared')).not.toBeInTheDocument()
    expect(screen.queryByText('settings.json does not declare the Claude Code settings JSON schema.')).not.toBeInTheDocument()
    expect(screen.queryByText('Add Claude settings schema')).not.toBeInTheDocument()
  })

  it('shows the cost source scope on the overview cost card in Chinese', async () => {
    await i18n.changeLanguage('zh')
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 42.5,
      actualCost: 12.5,
      estimatedCost: 30,
      costDelta: -17.5,
      costMode: 'auto',
      costSource: 'mixed',
      costExplanation: {
        formula: 'mixed',
        pricingSources: [],
        catalog: { sources: [] }
      },
      totalTokens: 0,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        unknownTokens: 0,
        totalTokens: 0,
        hasBreakdown: false
      },
      pricingMisses: [],
      dailyCosts: [{ date: '2026-06-02', cost: 42.5 }],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))
    window.api.assets.healthCheck = vi.fn(async () => [])

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Overview />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('混合')).toBeInTheDocument()
    expect(screen.getByText('$42.50')).toBeInTheDocument()
    expect(screen.getByLabelText('混合: 有实报费用的记录使用实报值，其余记录使用价格表估算。')).toHaveAttribute(
      'title',
      '有实报费用的记录使用实报值，其余记录使用价格表估算。'
    )
    expect(screen.queryByText('mixed')).not.toBeInTheDocument()
  })

  it('keeps unknown overview cost explicit without exposing raw enum values', async () => {
    await i18n.changeLanguage('zh')
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      actualCost: 0,
      estimatedCost: 0,
      costDelta: 0,
      costMode: 'auto',
      costSource: 'unknown',
      costExplanation: {
        formula: 'unknown',
        pricingSources: [],
        catalog: { sources: [] }
      },
      totalTokens: 0,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        unknownTokens: 0,
        totalTokens: 0,
        hasBreakdown: false
      },
      pricingMisses: [],
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))
    window.api.assets.healthCheck = vi.fn(async () => [])

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Overview />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('未知')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByLabelText('未知: 本地用量数据或价格表不足，无法计算这个费用。')).toHaveAttribute(
      'title',
      '本地用量数据或价格表不足，无法计算这个费用。'
    )
    expect(screen.queryByText('unknown')).not.toBeInTheDocument()
  })
})

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <p>{`${location.pathname}${location.search}`}</p>
}
