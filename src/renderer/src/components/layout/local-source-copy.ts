import type { BuiltInScanSourceCode, ScanRoot, ScanSourceCode, ScanSourceStatus } from '@shared/types/asset'

interface SourceCopy {
  title: string
  summary?: string
  actionHint?: string
}

const EN_SOURCE_COPY = {
  'claude.user.data-directory': {
    title: 'Claude Code data directory',
    summary:
      'Includes instructions, skills, agents, commands, hooks, plugins, status line, sessions, plans, todos, usage data, and integration state.'
  },
  'claude.user.global-config': {
    title: 'Claude Code global config file',
    summary: 'Includes global MCP server definitions.'
  },
  'claude.project.directory': {
    title: 'Project Claude Code directory',
    summary:
      'Includes project instructions, skills, agents, commands, hooks, permissions, environment variables, and teams.'
  },
  'claude.project.mcp-config': {
    title: 'Project MCP config file',
    summary: 'Includes project MCP server definitions.'
  },
  'claude.enterprise.managed-settings': {
    title: 'Claude Code managed settings file',
    summary: 'Includes policy-managed hooks, permissions, environment variables, and status line settings.'
  },
  'claude.enterprise.managed-mcp': {
    title: 'Claude Code managed MCP file',
    summary: 'Includes policy-managed MCP server definitions.'
  },
  'codex.user.config': {
    title: 'Codex config file',
    summary: 'Includes MCP servers and user-level Codex configuration.'
  },
  'codex.user.hooks': {
    title: 'Codex hooks file',
    summary: 'Includes user-level hook definitions.'
  },
  'codex.user.agents-md': {
    title: 'Codex user instructions',
    summary: 'Includes user-level Codex instructions.'
  },
  'codex.user.agents-directory': {
    title: 'Codex user agents directory',
    summary: 'Includes user-level custom Codex agents.'
  },
  'codex.user.codex-home-skills': {
    title: 'Codex user skills directory',
    summary: 'Includes user-level Codex skills under CODEX_HOME.'
  },
  'codex.user.shared-skills': {
    title: 'Shared user skills directory',
    summary: 'Includes user-level Codex skills.'
  },
  'codex.user.session-index': {
    title: 'Codex session index',
    summary: 'Includes Codex thread names and session index metadata.'
  },
  'codex.user.sessions': {
    title: 'Codex session history directory',
    summary: 'Includes Codex rollout session history.'
  },
  'codex.session.archived-sessions': {
    title: 'Codex archived session history directory',
    summary: 'Includes archived Codex rollout session history.'
  },
  'codex.project.agents-md': {
    title: 'Codex project instructions',
    summary: 'Includes project-level Codex instructions.'
  },
  'codex.project.config': {
    title: 'Codex project config file',
    summary: 'Includes project-level Codex configuration.'
  },
  'codex.project.hooks': {
    title: 'Codex project hooks file',
    summary: 'Includes project-level hook definitions.'
  },
  'codex.project.agents-directory': {
    title: 'Codex project agents directory',
    summary: 'Includes project-level custom Codex agents.'
  },
  'codex.project.skills': {
    title: 'Codex project skills directory',
    summary: 'Includes project-level Codex skills.'
  },
  'project.current-candidate': {
    title: 'Project source candidate',
    summary: 'Current project was checked for known project-level source files.',
    actionHint: 'Current project checked. Add a supported project-level source file to include it.'
  },
  'project.session-derived-candidate': {
    title: 'Project source candidate',
    summary: 'Referenced by local session history, but Berth has not scanned this project directory.',
    actionHint: 'Open this project, then Berth will scan its project-level sources.'
  }
} satisfies Record<BuiltInScanSourceCode, SourceCopy>

const ZH_SOURCE_COPY = {
  'claude.user.data-directory': {
    title: 'Claude Code 数据目录',
    summary:
      '包含指令、技能、子代理、命令、Hooks、插件、状态栏、会话、计划、待办、用量数据和集成状态。'
  },
  'claude.user.global-config': {
    title: 'Claude Code 全局配置文件',
    summary: '包含全局 MCP server 定义。'
  },
  'claude.project.directory': {
    title: '项目 Claude Code 目录',
    summary: '包含项目指令、技能、子代理、命令、Hooks、权限、环境变量和团队配置。'
  },
  'claude.project.mcp-config': {
    title: '项目 MCP 配置文件',
    summary: '包含项目级 MCP server 定义。'
  },
  'claude.enterprise.managed-settings': {
    title: 'Claude Code 托管设置文件',
    summary: '包含由策略管理的 Hooks、权限、环境变量和状态栏设置。'
  },
  'claude.enterprise.managed-mcp': {
    title: 'Claude Code 托管 MCP 文件',
    summary: '包含由策略管理的 MCP server 定义。'
  },
  'codex.user.config': {
    title: 'Codex 配置文件',
    summary: '包含 MCP servers 和用户级 Codex 配置。'
  },
  'codex.user.hooks': {
    title: 'Codex Hooks 文件',
    summary: '包含用户级 Hook 定义。'
  },
  'codex.user.agents-md': {
    title: 'Codex 用户指令',
    summary: '包含用户级 Codex 指令。'
  },
  'codex.user.agents-directory': {
    title: 'Codex 用户 agents 目录',
    summary: '包含用户级自定义 Codex agents。'
  },
  'codex.user.codex-home-skills': {
    title: 'Codex 用户 skills 目录',
    summary: '包含 CODEX_HOME 下的用户级 Codex skills。'
  },
  'codex.user.shared-skills': {
    title: '共享用户 skills 目录',
    summary: '包含用户级 Codex skills。'
  },
  'codex.user.session-index': {
    title: 'Codex 会话索引',
    summary: '包含 Codex 线程名称和会话索引元数据。'
  },
  'codex.user.sessions': {
    title: 'Codex 会话历史目录',
    summary: '包含 Codex rollout 会话历史。'
  },
  'codex.session.archived-sessions': {
    title: 'Codex 归档会话历史目录',
    summary: '包含归档后的 Codex rollout 会话历史。'
  },
  'codex.project.agents-md': {
    title: 'Codex 项目指令',
    summary: '包含项目级 Codex 指令。'
  },
  'codex.project.config': {
    title: 'Codex 项目配置文件',
    summary: '包含项目级 Codex 配置。'
  },
  'codex.project.hooks': {
    title: 'Codex 项目 Hooks 文件',
    summary: '包含项目级 Hook 定义。'
  },
  'codex.project.agents-directory': {
    title: 'Codex 项目 agents 目录',
    summary: '包含项目级自定义 Codex agents。'
  },
  'codex.project.skills': {
    title: 'Codex 项目 skills 目录',
    summary: '包含项目级 Codex skills。'
  },
  'project.current-candidate': {
    title: '项目来源候选',
    summary: '当前项目已经检查过已知项目级来源文件。',
    actionHint: '已检查当前项目。添加支持的项目级来源文件后会纳入。'
  },
  'project.session-derived-candidate': {
    title: '项目来源候选',
    summary: '这个目录来自本机会话历史, 但 Berth 没有扫描这个项目目录。',
    actionHint: '打开这个项目后, Berth 会扫描它的项目级来源。'
  }
} satisfies Record<BuiltInScanSourceCode, SourceCopy>

export function getScanSourceCopy(source: ScanRoot, language: string): SourceCopy {
  const dictionary: Partial<Record<ScanSourceCode, SourceCopy>> =
    language.startsWith('zh') ? ZH_SOURCE_COPY : EN_SOURCE_COPY
  if (source.code) {
    const copy = dictionary[source.code]
    if (copy) return copy
  }
  return {
    title: source.description ?? source.code ?? source.path,
    summary: source.summary ?? source.path
  }
}

export function getScanSourceStatusLabel(
  status: NonNullable<ScanRoot['status']>,
  language: string
): string {
  if (status === 'scanned') return language.startsWith('zh') ? '已扫描' : 'Scanned'
  if (status === 'missing') return language.startsWith('zh') ? '未发现' : 'Missing'
  return language.startsWith('zh') ? '未扫描' : 'Not scanned'
}

export function formatScanSourceStatusCount(
  status: ScanSourceStatus,
  count: number,
  language: string
): string {
  const label = getScanSourceStatusLabel(status, language)
  if (language.startsWith('zh')) return `${label} ${count}`
  return `${count} ${label}`
}
