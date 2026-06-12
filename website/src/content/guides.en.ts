import type { Article } from './types'

const CC_HOOKS = { title: 'Claude Code — Hooks guide', url: 'https://code.claude.com/docs/en/hooks-guide', note: 'Primary source; hook events and lifecycle.' }
const CC_SETTINGS = { title: 'Claude Code — Settings', url: 'https://code.claude.com/docs/en/settings', note: 'Primary source; settings.json including disableAllHooks.' }
const CC_COSTS = { title: 'Claude Code — Costs', url: 'https://code.claude.com/docs/en/costs', note: 'Primary source; how usage and cost are tracked.' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: 'Primary source; CLAUDE.md scopes and imports.' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: 'Primary source; project vs user scope for MCP servers.' }

export const guidesEn: Article[] = [
  {
    slug: 'why-isnt-my-hook-firing',
    pillar: 'guides',
    lang: 'en',
    order: 1,
    title: 'Why isn’t my hook firing?',
    summary: 'A short checklist to diagnose a hook that never runs — using what Berth shows you.',
    lead: 'A hook that silently never runs is one of the most common agent-config puzzles. Here is how to track it down with Berth.',
    body: [
      { type: 'h2', text: '1. Is the event name right?' },
      { type: 'p', text: 'Hooks fire on specific lifecycle events (e.g., PreToolUse before a tool call, PostToolUse after one). If the event name doesn’t match a real event, the hook never runs. Berth shows when each hook is set to fire.' },
      { type: 'h2', text: '2. Are hooks disabled globally?' },
      { type: 'p', text: 'A disableAllHooks setting turns every hook off at once. Berth’s health checks surface this — it’s the first thing to rule out.' },
      { type: 'h2', text: '3. Is the matcher too narrow?' },
      { type: 'p', text: 'Many hooks use a matcher to target specific tools. If the matcher doesn’t match the tool you’re using, nothing happens. Check the matcher against the tool name in the session replay’s tool events.' },
      { type: 'h2', text: '4. Does the command file exist?' },
      { type: 'p', text: 'A hook points at a command or script. If the path is wrong or the file is missing, the hook can’t run. Berth validates hook entry paths in health checks.' },
      { type: 'callout', label: 'The fast path', text: 'Open Capabilities → Hooks, read the lifecycle view and health checks for that hook, and you’ll usually find the broken link in under a minute.' },
    ],
    sources: [CC_HOOKS, CC_SETTINGS],
  },
  {
    slug: 'understand-your-cost',
    pillar: 'guides',
    lang: 'en',
    order: 2,
    title: 'Make sense of your cost',
    summary: 'Read Berth’s Usage screen to find what’s expensive and why — by model, project, and day.',
    lead: 'AI agent cost can feel like a mystery. Berth’s Usage screen turns it into three readable views.',
    body: [
      { type: 'h2', text: 'Start with the three breakdowns' },
      { type: 'list', items: [
        'By model — which models cost the most (e.g., a frontier model vs. a smaller one).',
        'By project — where the spend is going.',
        'By day — when it spiked.',
      ] },
      { type: 'h2', text: 'Tokens tell the story' },
      { type: 'p', text: 'Cost follows tokens: input, output, and cache. A session that re-reads large files every turn burns input tokens; long generations burn output tokens. Berth breaks tokens down so the cause is visible, not just the total.' },
      { type: 'h2', text: 'Mind the rate limits' },
      { type: 'p', text: 'Berth keeps rate-limit headroom in view, so a slowdown reads as "approaching a limit" rather than a mystery stall.' },
      { type: 'callout', label: 'When cost shows "unknown"', text: 'If a session lacks billing data, Berth shows "unknown" rather than a misleading $0 — so you know it’s missing, not free.' },
    ],
    sources: [CC_COSTS],
  },
  {
    slug: 'team-config-baseline',
    pillar: 'guides',
    lang: 'en',
    order: 3,
    title: 'Set a config baseline for your team',
    summary: 'Use scope and imports to give a team a shared, predictable agent setup — and verify it with health checks.',
    lead: 'When several people share a project, "it works on my machine" is a real risk. A clear scope baseline fixes that.',
    body: [
      { type: 'h2', text: '1. Decide what belongs at project scope' },
      { type: 'p', text: 'User-scope assets are personal; project-scope assets ship with the repo and apply to everyone. Put shared conventions, skills, and MCP servers at project scope so the whole team inherits them.' },
      { type: 'h2', text: '2. Import shared instructions' },
      { type: 'p', text: 'A project CLAUDE.md can import shared files via @path (for example, importing AGENTS.md). Berth resolves the import chain so you can confirm everyone actually receives the same instructions.' },
      { type: 'h2', text: '3. Verify with health checks' },
      { type: 'p', text: 'Before sharing, run through Berth’s health checks: missing imports, broken paths, and conflicting scope definitions all show up here. Fix them once, and the team starts from a known-good baseline.' },
      { type: 'callout', label: 'Why scope is the lever', text: 'Most "works for me but not for them" problems are scope problems. Seeing the effective, merged configuration is how you make a setup reproducible.' },
    ],
    sources: [CC_MEMORY, CC_MCP],
  },
]
