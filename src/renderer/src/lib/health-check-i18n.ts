import type { TFunction } from 'i18next'
import type { HealthCheck } from '@shared/types/ipc'

type TranslateValues = Record<string, string | number>

const EXACT_TEXT_KEYS: Record<string, string> = {
  'User CLAUDE.md not found': 'healthChecks.text.titles.userClaudeMdNotFound',
  'No user-level CLAUDE.md found.': 'healthChecks.text.messages.noUserClaudeMd',
  'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.': 'healthChecks.text.fixDescriptions.createUserClaudeMd',
  'Codex hook has no Windows command override': 'healthChecks.text.titles.codexHookNoWindowsCommand',
  'A command hook is configured without commandWindows on Windows.': 'healthChecks.text.messages.codexHookNoWindowsCommand',
  'Add commandWindows or command_windows when the command differs on Windows.': 'healthChecks.text.fixDescriptions.addCodexWindowsCommand',
  'Claude Code hook is missing command': 'healthChecks.text.titles.claudeHookMissingCommand',
  'PreToolUse contains a command hook without a command.': 'healthChecks.text.messages.claudeHookMissingCommand',
  'Add a command value or remove the hook entry.': 'healthChecks.text.fixDescriptions.addHookCommand',
  'Invalid Codex config.toml': 'healthChecks.text.titles.invalidCodexConfig',
  'config.toml contains invalid TOML.': 'healthChecks.text.messages.invalidCodexConfig',
  'Fix the TOML syntax in Codex config.toml.': 'healthChecks.text.fixDescriptions.fixCodexToml',
  'Skill is missing SKILL.md': 'healthChecks.text.titles.skillMissingEntryPoint',
  'Add SKILL.md or move non-skill files outside the skills directory.': 'healthChecks.text.fixDescriptions.addSkillEntryPoint',
  'Codex config schema comment is not declared': 'healthChecks.text.titles.codexConfigSchemaMissing',
  'config.toml does not include the official Codex TOML schema comment.': 'healthChecks.text.messages.codexConfigSchemaMissing',
  'Add Codex config schema': 'healthChecks.text.fixLabels.addCodexConfigSchema',
  'Add the official Codex TOML schema comment near the top of config.toml.': 'healthChecks.text.fixDescriptions.addCodexConfigSchema',
  'Claude settings schema is not declared': 'healthChecks.text.titles.claudeSettingsSchemaMissing',
  'Add Claude settings schema': 'healthChecks.text.fixLabels.addClaudeSettingsSchema',
  'Add the official Claude Code settings schema near the top of the JSON file.': 'healthChecks.text.fixDescriptions.addClaudeSettingsSchema',
  'Suggested fix': 'healthChecks.text.fixLabels.suggestedFix',
  'Codex skills': 'healthChecks.text.evidence.codexSkills',
  'Codex config reference': 'healthChecks.text.evidence.codexConfigReference',
  'Codex hooks': 'healthChecks.text.evidence.codexHooks',
  'Claude Code hooks': 'healthChecks.text.evidence.claudeHooks',
  'Claude Code settings': 'healthChecks.text.evidence.claudeSettings'
}

const PATTERN_TEXT_KEYS: Array<{
  pattern: RegExp
  key: string
  values: (match: RegExpMatchArray) => TranslateValues
}> = [
  {
    pattern: /^(.+) has no SKILL\.md entrypoint\.$/,
    key: 'healthChecks.text.messages.skillMissingEntryPoint',
    values: (match) => ({ name: match[1] })
  },
  {
    pattern: /^(.+) does not declare the Claude Code settings JSON schema\.$/,
    key: 'healthChecks.text.messages.claudeSettingsSchemaMissing',
    values: (match) => ({ name: match[1] })
  }
]

export function localizeHealthCheck(check: HealthCheck, t: TFunction): HealthCheck {
  const keys = check.i18nKeys
  const params = check.params
  return {
    ...check,
    title: localizeField(check.title, keys?.title, params, t),
    message: localizeField(check.message, keys?.message, params, t),
    suggestion: check.suggestion
      ? localizeField(check.suggestion, keys?.suggestion, params, t)
      : undefined,
    evidence: check.evidence?.map((evidence) => ({
      ...evidence,
      label: translateHealthCheckText(evidence.label, t)
    })),
    fix: check.fix
      ? {
          ...check.fix,
          label: localizeField(check.fix.label, keys?.fixLabel, params, t),
          description: localizeField(check.fix.description, keys?.fixDescription, params, t)
        }
      : undefined
  }
}

// Prefer the engine-emitted i18n key (GH #6 Phase-2 messageKey contract);
// fall back to legacy prose reverse-matching, then to the raw text. The legacy
// fallback keeps un-keyed prose localized while the engine is migrated and is
// removed once every prose field carries a key (Phase-2D).
function localizeField(
  text: string,
  key: string | undefined,
  params: TranslateValues | undefined,
  t: TFunction
): string {
  if (key) return t(key, { ...params, defaultValue: text })
  return translateHealthCheckText(text, t)
}

export function localizeHealthCheckScope(scope: string, t: TFunction): string {
  return t(`common.scope.${scope}`, { defaultValue: scope })
}

export function localizeHealthCheckConfidence(confidence: string, t: TFunction): string {
  return t(`healthChecks.text.confidence.${confidence}`, { defaultValue: confidence })
}

export function localizeHealthCheckAssetType(assetType: string, t: TFunction): string {
  return t(`healthChecks.text.assetTypes.${assetType}`, { defaultValue: assetType })
}

function translateHealthCheckText(text: string, t: TFunction): string {
  const exactKey = EXACT_TEXT_KEYS[text]
  if (exactKey) return t(exactKey, { defaultValue: text })

  for (const rule of PATTERN_TEXT_KEYS) {
    const match = text.match(rule.pattern)
    if (match) return t(rule.key, { ...rule.values(match), defaultValue: text })
  }

  return text
}
