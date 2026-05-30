<p align="center">
  <img src="docs/assets/logo-placeholder.svg" width="80" height="80" alt="Berth logo" />
</p>

<h1 align="center">Berth</h1>

<p align="center">
  <strong>Local AI Agent asset visualization and management tool</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#development">Development</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#ai-assisted-development">AI Workflow</a> ·
  <a href="docs/user-manual.md">User Manual</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## What is Berth?

As AI coding agents like Claude Code, Codex, and Cursor evolve, users accumulate dozens of local assets — skills, MCP servers, hooks, plugins, commands, memories, sessions — spread across multiple directories as plain text files. These assets are **installed and forgotten**, with no unified way to see what you have, how they relate, or how much you're spending.

**Berth** makes these invisible assets visible. It scans your local machine, discovers all your AI agent configurations, and presents them in a clean, Finder-inspired desktop interface.

> **v0.1** focuses on **Claude Code** with read-only asset visualization. No files are modified. No data leaves your machine.

## Features

- **Asset Discovery** — Automatically scans 25+ asset types from `~/.claude/` and project directories
- **Five Module Views** — Overview dashboard, Sessions, Instructions, Capabilities, Usage
- **Scope Merge Display** — See how user, project, and enterprise configurations merge together
- **Session Browser** — Browse all Claude Code sessions with metadata, loaded skills, MCP servers, and costs
- **Import Chain Resolution** — Visualize `@path` import chains in CLAUDE.md / AGENTS.md files
- **Usage Analytics** — Track spending, token usage, and rate limits with charts
- **Global Search** — Search across all assets by name, type, or scope (⌘K / Ctrl+K)
- **File Watching** — Real-time updates when asset files change on disk
- **Dark Mode** — Full dark/light/system theme support
- **i18n** — English and Chinese interface
- **Cross-Platform** — macOS and Windows

## Quick Start

### Download

Download the latest release for your platform from the [Releases](https://github.com/Caldis/berth/releases) page.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/Caldis/berth.git
cd berth

# Enable corepack so the pinned pnpm 9.x is used
# (corepack's default is pnpm 11, which skips native build scripts and breaks the build)
corepack enable

# Install dependencies (compiles better-sqlite3, downloads Electron)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm package
```

### Requirements

- **Node.js** 20+
- **pnpm** 9.x — auto-pinned via `corepack enable` (the repo declares `packageManager: pnpm@9.15.4`; do **not** use pnpm 10/11)
- **Claude Code** installed (Berth scans `~/.claude/`)

## Screenshots

> Screenshots coming soon

## Architecture

```
┌─────────────────────────────────────────┐
│ Renderer (React + TypeScript)           │
│  • shadcn/ui + Tailwind CSS             │
│  • Zustand state management             │
│  • react-router-dom navigation          │
│  • recharts for data visualization      │
│  • i18next for internationalization     │
└──────────┬──────────────────────────────┘
           │ IPC (contextIsolation)
┌──────────┴──────────────────────────────┐
│ Main Process (Electron + Node.js)       │
│  ┌─────────────────────────────────┐    │
│  │ Claude Code Adapter             │    │
│  │  • 25+ asset type scanners      │    │
│  │  • YAML/JSON/Markdown parsers   │    │
│  │  • @path import resolver        │    │
│  └─────────┬───────────────────────┘    │
│  ┌─────────┴───────────────────────┐    │
│  │ Asset Engine                    │    │
│  │  • Full scan + incremental      │    │
│  │  • chokidar file watching       │    │
│  │  • MiniSearch full-text index   │    │
│  │  • Relation resolver            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
           │ read-only fs access
┌─────────────────────────────────────────┐
│ ~/.claude/ + project .claude/ dirs      │
└─────────────────────────────────────────┘
```

## AI-Assisted Development

This repo ships an **AI Native Workflow harness** — a repo-contained workflow for developing Berth with AI coding agents (Claude Code and Codex), so a task can be picked up across sessions and across people without losing context.

### Where it lives

| Path | Purpose |
|------|---------|
| `.agents/workflow/*.md` | Single source of truth — the workflow playbooks (hand-written) |
| `.agents/README.md` | Harness overview and how distribution works |
| `.claude/commands/opsx/`, `.claude/skills/`, `.codex/skills/` | Generated entry points for each tool (symlinks + stubs) |
| `docs/ARCHITECTURE.md` | Project Map — process/module boundaries, IPC contract |
| `docs/works/` · `docs/friction/` · `docs/issues/` | Per-task state · captured engineering friction · product issues |
| `scripts/harness-sync.mjs` · `scripts/harness-check.mjs` | Regenerate distribution · validate it |

### Using it

The workflow is four phases — **Explore → Design → Implementation → Verify** — driven by slash commands. In Claude Code or Codex, from the repo root:

```
/opsx:new <task description>   # scaffold a task under docs/works/
/opsx:explore                  # gather context → 01-ANALYSIS.md
/opsx:design                   # tech design (asks you to clarify) → 02-SPEC.md + 03-PLAN.md
/opsx:implement                # build per the plan, with tests
/opsx:verify                   # full tests + review + UI acceptance
/opsx:archive                  # archive the task, commit
```

Humans steer at `design` (clarify intent) and `verify` (confirm acceptance); the agent runs the rest. Full command list and contract: see [`.agents/README.md`](.agents/README.md).

### Maintaining it

```bash
pnpm harness:sync     # regenerate command/skill distribution after editing .agents/workflow/*
pnpm harness:check    # validate task structure, naming, and distribution (also runs in CI)
```

After cloning, the distribution (symlinks + stubs) is already committed and works as-is — `harness:sync` is only needed when you change the playbooks.

## Development

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Electron 33 (electron-vite 5) |
| Frontend | React 19 + TypeScript 5.9 |
| UI | shadcn/ui + Tailwind CSS 3.4 |
| State | Zustand 5 |
| Router | react-router-dom 7 |
| Charts | Recharts 2 |
| i18n | i18next + react-i18next |
| Search | MiniSearch |
| Storage | better-sqlite3 |
| File Watch | chokidar |
| Unit Tests | Vitest |
| E2E Tests | Playwright |

### Project Structure

```
src/
├── main/                 # Electron main process
│   ├── adapters/         # Agent adapters (Claude Code)
│   ├── engine/           # Asset scanning, watching, search
│   └── ipc/              # IPC handler registration
├── preload/              # Context-isolated preload scripts
├── renderer/             # React application
│   └── src/
│       ├── components/   # UI components (layout, shared, ui)
│       ├── pages/        # Route page components
│       ├── stores/       # Zustand state stores
│       ├── hooks/        # Custom React hooks
│       ├── i18n/         # Translations (en, zh)
│       ├── lib/          # Utilities
│       └── styles/       # Global CSS + Tailwind
└── shared/               # Shared types between processes
    └── types/            # Asset model, IPC contracts
```

### Scripts

```bash
pnpm dev          # Start dev server with HMR
pnpm build        # Build for production
pnpm package      # Build + package installer
pnpm package:mac  # Package for macOS
pnpm package:win  # Package for Windows
pnpm test         # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:e2e     # Run E2E tests
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
```

## Security

Berth is designed with security as a first principle:

- **Read-only** — v0.1 never writes to any local files
- **Credential isolation** — OAuth tokens and API keys are never loaded into the renderer process. Only file existence is detected, marked as `sensitive: true`
- **Context isolation** — Electron best practices: `contextIsolation: true`, `nodeIntegration: false`
- **No telemetry** — Zero data leaves your machine. Fully local.
- **Path whitelist** — Scanner only accesses predefined paths

## Known Limitations

- Only Claude Code is supported in v0.1 (Codex/Cursor adapters planned for v0.3)
- Session content is not displayed (only metadata)
- Assets are read-only — editing comes in v0.2
- MCP server start/stop is not supported (v0.3)

## Roadmap

| Version | Focus |
|---------|-------|
| **v0.1** | Claude Code read-only asset visualization (current) |
| v0.2 | Asset editing + import chain visualization + cross-session search |
| v0.3 | Codex / Cursor adapters + unified cross-agent view |
| v0.4 | Team baseline export + config sync suggestions + MCP management |
| v0.5+ | Command palette / automation suggestions / mobile companion |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with ⚓ by <a href="https://github.com/Caldis">Caldis</a></sub>
</p>
