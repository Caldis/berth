import type { AgentCapabilityPluginSourceDescriptor } from '@shared/types/agent-plugin'
import { sourceDescriptor } from '../_shared/source-descriptors'

// GH-115 T8: Claude Code 扫描源 descriptor 数据 — per-agent 知识归 adapter 侧 (解
// adapters↔agent-plugins 值依赖环)。新增扫描源 = 改本表一处。

export const CLAUDE_SOURCE_DESCRIPTORS: AgentCapabilityPluginSourceDescriptor[] = [
  sourceDescriptor(
    'claude.user.data-directory',
    'user',
    'directory',
    ['instruction', 'capability', 'state', 'observability', 'integration'],
    '~/.claude'
  ),
  sourceDescriptor('claude.user.global-config', 'user', 'file', ['capability'], '~/.claude.json'),
  sourceDescriptor(
    'claude.project.directory',
    'project',
    'directory',
    ['instruction', 'capability'],
    '<project>/.claude'
  ),
  sourceDescriptor('claude.project.mcp-config', 'project', 'file', ['capability'], '<project>/.mcp.json'),
  sourceDescriptor(
    'claude.enterprise.managed-settings',
    'enterprise',
    'file',
    ['capability'],
    '<managed>/managed-settings.json'
  ),
  sourceDescriptor('claude.enterprise.managed-mcp', 'enterprise', 'file', ['capability'], '<managed>/managed-mcp.json')
]
