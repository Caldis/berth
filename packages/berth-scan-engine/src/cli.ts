/**
 * `berth-scan` CLI dispatcher (02-SPEC D12).
 *
 * Read-only, agent-friendly: stable JSON via `--json`, deterministic exit
 * codes (0 ok / 2 no-data / 1 error). Home/Codex/project are injectable for
 * fixture-based E2E (`--home-dir` / `--codex-home` / `--project`).
 */
import { parseArgs, EXIT, type ParsedArgs } from './cli-args'
import { engineCommandManifest } from './capabilities'
import { runScan, type ScanInput, type EngineSnapshot } from './engine-bridge'
import { SCAN_ENGINE_NAME, SCAN_ENGINE_VERSION } from './index'

type Flags = ParsedArgs['flags']

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function scanInputFromFlags(flags: Flags): ScanInput {
  return {
    homeDir: asString(flags['home-dir']),
    codexHome: asString(flags['codex-home']),
    projectDir: asString(flags.project),
    extraClaudeDirs: asString(flags['extra-claude-dirs']),
    extraCodexHomes: asString(flags['extra-codex-homes'])
  }
}

function write(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

function serializeAsset(asset: EngineSnapshot['assets'][number]): Record<string, unknown> {
  // Drop `raw` to keep output compact and avoid leaking large file bodies.
  const rest: Record<string, unknown> = { ...asset }
  delete rest.raw
  return rest
}

function filterAssets(snapshot: EngineSnapshot, flags: Flags): EngineSnapshot['assets'] {
  let assets = snapshot.assets
  const scope = asString(flags.scope)
  const agent = asString(flags.agent)
  const type = asString(flags.type)
  const category = asString(flags.category)
  if (scope) assets = assets.filter((a) => a.scope === scope)
  if (agent) assets = assets.filter((a) => a.agentId === agent)
  if (type) assets = assets.filter((a) => a.type === type)
  if (category) assets = assets.filter((a) => a.category === category)
  return assets
}

const UNWIRED = new Set(['sessions', 'search', 'inspect', 'health', 'usage', 'snapshot'])

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv)
  const { command, flags } = parsed

  if (!command || command === 'help' || flags.help === true) {
    write({ name: SCAN_ENGINE_NAME, version: SCAN_ENGINE_VERSION, commands: engineCommandManifest() })
    return EXIT.OK
  }
  if (command === 'version' || flags.version === true) {
    write({ name: SCAN_ENGINE_NAME, version: SCAN_ENGINE_VERSION })
    return EXIT.OK
  }
  if (command === 'status') {
    write({ name: SCAN_ENGINE_NAME, version: SCAN_ENGINE_VERSION, commands: engineCommandManifest() })
    return EXIT.OK
  }

  try {
    const input = scanInputFromFlags(flags)
    if (command === 'scan') {
      const snapshot = await runScan(input)
      write({
        projectDir: snapshot.projectDir ?? null,
        stats: snapshot.stats,
        assets: snapshot.assets.map(serializeAsset),
        errors: snapshot.errors,
        sources: snapshot.sources,
        projectCandidates: snapshot.projectCandidates
      })
      return snapshot.assets.length > 0 ? EXIT.OK : EXIT.NO_DATA
    }
    if (command === 'assets') {
      const snapshot = await runScan(input)
      const assets = filterAssets(snapshot, flags)
      write({ assets: assets.map(serializeAsset), stats: snapshot.stats, count: assets.length })
      return assets.length > 0 ? EXIT.OK : EXIT.NO_DATA
    }
    if (command === 'sources') {
      const snapshot = await runScan(input)
      const agent = asString(flags.agent)
      const sources = agent ? snapshot.sources.filter((s) => s.agentId === agent) : snapshot.sources
      write({ sources })
      return EXIT.OK
    }
    if (UNWIRED.has(command)) {
      write({ error: { code: 'not-implemented', message: `Command "${command}" is not yet wired into the CLI (planned).` } })
      return EXIT.ERROR
    }
    write({ error: { code: 'unknown-command', message: `Unknown command: ${command}` } })
    return EXIT.ERROR
  } catch (err) {
    write({ error: { code: 'scan-error', message: err instanceof Error ? err.message : String(err) } })
    return EXIT.ERROR
  }
}
