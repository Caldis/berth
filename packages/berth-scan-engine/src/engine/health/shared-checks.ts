// Agent-neutral check infrastructure shared by the Claude and Codex providers:
// JSON config parsing, MCP server validation, instruction @import resolution,
// and skill directory / frontmatter validation.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as fs from 'fs'
import * as path from 'path'
import { extractAtImports } from '@shared/object-guards'
import type { AssetScope } from '@shared/types/asset'
import type { HealthCheck } from '@shared/types/ipc'
import { asRecord, hashString, slug, stringValue } from './value-guards'
import { dirExists, fileExists } from './fs-utils'
import { readMarkdownFrontmatter } from './markdown'
import { makeCheck } from './make-check'

export function checkJsonConfig(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope,
  label: string,
  title: string,
  suggestion: string,
  i18nKeys?: { title: string; suggestion: string }
): Record<string, unknown> | undefined {
  if (!fileExists(filePath)) return undefined
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return asRecord(parsed) ?? {}
  } catch (err) {
    checks.push(makeCheck({
      id: `${agentId}:syntax:${scope}-${label}-invalid`,
      severity: 'error',
      category: 'syntax',
      agentId,
      title,
      message: err instanceof Error ? err.message : `${path.basename(filePath)} contains invalid JSON.`,
      suggestion,
      scope,
      path: filePath,
      assetType: label === 'mcp' ? 'mcp-server' : 'hook',
      i18nKeys: i18nKeys && {
        title: i18nKeys.title,
        // Raw JSON parser errors have no stable key; only the fallback prose does.
        message: err instanceof Error ? undefined : 'healthChecks.text.messages.invalidJson',
        suggestion: i18nKeys.suggestion
      },
      params: err instanceof Error ? undefined : { name: path.basename(filePath) }
    }))
    return undefined
  }
}

export function checkMcpServers(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  config: Record<string, unknown>,
  key: 'mcpServers' | 'mcp_servers',
  scope: AssetScope,
  filePath: string
): void {
  const servers = asRecord(config[key])
  if (!servers) return
  for (const [name, serverConfig] of Object.entries(servers)) {
    const record = asRecord(serverConfig)
    if (!record) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-mcp-${slug(name)}-invalid`,
        severity: 'error',
        category: 'structure',
        agentId,
        title: 'MCP server config is invalid',
        message: `${name} is not an object.`,
        suggestion: 'Replace the MCP server entry with an object config.',
        scope,
        path: filePath,
        assetType: 'mcp-server',
        i18nKeys: {
          title: 'healthChecks.text.titles.mcpServerInvalid',
          message: 'healthChecks.text.messages.mcpServerInvalid',
          suggestion: 'healthChecks.text.suggestions.mcpServerInvalid'
        },
        params: { name }
      }))
      continue
    }
    const hasTransport =
      typeof record.command === 'string' ||
      typeof record.url === 'string' ||
      typeof record.type === 'string' ||
      typeof record.transport === 'string'
    if (!hasTransport) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-mcp-${slug(name)}-missing-transport`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'MCP server has no transport',
        message: `${name} has no command, url, type, or transport field.`,
        suggestion: 'Add the transport field required by the agent configuration.',
        scope,
        path: filePath,
        assetType: 'mcp-server',
        i18nKeys: {
          title: 'healthChecks.text.titles.mcpServerNoTransport',
          message: 'healthChecks.text.messages.mcpServerNoTransport',
          suggestion: 'healthChecks.text.suggestions.mcpServerNoTransport'
        },
        params: { name }
      }))
    }
  }
}

export function checkInstructionImports(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope,
  fileType: 'claude-md' | 'agents-md'
): void {
  if (!fileExists(filePath)) return
  let raw = ''
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    checks.push(makeCheck({
      id: `${agentId}:source:${scope}-${fileType}-unreadable-${hashString(filePath)}`,
      severity: 'error',
      category: 'source',
      agentId,
      title: 'Instruction file is unreadable',
      message: err instanceof Error ? err.message : 'Unable to read instruction file.',
      suggestion: 'Check file permissions and try again.',
      scope,
      path: filePath,
      assetType: fileType,
      i18nKeys: {
        title: 'healthChecks.text.titles.instructionFileUnreadable',
        // Raw fs errors have no stable key; only the fallback prose does.
        message: err instanceof Error ? undefined : 'healthChecks.text.messages.instructionFileUnreadable',
        suggestion: 'healthChecks.text.suggestions.instructionFileUnreadable'
      }
    }))
    return
  }

  for (const importPath of extractAtImports(raw)) {
    const resolved = path.isAbsolute(importPath)
      ? importPath
      : path.resolve(path.dirname(filePath), importPath)
    if (fileExists(resolved)) continue
    checks.push(makeCheck({
      id: `${agentId}:reference:${scope}-${fileType}-missing-import-${hashString(resolved)}`,
      severity: 'warning',
      category: 'reference',
      agentId,
      title: 'Instruction import is missing',
      message: `${importPath} referenced by ${path.basename(filePath)} does not exist.`,
      suggestion: 'Create the imported file or remove the @path reference.',
      scope,
      path: filePath,
      assetType: fileType,
      i18nKeys: {
        title: 'healthChecks.text.titles.instructionImportMissing',
        message: 'healthChecks.text.messages.instructionImportMissing',
        suggestion: 'healthChecks.text.suggestions.instructionImportMissing'
      },
      params: { importPath, file: path.basename(filePath) }
    }))
  }
}

export function checkSkillDirectories(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  skillsDir: string,
  scope: AssetScope
): void {
  if (!dirExists(skillsDir)) return
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillDir = path.join(skillsDir, entry.name)
    const skillMd = path.join(skillDir, 'SKILL.md')
    if (!fileExists(skillMd)) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-skill-${slug(entry.name)}-missing-entrypoint`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'Skill is missing SKILL.md',
        message: `${entry.name} has no SKILL.md entrypoint.`,
        suggestion: 'Add SKILL.md or move non-skill files outside the skills directory.',
        scope,
        path: skillDir,
        assetType: 'skill',
        i18nKeys: {
          title: 'healthChecks.text.titles.skillMissingEntryPoint',
          message: 'healthChecks.text.messages.skillMissingEntryPoint',
          suggestion: 'healthChecks.text.fixDescriptions.addSkillEntryPoint'
        },
        params: { name: entry.name }
      }))
      continue
    }
    checkSkillFrontmatter(checks, agentId, skillMd, scope)
  }
}

function checkSkillFrontmatter(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope
): void {
  const parsed = readMarkdownFrontmatter(filePath)
  if (parsed.error) {
    checks.push(makeCheck({
      id: `${agentId}:syntax:${scope}-skill-${slug(path.basename(path.dirname(filePath)))}-frontmatter-invalid`,
      severity: 'warning',
      category: 'syntax',
      agentId,
      title: 'Skill frontmatter is invalid',
      message: parsed.error,
      suggestion: 'Fix the YAML frontmatter in SKILL.md.',
      scope,
      path: filePath,
      assetType: 'skill',
      i18nKeys: {
        title: 'healthChecks.text.titles.skillFrontmatterInvalid',
        // Raw YAML parser errors have no stable key; only title/suggestion do.
        suggestion: 'healthChecks.text.suggestions.skillFrontmatterInvalid'
      }
    }))
  }
  if (agentId === 'codex' && !parsed.error) {
    const missing = [
      stringValue(parsed.frontmatter?.name) ? '' : 'name',
      stringValue(parsed.frontmatter?.description) ? '' : 'description'
    ].filter(Boolean)
    if (missing.length > 0) {
      checks.push(makeCheck({
        id: `codex:structure:${scope}-skill-${slug(path.basename(path.dirname(filePath)))}-frontmatter-missing-required`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'Codex skill metadata is incomplete',
        message: `SKILL.md is missing required Codex field(s): ${missing.join(', ')}.`,
        suggestion: 'Add name and description frontmatter to SKILL.md.',
        scope,
        path: filePath,
        assetType: 'skill',
        confidence: 'high',
        i18nKeys: {
          title: 'healthChecks.text.titles.codexSkillIncomplete',
          message: 'healthChecks.text.messages.codexSkillIncomplete',
          suggestion: 'healthChecks.text.suggestions.codexSkillIncomplete'
        },
        params: { fields: missing.join(', ') }
      }))
    }
  }
}
