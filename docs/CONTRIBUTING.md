# Contributing to Berth

Thank you for your interest in contributing to Berth! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Development Setup

```bash
git clone https://github.com/Caldis/berth.git
cd berth
pnpm install
pnpm dev
```

## Development Workflow

### Branch Naming

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes
- `refactor/description` — Code refactoring

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add MCP server status indicators
fix: correct session duration calculation
docs: update installation instructions
refactor: extract scope badge component
```

### Pull Requests

1. Create a feature branch from `master`
2. Make your changes
3. Run `pnpm typecheck` and `pnpm test` to verify
4. Submit a PR with a clear description

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
│   ├── adapters/   # Agent adapters (Claude Code scanner)
│   ├── engine/     # Asset scanning, watching, search
│   └── ipc/        # IPC handler registration
├── preload/        # Preload scripts (context bridge)
├── renderer/       # React application
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages
│       ├── stores/      # Zustand state
│       ├── hooks/       # React hooks
│       └── i18n/        # Translations
└── shared/         # Shared types
```

## Key Design Principles

1. **Read-only** — Never write to user's files (v0.1)
2. **Credentials are radioactive** — Never read credential content, only detect existence
3. **Scope merge** — Always show merged configuration with source annotations
4. **Graceful degradation** — Individual parser failures should not crash the app
5. **Local-first** — No telemetry, no cloud, no accounts

## Adding a New Asset Type

1. Add the type to `src/shared/types/asset.ts`
2. Create a parser in `src/main/adapters/claude-code/parsers.ts`
3. Register it in the scanner's category map
4. Add UI representation in the appropriate page component
5. Add translations to both `en.json` and `zh.json`
6. Write tests

## Adding a New Agent Adapter

Adapters live in `src/main/adapters/`. Implement the `AgentAdapter` interface from `src/shared/types/asset.ts`:

```typescript
interface AgentAdapter {
  readonly id: string
  readonly displayName: string
  detect(): Promise<DetectResult>
  scanRoots(): Promise<ScanRoot[]>
  scanAssets(category: AssetCategory): Promise<Asset[]>
  watchAssets(callback: (event: WatchEvent) => void): { dispose(): void }
  resolveRelations(asset: Asset): Promise<Relation[]>
}
```

## i18n

All user-facing text must use i18next translation keys. Add entries to both:
- `src/renderer/src/i18n/locales/en.json`
- `src/renderer/src/i18n/locales/zh.json`

## Testing

- **Unit tests**: `tests/unit/` — Run with `pnpm test`
- **E2E tests**: `tests/e2e/` — Run with `pnpm test:e2e`
- Write tests for all parsers and utility functions
- E2E tests should cover navigation and security checks

## Code Style

- TypeScript strict mode
- Tailwind CSS utility classes (no inline styles)
- shadcn/ui component patterns
- Functional React components with hooks
- Zustand for global state

## Reporting Issues

Please use [GitHub Issues](https://github.com/Caldis/berth/issues) to report bugs or request features. Include:
- OS and version
- Berth version
- Steps to reproduce
- Expected vs actual behavior
