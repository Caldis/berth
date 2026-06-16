/**
 * `berth-scan` CLI dispatcher (02-SPEC D12, CLI completion).
 *
 * Read-only, agent-friendly: stable JSON output, deterministic exit codes
 * (0 ok / 1 error / 2 no-data / 3 attention). Every command runs a one-shot scan
 * and derives its result from the snapshot via the SAME engine functions the GUI
 * runtime uses (search / health / usage / relations / session-detail), so the CLI
 * is a full standalone surface — no GUI required. Home/Codex/project are injectable
 * (`--home-dir` / `--codex-home` / `--project`) for fixture-based E2E.
 */
import { parseArgs, EXIT, type ParsedArgs } from './cli-args'
import { engineCommandManifest, GLOBAL_FLAGS, EXIT_CODES } from './capabilities'
import { runScan, type ScanInput } from './engine-bridge'
import { SCAN_ENGINE_NAME, SCAN_ENGINE_VERSION } from './index'
import { getSearch } from './engine/search'
import { runHealthChecks } from './engine/health'
import { buildUsageSummary } from './engine/usage'
import { resolveRelations, buildImportChain } from './engine/relations'
import { buildSessionDetail, toSessionSummary } from './engine/session-detail'
import type { Asset, CostMode } from '@shared/types/asset'

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

function serializeAsset(asset: Asset): Record<string, unknown> {
  // Drop `raw` to keep output compact and avoid leaking large file bodies.
  const rest: Record<string, unknown> = { ...asset }
  delete rest.raw
  return rest
}

/** Shared scope/agent/type/category filtering over a flat asset list. */
function filterAssetList(assets: Asset[], flags: Flags): Asset[] {
  let out = assets
  const scope = asString(flags.scope)
  const agent = asString(flags.agent)
  const type = asString(flags.type)
  const category = asString(flags.category)
  if (scope) out = out.filter((a) => a.scope === scope)
  if (agent) out = out.filter((a) => a.agentId === agent)
  if (type) out = out.filter((a) => a.type === type)
  if (category) out = out.filter((a) => a.category === category)
  return out
}

/** Manual payload: full command list, or detailed help for one command. */
function helpPayload(commandName?: string): Record<string, unknown> {
  const commands = engineCommandManifest()
  if (commandName) {
    const cmd = commands.find((c) => c.name === commandName)
    if (!cmd) {
      return { error: { code: 'unknown-command', message: `Unknown command: ${commandName}` } }
    }
    return { command: cmd, globalFlags: GLOBAL_FLAGS, exitCodes: EXIT_CODES }
  }
  return {
    name: SCAN_ENGINE_NAME,
    version: SCAN_ENGINE_VERSION,
    commands,
    globalFlags: GLOBAL_FLAGS,
    exitCodes: EXIT_CODES
  }
}

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv)
  const { command, positionals, flags } = parsed

  if (!command || command === 'help' || flags.help === true) {
    // `help`, `--help`, no command, or `<command> --help` all reach the manual.
    const target = command && command !== 'help' ? command : positionals[0]
    const payload = helpPayload(asString(flags.command) ?? target)
    write(payload)
    return 'error' in payload ? EXIT.ERROR : EXIT.OK
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

    if (command === 'snapshot') {
      const snapshot = await runScan(input)
      write({
        projectDir: snapshot.projectDir ?? null,
        stats: snapshot.stats,
        counts: {
          assets: snapshot.assets.length,
          errors: snapshot.errors.length,
          sources: snapshot.sources.length
        }
      })
      return snapshot.assets.length > 0 ? EXIT.OK : EXIT.NO_DATA
    }

    if (command === 'assets') {
      const snapshot = await runScan(input)
      const assets = filterAssetList(snapshot.assets, flags)
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

    if (command === 'sessions') {
      const snapshot = await runScan(input)
      let sessions = snapshot.assets.filter((a) => a.type === 'session')
      const agent = asString(flags.agent)
      if (agent) sessions = sessions.filter((a) => a.agentId === agent)
      const project = asString(flags.project)
      if (project) {
        sessions = sessions.filter((a) => typeof a.meta?.cwd === 'string' && a.meta.cwd.startsWith(project))
      }
      const limitRaw = asString(flags.limit)
      const limit = limitRaw ? Number(limitRaw) : undefined
      if (limit !== undefined && Number.isFinite(limit) && limit >= 0) sessions = sessions.slice(0, limit)
      write({ sessions: sessions.map(toSessionSummary), count: sessions.length })
      return sessions.length > 0 ? EXIT.OK : EXIT.NO_DATA
    }

    if (command === 'search') {
      const query = positionals[0] ?? asString(flags.query)
      if (!query) {
        write({ error: { code: 'missing-query', message: 'search requires a <query> argument' } })
        return EXIT.ERROR
      }
      const snapshot = await runScan(input)
      const all = getSearch().search(query, snapshot.assets)
      const kept = new Set(filterAssetList(all.map((r) => r.asset), flags).map((a) => a.id))
      const results = all.filter((r) => kept.has(r.asset.id))
      write({ query, count: results.length, results: results.map((r) => ({ ...r, asset: serializeAsset(r.asset) })) })
      return results.length > 0 ? EXIT.OK : EXIT.NO_DATA
    }

    if (command === 'inspect') {
      const id = positionals[0] ?? asString(flags.id)
      if (!id) {
        write({ error: { code: 'missing-id', message: 'inspect requires an <asset-id> argument' } })
        return EXIT.ERROR
      }
      const snapshot = await runScan(input)
      const asset = snapshot.assets.find((a) => a.id === id)
      if (!asset) {
        write({ error: { code: 'not-found', message: `No asset with id: ${id}` } })
        return EXIT.NO_DATA
      }
      const out: Record<string, unknown> = { asset: serializeAsset(asset) }
      if (flags.relations === true) out.relations = resolveRelations(asset, snapshot.assets)
      if (flags['import-chain'] === true && asset.path) out.importChain = buildImportChain(asset.path)
      if (asset.type === 'session') out.session = buildSessionDetail(asset, snapshot.assets)
      write(out)
      return EXIT.OK
    }

    if (command === 'health') {
      const snapshot = await runScan(input)
      const checks = runHealthChecks({
        projectDir: snapshot.projectDir,
        assets: snapshot.assets,
        scanErrors: snapshot.errors
      })
      write({ checks, count: checks.length })
      // Any non-info check is something the agent should look at → ATTENTION.
      return checks.some((c) => c.severity !== 'info') ? EXIT.ATTENTION : EXIT.OK
    }

    if (command === 'usage') {
      const snapshot = await runScan(input)
      const daysRaw = asString(flags.days)
      const days = daysRaw && Number.isFinite(Number(daysRaw)) ? Number(daysRaw) : 30
      const costMode = asString(flags['cost-mode']) as CostMode | undefined
      const sessions = snapshot.assets.filter((a) => a.type === 'session')
      const summary = buildUsageSummary(sessions, { days, costMode, projectPath: input.projectDir })
      write({ usage: summary })
      return EXIT.OK
    }

    write({ error: { code: 'unknown-command', message: `Unknown command: ${command}` } })
    return EXIT.ERROR
  } catch (err) {
    write({ error: { code: 'scan-error', message: err instanceof Error ? err.message : String(err) } })
    return EXIT.ERROR
  }
}
