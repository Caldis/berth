/**
 * @berth/scan-engine — public entry.
 *
 * Read-only asset discovery & introspection engine for Claude Code and Codex.
 * Consumed by the berth Electron app, the `berth-scan` CLI, and agents.
 *
 * P1.1 establishes the package + build/test toolchain. The runtime API
 * (createScanEngine / selectors) and adapters are migrated in incrementally
 * (see docs/works/2026-06-06-gh-110-scan-engine-prod-upgrade/03-PLAN.md).
 */
export const SCAN_ENGINE_NAME = '@berth/scan-engine'
export const SCAN_ENGINE_VERSION = '0.1.0'

export { engineCommandManifest } from './capabilities'
export type { EngineCommand } from './capabilities'
export type {
  AgentAdapter,
  AgentAdapterDefinition,
  AgentAdapterSourcePolicy,
  AgentAdapterSourceSensitivity,
  AgentAdapterSourceStability,
  AgentAdapterVersionProbe
} from './adapter-api'
export { PLANNED_AGENT_ADAPTER_DEFINITIONS } from './adapters/planned-agent-definitions'
