import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { HooksLifecycleView } from '../../src/renderer/src/components/capabilities/hooks-lifecycle-view'
import type { AgentView, Asset } from '../../src/shared/types/asset'
import type { AgentCapabilityPlugin, AgentCapabilityPluginHookHandlerDescriptor } from '../../src/shared/types/agent-plugin'
import type { HealthCheck, HooksAgentId } from '../../src/shared/types/ipc'

function hookAsset(
  id: string,
  agentId: string,
  eventType: string,
  meta: Record<string, unknown> = {}
): Asset {
  return {
    id,
    agentId,
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: id,
    path: agentId === 'codex' ? 'C:\\Users\\test\\.codex\\hooks.json' : 'C:\\Users\\test\\.claude\\settings.json',
    meta: {
      eventType,
      command: agentId === 'codex' ? 'pwsh hooks\\stop.ps1' : 'echo stop',
      matcher: eventType === 'PreToolUse' ? 'Bash' : undefined,
      ...meta
    }
  }
}

function renderHooks(
  agentView: AgentView,
  assets: Asset[],
  plugins: AgentCapabilityPlugin[] = []
): ReturnType<typeof render> {
  return render(
    <HooksLifecycleView
      assets={assets}
      agentView={agentView}
      search=""
      scope="all"
      plugins={plugins}
    />
  )
}

function hookSchemaPlugin(
  agentId: 'claude-code' | 'codex',
  handlers: AgentCapabilityPluginHookHandlerDescriptor[]
): AgentCapabilityPlugin {
  return {
    id: agentId,
    displayName: agentId === 'codex' ? 'Codex' : 'Claude Code',
    version: '0.1.0',
    schemaVersion: 1,
    builtin: true,
    enabled: true,
    detected: true,
    agentCompatibility: {
      agentId,
      name: agentId === 'codex' ? 'Codex' : 'Claude Code'
    },
    capabilities: [],
    permissions: [],
    sourceDescriptors: [],
    assetDescriptors: [],
    hookSchema: {
      agentId,
      events: [],
      handlers
    },
    healthCheckDescriptors: [],
    sourceCoverage: {
      total: 0,
      counts: { scanned: 0, missing: 0, 'not-scanned': 0 },
      sources: []
    },
    references: []
  }
}

async function waitForHookHealthIdle(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText('Checking')).not.toBeInTheDocument()
  })
}

describe('HooksLifecycleView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => undefined) }
    })
    window.api.assets.healthCheck = vi.fn(async () => [])
    window.api.shell.openPath = vi.fn(async () => {})
    window.api.hooks.statuses = vi.fn(async (agentId: HooksAgentId) => [
      {
        agentId,
        agentName: agentId === 'codex' ? 'Codex' : 'Claude Code',
        scope: 'user',
        enabled: true,
        sourcePath: agentId === 'codex'
          ? 'C:\\Users\\test\\.codex\\config.toml'
          : 'C:\\Users\\test\\.claude\\settings.json',
        sourceExists: true,
        supported: true,
        writable: true
      }
    ])
    window.api.hooks.setHookEnabled = vi.fn(async (request) => ({
      hookKey: request.hookKey,
      enabled: request.enabled,
      changed: true,
      sourcePath: 'C:\\Users\\test\\.codex\\config.toml'
    }))
    window.api.hooks.recoveries = vi.fn(async () => ({ points: [], issues: [] }))
    window.api.hooks.clearRecovery = vi.fn(async (request) => ({
      hookKey: request.hookKey,
      sourcePath: request.sourcePath,
      changed: true
    }))
    window.confirm = vi.fn(() => true)
  })

  it('shows Codex-only copy without Claude Code support rows in Codex view', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForHookHealthIdle()

    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.queryByText('Trigger point')).not.toBeInTheDocument()
    expect(screen.getAllByText('Agent stops').length).toBeGreaterThan(0)
    expect(screen.queryByText('Environment events')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claude Code' })).not.toBeInTheDocument()
  })

  it('shows Claude-only copy without Codex hints in Claude view', async () => {
    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])
    await waitForHookHealthIdle()

    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.queryByText('Trigger point')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Codex' })).not.toBeInTheDocument()
  })

  it('keeps cross-agent differences in hover tips instead of flat support rows', async () => {
    renderHooks('all', [
      hookAsset('claude-pre', 'claude-code', 'PreToolUse'),
      hookAsset('codex-stop', 'codex', 'Stop')
    ])
    await waitForHookHealthIdle()

    const toolStage = screen.getByRole('heading', { name: 'Before a tool runs' }).closest('section')
    expect(toolStage).not.toBeNull()
    const codexTipTrigger = within(toolStage!).getByRole('button', { name: 'Codex' })

    expect(within(toolStage!).getByRole('button', { name: 'Claude Code' })).toBeInTheDocument()
    expect(within(toolStage!).queryByText(/Codex PreToolUse is available/)).not.toBeInTheDocument()

    fireEvent.mouseEnter(codexTipTrigger)

    expect(within(toolStage!).getByText(/Codex PreToolUse is available/)).toBeInTheDocument()
    expect(within(toolStage!).getByText(/Codex only applies tool hooks/)).toBeInTheDocument()
  })

  it('keeps lifecycle explanations visible when there are no hooks', async () => {
    renderHooks('claude', [])
    await waitForHookHealthIdle()

    expect(screen.getAllByText('Session starts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No hook is configured for this stage.').length).toBeGreaterThan(0)
  })

  it('toggles a Claude user hook through Berth soft-disable', async () => {
    renderHooks('claude', [
      hookAsset('claude-stop', 'claude-code', 'Stop', {
        hookKey: 'claude-code:scenario:hook',
        enabled: true,
        canToggleHook: true,
        toggleStrategy: 'soft-remove'
      })
    ])
    await waitForHookHealthIdle()

    fireEvent.click(screen.getByText('Disable'))

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Event: Stop'))
      expect(window.api.hooks.setHookEnabled).toHaveBeenCalledWith({
        agentId: 'claude-code',
        scope: 'user',
        hookKey: 'claude-code:scenario:hook',
        sourcePath: 'C:\\Users\\test\\.claude\\settings.json',
        enabled: false,
        managed: false
      })
    })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('toggles a Codex non-managed hook through hooks.state', async () => {
    renderHooks('codex', [
      hookAsset('codex-stop', 'codex', 'Stop', {
        hookKey: 'codex:scenario:hook',
        enabled: true,
        canToggleHook: true,
        toggleStrategy: 'native-state'
      })
    ])
    await waitForHookHealthIdle()

    fireEvent.click(screen.getByText('Disable'))

    await waitFor(() => {
      expect(window.api.hooks.setHookEnabled).toHaveBeenCalledWith({
        agentId: 'codex',
        scope: 'user',
        hookKey: 'codex:scenario:hook',
        sourcePath: 'C:\\Users\\test\\.codex\\hooks.json',
        enabled: false,
        managed: false
      })
    })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('opens hook source files from the row action menu', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForHookHealthIdle()

    fireEvent.click(screen.getAllByText('Actions')[0])
    fireEvent.click(screen.getByText('Open source file'))

    await waitFor(() => {
      expect(window.api.shell.openPath).toHaveBeenCalledWith('C:\\Users\\test\\.codex\\hooks.json')
    })
  })

  it('shows type specific hook metadata and raw JSON', async () => {
    renderHooks('claude', [
      hookAsset('claude-http', 'claude-code', 'PreToolUse', {
        hookType: 'http',
        url: 'http://localhost:8080/hooks/pre-tool-use',
        timeout: 30,
        statusMessage: 'Checking command',
        rawHook: {
          type: 'http',
          url: 'http://localhost:8080/hooks/pre-tool-use',
          timeout: 30,
          statusMessage: 'Checking command'
        }
      }),
      hookAsset('claude-prompt', 'claude-code', 'Stop', {
        hookType: 'prompt',
        prompt: 'Review the turn and decide whether Claude can stop.',
        model: 'claude-sonnet-4-5',
        rawHook: {
          type: 'prompt',
          prompt: 'Review the turn and decide whether Claude can stop.',
          model: 'claude-sonnet-4-5'
        }
      })
    ])
    await waitForHookHealthIdle()

    expect(screen.getByText('http')).toBeInTheDocument()
    expect(screen.getByText('http://localhost:8080/hooks/pre-tool-use')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
    expect(screen.getByText('Checking command')).toBeInTheDocument()
    expect(screen.getByText('prompt')).toBeInTheDocument()
    expect(screen.getByText('Review the turn and decide whether Claude can stop.')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument()

    fireEvent.click(screen.getAllByText('JSON')[0])
    expect(screen.getByText(/"type": "http"/)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy JSON' })[0])
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"type": "http"'))
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied JSON' })).toBeInTheDocument()
    })
  })

  it('uses plugin handler schema for primary fields and parsed-only run mode', async () => {
    renderHooks('all', [
      hookAsset('claude-custom', 'claude-code', 'PostToolUse', {
        hookType: 'webhook',
        endpoint: 'https://hooks.example.test/post-tool',
        rawHook: {
          type: 'webhook',
          endpoint: 'https://hooks.example.test/post-tool'
        }
      }),
      hookAsset('codex-prompt', 'codex', 'Stop', {
        hookType: 'prompt',
        prompt: 'Summarize this turn before stopping.',
        rawHook: {
          type: 'prompt',
          prompt: 'Summarize this turn before stopping.'
        }
      })
    ], [
      hookSchemaPlugin('claude-code', [
        {
          type: 'webhook',
          runMode: 'runnable',
          primaryFieldNames: ['endpoint'],
          labelKey: 'settings.agentPluginHookHandlers.claude-code.webhook.label',
          descriptionKey: 'settings.agentPluginHookHandlers.claude-code.webhook.description',
          fields: [
            {
              name: 'type',
              kind: 'string',
              required: true,
              labelKey: 'settings.agentPluginHookHandlers.claude-code.webhook.fields.type.label',
              descriptionKey: 'settings.agentPluginHookHandlers.claude-code.webhook.fields.type.description'
            },
            {
              name: 'endpoint',
              kind: 'string',
              required: true,
              primary: true,
              labelKey: 'settings.agentPluginHookHandlers.claude-code.webhook.fields.endpoint.label',
              descriptionKey: 'settings.agentPluginHookHandlers.claude-code.webhook.fields.endpoint.description'
            }
          ]
        }
      ]),
      hookSchemaPlugin('codex', [
        {
          type: 'prompt',
          runMode: 'parsed-only',
          primaryFieldNames: ['prompt'],
          labelKey: 'settings.agentPluginHookHandlers.codex.prompt.label',
          descriptionKey: 'settings.agentPluginHookHandlers.codex.prompt.description',
          fields: [
            {
              name: 'type',
              kind: 'string',
              required: true,
              labelKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.type.label',
              descriptionKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.type.description'
            },
            {
              name: 'prompt',
              kind: 'string',
              primary: true,
              labelKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.prompt.label',
              descriptionKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.prompt.description'
            }
          ]
        }
      ])
    ])
    await waitForHookHealthIdle()

    expect(screen.getByText('webhook')).toBeInTheDocument()
    expect(screen.getByText('https://hooks.example.test/post-tool')).toBeInTheDocument()
    expect(screen.getByText('prompt')).toBeInTheDocument()
    expect(screen.getByText('Summarize this turn before stopping.')).toBeInTheDocument()
    expect(screen.getByText('Parsed only')).toBeInTheDocument()

    fireEvent.click(screen.getAllByText('JSON')[0])
    expect(screen.getByText(/"endpoint": "https:\/\/hooks.example.test\/post-tool"/)).toBeInTheDocument()
  })

  it('shows readable hook toggle errors for stale restore points', async () => {
    window.api.hooks.setHookEnabled = vi.fn(async () => {
      throw new Error('Claude Code hook restore point was not found')
    })

    renderHooks('claude', [
      hookAsset('claude-stop', 'claude-code', 'Stop', {
        hookKey: 'claude-code:scenario:hook',
        enabled: false,
        canToggleHook: true,
        toggleStrategy: 'soft-remove',
        disabledAt: '2026-06-02T00:00:00.000Z'
      })
    ])
    await waitForHookHealthIdle()

    fireEvent.click(screen.getByText('Enable'))

    await waitFor(() => {
      expect(screen.getByText(/No restore point was found for this hook/)).toBeInTheDocument()
    })
  })

  it('shows readable hook toggle errors for target conflicts', async () => {
    window.api.hooks.setHookEnabled = vi.fn(async () => {
      throw new Error('Claude Code hook target changed or was removed before Berth could update it')
    })

    renderHooks('claude', [
      hookAsset('claude-stop', 'claude-code', 'Stop', {
        hookKey: 'claude-code:scenario:hook',
        enabled: true,
        canToggleHook: true,
        toggleStrategy: 'soft-remove'
      })
    ])
    await waitForHookHealthIdle()

    fireEvent.click(screen.getByText('Disable'))

    await waitFor(() => {
      expect(screen.getByText(/This hook changed while Berth was preparing the update/)).toBeInTheDocument()
    })
  })

  it('shows row-level risk hints for broad hooks without entry files', async () => {
    renderHooks('codex', [
      hookAsset('codex-pre', 'codex', 'PreToolUse', {
        command: 'python hook.py',
        entryPaths: [],
        matcher: undefined
      })
    ])
    await waitForHookHealthIdle()

    expect(screen.getByText('Entry file not detected')).toBeInTheDocument()
    expect(screen.getByText('Runs for every matching tool')).toBeInTheDocument()
  })

  it('shows equivalent source count and effective state when another source still enables a hook', async () => {
    renderHooks('claude', [
      hookAsset('claude-stop', 'claude-code', 'Stop', {
        hookKey: 'claude-code:scenario:hook',
        enabled: false,
        effectiveEnabled: true,
        equivalentSourceCount: 2,
        equivalentSources: [
          {
            id: 'claude-stop',
            agentId: 'claude-code',
            scope: 'user',
            name: 'User stop hook',
            path: 'C:\\Users\\test\\.claude\\settings.json',
            enabled: false,
            managed: false
          },
          {
            id: 'claude-project-stop',
            agentId: 'claude-code',
            scope: 'project',
            name: 'Project stop hook',
            path: 'D:\\repo\\.claude\\settings.json',
            enabled: true,
            managed: true
          }
        ]
      })
    ])
    await waitForHookHealthIdle()

    const sourceTag = screen.getByTitle(/user: Disabled/)

    expect(screen.getByText('2 sources')).toBeInTheDocument()
    expect(screen.getByText('Still effective')).toBeInTheDocument()
    expect(sourceTag).toHaveAttribute('title', expect.stringContaining('project: Enabled'))
    expect(screen.getByText('Equivalent sources')).toBeInTheDocument()
    expect(screen.getByText('Still enabled elsewhere')).toBeInTheDocument()
  })

  it('removes the hooks display mode switcher and obsolete toolbar controls', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])

    await waitFor(() => {
      expect(window.api.assets.healthCheck).toHaveBeenCalled()
    })

    expect(screen.queryByRole('button', { name: 'Lifecycle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare agents' })).not.toBeInTheDocument()
    expect(screen.queryByText('Lifecycle comparison')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comfortable' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compact' })).not.toBeInTheDocument()
    expect(screen.queryByText('Agent-level hooks switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disable all' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable all' })).not.toBeInTheDocument()
    expect(window.api.hooks.statuses).not.toHaveBeenCalled()
  })

  it('keeps long hook commands visible without a density switch', async () => {
    const longCommand = 'python scripts/hooks/pre_tool_use_with_a_very_long_name.py --check safety --format json'
    renderHooks('codex', [
      hookAsset('codex-pre', 'codex', 'PreToolUse', {
        command: longCommand
      })
    ])
    await waitForHookHealthIdle()

    expect(screen.queryByRole('button', { name: 'Compact' })).not.toBeInTheDocument()
    expect(screen.getByText(longCommand)).toBeInTheDocument()
  })

  it('keeps the lifecycle index as a sticky in-page sidebar on desktop', async () => {
    renderHooks('all', [
      hookAsset('claude-pre', 'claude-code', 'PreToolUse'),
      hookAsset('codex-stop', 'codex', 'Stop')
    ])
    await waitForHookHealthIdle()

    const sidebar = screen.getByLabelText('Lifecycle')
    const stageList = screen.getByTestId('hook-lifecycle-stage-list')

    expect(sidebar.className).toContain('lg:sticky')
    expect(sidebar.className).toContain('lg:top-4')
    expect(sidebar.className).not.toContain('lg:overflow-y-auto')
    expect(stageList.className).toContain('lg:max-h-[calc(100vh-10rem)]')
    expect(stageList.className).toContain('lg:overflow-y-auto')
  })

  it('shows sidebar stage summaries, numeric count tags, and structured recommendations', async () => {
    renderHooks('all', [
      hookAsset('claude-pre', 'claude-code', 'PreToolUse'),
      hookAsset('codex-stop', 'codex', 'Stop')
    ])
    await waitForHookHealthIdle()

    const sidebar = screen.getByLabelText('Lifecycle')
    const toolBeforeButton = within(sidebar).getByRole('button', { name: /Before a tool runs/ })

    expect(within(toolBeforeButton).getByText('Guardrails before tool side effects')).toBeInTheDocument()
    expect(within(toolBeforeButton).getByText('1')).toBeInTheDocument()
    expect(within(toolBeforeButton).queryByText('1 hooks')).not.toBeInTheDocument()

    expect(screen.getAllByText('Suggested actions:').length).toBeGreaterThan(0)
    expect(screen.getByText('Check command')).toBeInTheDocument()
    expect(screen.getByText('Limit side effects')).toBeInTheDocument()
    expect(screen.getByText('Log tool intent')).toBeInTheDocument()
    expect(screen.queryByText(/Use this stage for guardrails/)).not.toBeInTheDocument()
  })

  it('keeps a clean hook health state inside the lifecycle sidebar with hover details', async () => {
    const { container } = renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForHookHealthIdle()

    const sidebar = screen.getByLabelText('Lifecycle')
    const clearTag = within(sidebar).getByRole('button', { name: /Clear/ })

    expect(screen.getAllByText('Hook checks')).toHaveLength(1)
    expect(within(sidebar).getByText('Hook checks')).toBeInTheDocument()
    expect(clearTag).toBeInTheDocument()
    expect(screen.queryByText('No hook health checks need attention for this view.')).not.toBeInTheDocument()
    expect(container.querySelector('#hook-health-checks')).toBeNull()

    fireEvent.mouseEnter(clearTag)

    expect(screen.getByText('No hook health checks need attention for this view.')).toBeInTheDocument()
  })

  it('shows visible hook health checks from sidebar status tag hover details', async () => {
    const checks: HealthCheck[] = [
      {
        id: 'codex:configuration:user-hook-windows-command',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        path: 'C:\\Users\\test\\.codex\\hooks.json',
        assetType: 'hook',
        target: { route: '/configuration/capabilities?tab=hooks' }
      },
      {
        id: 'claude-code:structure:user-hook-missing-command',
        severity: 'error',
        category: 'structure',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'Claude Code hook is missing command',
        message: 'PreToolUse contains a command hook without a command.',
        path: 'C:\\Users\\test\\.claude\\settings.json',
        assetType: 'hook',
        target: { route: '/configuration/capabilities?tab=hooks' }
      },
      {
        id: 'codex:configuration:user-mcp-disabled',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex MCP server is disabled',
        message: 'This is not a hook check.',
        assetType: 'mcp-server'
      }
    ]
    window.api.assets.healthCheck = vi.fn(async () => checks)

    const { container } = renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])

    const sidebar = screen.getByLabelText('Lifecycle')
    expect(await within(sidebar).findByText('1 hook check needs attention')).toBeInTheDocument()
    const warningTag = within(sidebar).getByRole('button', { name: /1 warning/ })

    expect(screen.queryByText('Codex hook has no Windows command override')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code hook is missing command')).not.toBeInTheDocument()
    expect(screen.queryByText('Codex MCP server is disabled')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review hook checks' })).not.toBeInTheDocument()
    expect(screen.queryByText('Hook check details')).not.toBeInTheDocument()

    fireEvent.mouseEnter(warningTag)

    expect(screen.getByText('Codex hook has no Windows command override')).toBeInTheDocument()
    expect(screen.getByText('A command hook is configured without commandWindows on Windows.')).toBeInTheDocument()
    expect(container.querySelector('#hook-health-checks')).toBeNull()
  })

  it('localizes visible hook health checks from sidebar status tag hover details in Chinese', async () => {
    await i18n.changeLanguage('zh')
    const checks: HealthCheck[] = [
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
          description: 'Add commandWindows or command_windows when the command differs on Windows.'
        },
        path: 'C:\\Users\\test\\.codex\\hooks.json',
        assetType: 'hook',
        target: { route: '/configuration/capabilities?tab=hooks' }
      }
    ]
    window.api.assets.healthCheck = vi.fn(async () => checks)

    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])

    const sidebar = screen.getByLabelText('生命周期')
    expect(await within(sidebar).findByText('1 个 Hook 检查需要处理')).toBeInTheDocument()
    const warningTag = within(sidebar).getByRole('button', { name: /1 个警告/ })

    fireEvent.mouseEnter(warningTag)

    expect(screen.getByText('Codex Hook 缺少 Windows 命令覆盖')).toBeInTheDocument()
    expect(screen.getByText('这个命令 Hook 在 Windows 上没有配置 commandWindows。')).toBeInTheDocument()
    expect(screen.getByText(/建议修复:/)).toBeInTheDocument()
    expect(screen.getByText('如果 Windows 命令不同, 添加 commandWindows 或 command_windows。')).toBeInTheDocument()
    expect(screen.queryByText('Codex hook has no Windows command override')).not.toBeInTheDocument()
    expect(screen.queryByText('A command hook is configured without commandWindows on Windows.')).not.toBeInTheDocument()
  })

  it('shows the recovery center and restores a recoverable Claude hook', async () => {
    window.api.hooks.recoveries = vi.fn(async () => ({
      points: [
        {
          hookKey: 'claude-code:scenario:hook',
          agentId: 'claude-code',
          agentName: 'Claude Code',
          sourcePath: 'C:\\Users\\test\\.claude\\settings.json',
          scope: 'user',
          event: 'Stop',
          hookType: 'command',
          command: 'echo stop',
          summary: 'echo stop',
          createdAt: '2026-06-01T00:00:00.000Z',
          status: 'recoverable',
          message: 'This restore point can be written back to the source file.'
        }
      ],
      issues: []
    }))

    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])
    await waitForHookHealthIdle()

    expect(await screen.findByText('1 restore point(s), 0 issue(s)')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Recovery center'))
    const recoveryCenter = screen.getByTestId('hook-recovery-center')

    expect(within(recoveryCenter).getByText('Recoverable')).toBeInTheDocument()
    expect(within(recoveryCenter).getByText('echo stop')).toBeInTheDocument()

    fireEvent.click(within(recoveryCenter).getByRole('button', { name: /Restore/ }))

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Restore this Claude Code hook?'))
      expect(window.api.hooks.setHookEnabled).toHaveBeenCalledWith({
        agentId: 'claude-code',
        scope: 'user',
        hookKey: 'claude-code:scenario:hook',
        sourcePath: 'C:\\Users\\test\\.claude\\settings.json',
        enabled: true
      })
    })
  })

  it('localizes the recovery loading label in Chinese', async () => {
    await i18n.changeLanguage('zh')
    let resolveRecoveries: ((value: { points: []; issues: [] }) => void) | undefined
    window.api.hooks.recoveries = vi.fn(
      () => new Promise<{ points: []; issues: [] }>((resolve) => {
        resolveRecoveries = resolve
      })
    )

    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])

    fireEvent.click(screen.getByText('恢复中心'))

    expect(screen.getByLabelText('正在加载 Hook 恢复记录')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading hook recoveries')).not.toBeInTheDocument()

    resolveRecoveries?.({ points: [], issues: [] })

    await waitFor(() => {
      expect(screen.queryByLabelText('正在加载 Hook 恢复记录')).not.toBeInTheDocument()
    })
  })

  it('shows recovery issues and disables restore when the source file is missing', async () => {
    window.api.hooks.recoveries = vi.fn(async () => ({
      points: [
        {
          hookKey: 'claude-code:scenario:missing',
          agentId: 'claude-code',
          agentName: 'Claude Code',
          sourcePath: 'C:\\Users\\test\\.claude\\settings.json',
          scope: 'user',
          event: 'SessionStart',
          matcher: 'startup',
          hookType: 'prompt',
          command: 'Check startup context.',
          summary: 'Check startup context.',
          createdAt: '2026-06-01T00:00:00.000Z',
          status: 'source-missing',
          message: 'Source file is missing: C:\\Users\\test\\.claude\\settings.json'
        }
      ],
      issues: [
        {
          agentId: 'claude-code',
          sourcePath: 'C:\\Users\\test\\.claude\\.berth\\hooks-state.json',
          severity: 'error',
          message: 'Invalid Claude hooks state entry: broken'
        }
      ]
    }))

    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])
    await waitForHookHealthIdle()

    expect(await screen.findByText('1 restore point(s), 1 issue(s)')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Recovery center'))
    const recoveryCenter = screen.getByTestId('hook-recovery-center')

    expect(within(recoveryCenter).getByText('Invalid Claude hooks state entry: broken')).toBeInTheDocument()
    expect(within(recoveryCenter).getByText('Source missing')).toBeInTheDocument()
    expect(within(recoveryCenter).getByRole('button', { name: /Restore/ })).toBeDisabled()

    fireEvent.click(within(recoveryCenter).getByRole('button', { name: /Clear/ }))

    await waitFor(() => {
      expect(window.api.hooks.clearRecovery).toHaveBeenCalledWith({
        agentId: 'claude-code',
        hookKey: 'claude-code:scenario:missing',
        sourcePath: 'C:\\Users\\test\\.claude\\settings.json'
      })
    })
  })
})
