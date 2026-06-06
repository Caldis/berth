/**
 * Agent-facing command surface for the scan engine (02-SPEC D12).
 *
 * Single source of truth consumed by the CLI dispatcher (P1.3) and the
 * `status` command so agents can introspect the available commands.
 * The engine is strictly read-only: every command is side-effect free.
 */
export interface EngineCommand {
  name: string
  summary: string
  sideEffectFree: boolean
}

export function engineCommandManifest(): EngineCommand[] {
  return [
    { name: 'scan', summary: 'Discover and parse all agent assets', sideEffectFree: true },
    { name: 'snapshot', summary: 'Return current in-memory snapshot without rescanning', sideEffectFree: true },
    { name: 'assets', summary: 'List and filter discovered assets', sideEffectFree: true },
    { name: 'sessions', summary: 'Enumerate sessions with filters', sideEffectFree: true },
    { name: 'search', summary: 'Full-text search across assets', sideEffectFree: true },
    { name: 'inspect', summary: 'Show a single asset with resolved relations', sideEffectFree: true },
    { name: 'health', summary: 'Run diagnostic health checks', sideEffectFree: true },
    { name: 'usage', summary: 'Token and cost analytics', sideEffectFree: true },
    { name: 'sources', summary: 'Scan-source coverage by agent', sideEffectFree: true },
    { name: 'status', summary: 'Lightweight runtime status without rescanning', sideEffectFree: true }
  ]
}
