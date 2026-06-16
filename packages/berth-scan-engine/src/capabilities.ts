/**
 * Agent-facing command surface for the scan engine (02-SPEC D12, CLI completion).
 *
 * Single source of truth consumed by the CLI dispatcher and the `help` / `status`
 * commands so agents can introspect and LEARN the full command surface — every
 * entry carries usage, args, flags and examples. The engine is strictly read-only:
 * every command is side-effect free.
 */

export interface EngineCommandParam {
  /** Token as written on the command line (e.g. `<query>`, `--scope`). */
  name: string
  description: string
  /** Positional args only: whether omitting it is an error. */
  required?: boolean
}

export interface EngineCommand {
  name: string
  summary: string
  sideEffectFree: boolean
  /** One-line usage string for `help <command>`. */
  usage: string
  /** Positional arguments, in order. */
  args?: EngineCommandParam[]
  /** Command-specific flags (global scope flags are documented once, separately). */
  flags?: EngineCommandParam[]
  /** Copy-pasteable examples. */
  examples?: string[]
  /** Non-default exit-code semantics worth calling out. */
  exitNotes?: string
}

/** Global flags accepted by every command (scope injection + output). */
export const GLOBAL_FLAGS: EngineCommandParam[] = [
  { name: '--home-dir <path>', description: 'Override the user home whose .claude/.codex are scanned.' },
  { name: '--codex-home <path>', description: 'Override the Codex home (CODEX_HOME).' },
  { name: '--project <path>', description: 'Project root for project-scoped assets.' },
  { name: '--extra-claude-dirs <list>', description: 'Extra .claude dirs (BERTH_EXTRA_CLAUDE_DIRS).' },
  { name: '--extra-codex-homes <list>', description: 'Extra Codex homes (BERTH_EXTRA_CODEX_HOMES).' },
  { name: '--json', description: 'Emit JSON (default). Output is always stable JSON for agents.' }
]

/** Exit-code contract, shared by all commands (deterministic for agent branching). */
export const EXIT_CODES: Array<{ code: number; meaning: string }> = [
  { code: 0, meaning: 'OK — command succeeded with data.' },
  { code: 1, meaning: 'ERROR — bad input, unknown command, or scan failure.' },
  { code: 2, meaning: 'NO_DATA — succeeded but the result set is empty.' },
  { code: 3, meaning: 'ATTENTION — succeeded but flagged issues (e.g. failing health checks).' }
]

export function engineCommandManifest(): EngineCommand[] {
  const scopeFlags: EngineCommandParam[] = [
    { name: '--scope <user|project|...>', description: 'Filter by asset scope.' },
    { name: '--agent <id>', description: 'Filter by agent id (claude-code, codex, …).' },
    { name: '--type <type>', description: 'Filter by asset type (skill, mcp-server, session, …).' },
    { name: '--category <category>', description: 'Filter by asset category.' }
  ]
  return [
    {
      name: 'scan',
      summary: 'Discover and parse all agent assets',
      sideEffectFree: true,
      usage: 'berth-scan scan [global-flags]',
      examples: ['berth-scan scan', 'berth-scan scan --project /repo/app --json'],
      exitNotes: '2 (NO_DATA) when nothing was discovered.'
    },
    {
      name: 'snapshot',
      summary: 'Index overview: stats + counts from a scan, without the full asset list',
      sideEffectFree: true,
      usage: 'berth-scan snapshot [global-flags]',
      examples: ['berth-scan snapshot']
    },
    {
      name: 'assets',
      summary: 'List and filter discovered assets',
      sideEffectFree: true,
      usage: 'berth-scan assets [--scope --agent --type --category]',
      flags: scopeFlags,
      examples: ['berth-scan assets --type skill', 'berth-scan assets --agent claude-code --scope user']
    },
    {
      name: 'sessions',
      summary: 'Enumerate sessions with filters',
      sideEffectFree: true,
      usage: 'berth-scan sessions [--agent --project --limit N]',
      flags: [
        { name: '--agent <id>', description: 'Filter by agent id.' },
        { name: '--project <path>', description: 'Only sessions under this project root.' },
        { name: '--limit <N>', description: 'Cap the number of sessions returned.' }
      ],
      examples: ['berth-scan sessions --limit 20', 'berth-scan sessions --agent codex']
    },
    {
      name: 'search',
      summary: 'Full-text search across assets',
      sideEffectFree: true,
      usage: 'berth-scan search <query> [--scope --agent --type --category]',
      args: [{ name: '<query>', description: 'Search query (or pass --query <q>).', required: true }],
      flags: scopeFlags,
      examples: ['berth-scan search "auth"', 'berth-scan search deploy --type skill'],
      exitNotes: '2 (NO_DATA) when no asset matches.'
    },
    {
      name: 'inspect',
      summary: 'Show a single asset with resolved relations',
      sideEffectFree: true,
      usage: 'berth-scan inspect <asset-id> [--relations --import-chain]',
      args: [{ name: '<asset-id>', description: 'Asset id (or pass --id <id>).', required: true }],
      flags: [
        { name: '--relations', description: 'Include resolved relations to other assets.' },
        { name: '--import-chain', description: 'Include the import/inheritance chain.' }
      ],
      examples: ['berth-scan inspect claude-code:skill:/x/foo', 'berth-scan inspect <id> --relations']
    },
    {
      name: 'health',
      summary: 'Run device-wide diagnostic health checks',
      sideEffectFree: true,
      usage: 'berth-scan health [global-flags]',
      examples: ['berth-scan health'],
      exitNotes: '3 (ATTENTION) when any check is failing/warning; 0 when all clear.'
    },
    {
      name: 'usage',
      summary: 'Token and cost analytics over sessions',
      sideEffectFree: true,
      usage: 'berth-scan usage [--days N --cost-mode <mode> --agent <view>]',
      flags: [
        { name: '--days <N>', description: 'Window in days (default 30).' },
        { name: '--cost-mode <auto|calculated|...>', description: 'Cost calculation mode.' },
        { name: '--agent <view>', description: 'Agent view filter.' }
      ],
      examples: ['berth-scan usage --days 7', 'berth-scan usage --cost-mode calculated']
    },
    {
      name: 'sources',
      summary: 'Scan-source coverage by agent',
      sideEffectFree: true,
      usage: 'berth-scan sources [--agent <id>]',
      flags: [{ name: '--agent <id>', description: 'Only sources for this agent.' }],
      examples: ['berth-scan sources', 'berth-scan sources --agent claude-code']
    },
    {
      name: 'status',
      summary: 'Engine name/version + command manifest, without scanning',
      sideEffectFree: true,
      usage: 'berth-scan status',
      examples: ['berth-scan status']
    },
    {
      name: 'version',
      summary: 'Engine name and version',
      sideEffectFree: true,
      usage: 'berth-scan version',
      examples: ['berth-scan version']
    },
    {
      name: 'help',
      summary: 'Full command manual, or detailed help for one command',
      sideEffectFree: true,
      usage: 'berth-scan help [command]',
      args: [{ name: '[command]', description: 'Show detailed help for this command.' }],
      examples: ['berth-scan help', 'berth-scan help search']
    }
  ]
}
