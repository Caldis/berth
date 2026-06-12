import type { Article } from './types'

const CC_OVERVIEW = { title: 'Claude Code — Overview', url: 'https://code.claude.com/docs/en/overview', note: 'Primary source for what Claude Code is and the assets it uses.' }
const CC_SKILLS = { title: 'Claude Code — Skills', url: 'https://code.claude.com/docs/en/skills', note: 'Primary source; SKILL.md structure and progressive disclosure.' }
const CC_SUBAGENTS = { title: 'Claude Code — Subagents', url: 'https://code.claude.com/docs/en/sub-agents', note: 'Primary source; isolated specialized assistants.' }
const CC_HOOKS = { title: 'Claude Code — Hooks guide', url: 'https://code.claude.com/docs/en/hooks-guide', note: 'Primary source; lifecycle shell commands.' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: 'Primary source; CLAUDE.md scopes and imports.' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: 'Primary source; connecting external tools and data.' }
const MCP_INTRO = { title: 'Model Context Protocol — Introduction', url: 'https://modelcontextprotocol.io/docs/getting-started/intro', note: 'Primary source; the "USB-C for AI" framing.' }

export const featuresEn: Article[] = [
  {
    slug: 'asset-model',
    pillar: 'features',
    lang: 'en',
    order: 1,
    title: 'The asset model: what Berth actually shows you',
    summary: 'Berth turns the plain-text files behind your agents into structured, connected objects it calls assets. Here is the model.',
    lead: 'Everything in Berth is built on one idea: the files that shape how your AI agent behaves are assets — and assets deserve to be visible, searchable, and related to one another.',
    body: [
      { type: 'p', text: 'An asset is any file or configuration that shapes how an AI agent works. Berth groups them into two families you will see throughout the app.' },
      { type: 'h2', text: 'Instructions — what the agent should do' },
      { type: 'p', text: 'Memories (CLAUDE.md / AGENTS.md), Skills, Subagents, Commands, Output Modes, and Agent Teams. These are the text that guides behavior before and during work.' },
      { type: 'h2', text: 'Capabilities — what the agent is able to do' },
      { type: 'p', text: 'MCP servers, Hooks, Permissions, Environment variables, Status lines, and Plugins. These define the agent’s runtime powers and boundaries.' },
      { type: 'callout', label: 'The point', text: 'Scattered text files become first-class objects you can browse, search, and trace — with the relationships between them made visible.' },
      { type: 'p', text: 'Berth is read-only: it reads these files to display them and never writes to them. Credentials such as API keys are detected for status only and never shown.' },
    ],
    sources: [CC_OVERVIEW, CC_MEMORY],
  },
  {
    slug: 'overview-and-sessions',
    pillar: 'features',
    lang: 'en',
    order: 2,
    title: 'Overview & Sessions: see activity and history',
    summary: 'The dashboard at a glance, and how to walk back through past sessions with the assets and tools each one used.',
    lead: 'Two of Berth’s screens answer the everyday questions: "what do I have right now?" and "what happened in that session?"',
    body: [
      { type: 'h2', text: 'Overview' },
      { type: 'p', text: 'A single dashboard: how many Skills, MCP servers and plugins you have, your most recent sessions, this week’s spend, and health checks that flag config problems.' },
      { type: 'h2', text: 'Sessions' },
      { type: 'p', text: 'Browse past sessions grouped by project or date. Each session shows the skills it loaded, the MCP servers it connected, the hooks that fired, and the artifacts it produced (plans, todos, file history) — and you can replay the whole session event by event: user messages, assistant replies, thinking and tool calls play back in order on a canvas timeline, with type filters, search and export.' },
      { type: 'callout', label: 'Why sessions matter', text: 'A session is the complete record of one agent run. Reading it back is how you learn what your setup actually did — and what it cost.' },
    ],
    sources: [CC_OVERVIEW],
  },
  {
    slug: 'configuration-instructions',
    pillar: 'features',
    lang: 'en',
    order: 3,
    title: 'Configuration · Instructions: memories, skills, subagents',
    summary: 'The instruction assets that guide your agent — and how Berth shows their scope, imports, and where each one comes from.',
    lead: 'Instructions are the text that tells your agent what to do. Berth lays them out so you can see what is loaded, from which scope, and how files chain together.',
    body: [
      { type: 'h2', text: 'Memories' },
      { type: 'p', text: 'CLAUDE.md and AGENTS.md are durable instructions the agent reads at the start of work. Berth shows their scope (user / project / enterprise) and resolves the @path import chain — including broken links.' },
      { type: 'h2', text: 'Skills' },
      { type: 'p', text: 'A Skill packages a reusable procedure in a SKILL.md (plus optional scripts). Claude loads only the name/description until the skill is relevant — "progressive disclosure" — so long procedures cost almost nothing until needed.' },
      { type: 'h2', text: 'Subagents' },
      { type: 'p', text: 'A subagent is a specialized assistant with its own context window, system prompt, and allowed tools. The main agent delegates focused work to it and gets back a summary — keeping the main conversation clean.' },
      { type: 'callout', label: 'Scope merge', text: 'The same asset can be defined at user, project, and enterprise levels. Berth shows which one wins and flags conflicts, so the effective configuration is never a guess.' },
    ],
    sources: [CC_MEMORY, CC_SKILLS, CC_SUBAGENTS],
  },
  {
    slug: 'configuration-capabilities',
    pillar: 'features',
    lang: 'en',
    order: 4,
    title: 'Configuration · Capabilities: MCP, hooks, permissions',
    summary: 'The capability assets that give your agent power and set its boundaries — MCP servers, lifecycle hooks, and permissions.',
    lead: 'Capabilities are what your agent can actually do. Berth makes the powers and the guardrails visible side by side.',
    body: [
      { type: 'h2', text: 'MCP servers' },
      { type: 'p', text: 'MCP (Model Context Protocol) is an open standard for connecting agents to external tools and data — the official docs call it "a USB-C port for AI." Berth lists each connected server, its transport, and merge conflicts when the same server is defined at multiple scopes.' },
      { type: 'h2', text: 'Hooks' },
      { type: 'p', text: 'Hooks are shell commands that run at specific lifecycle moments (e.g., before or after a tool call). They give deterministic control — making sure something always happens rather than hoping the model chooses to do it. Berth shows when each hook fires and validates it.' },
      { type: 'h2', text: 'Permissions' },
      { type: 'p', text: 'Allow / ask / deny rules define what the agent may do without asking, what needs confirmation, and what is blocked. Berth surfaces dangerously broad rules and shows which scope overrides which.' },
      { type: 'callout', label: 'Powers and limits, together', text: 'Seeing capabilities next to permissions is how you tell a powerful setup from a dangerous one.' },
    ],
    sources: [CC_MCP, MCP_INTRO, CC_HOOKS],
  },
  {
    slug: 'usage-health-privacy',
    pillar: 'features',
    lang: 'en',
    order: 5,
    title: 'Usage, health checks & privacy',
    summary: 'Cost and token trends, automated diagnostics, and the read-only / local-first guarantees behind it all.',
    lead: 'The last group of features keeps you informed and safe: what you are spending, what is misconfigured, and how Berth protects your data.',
    body: [
      { type: 'h2', text: 'Usage' },
      { type: 'p', text: 'Cost and token trends by model, by project, and by day, with rate-limit headroom kept in plain sight. When a session lacks cost data, Berth shows "unknown" rather than a misleading $0.' },
      { type: 'h2', text: 'Health checks' },
      { type: 'p', text: 'Automated local diagnostics catch common problems: syntax errors, missing required fields, broken @path imports, and unsafe settings — each with a severity and, where possible, a suggested fix.' },
      { type: 'h2', text: 'Privacy & read-only' },
      { type: 'p', text: 'Berth runs entirely on your machine: no telemetry, no cloud sync, no account. Berth never modifies a file, and credentials are detected for status only — never displayed.' },
      { type: 'callout', label: 'Local-first by design', text: 'Your agent configuration is sensitive. Berth is built so that understanding it never means sending it anywhere.' },
    ],
    sources: [CC_OVERVIEW],
  },
]
