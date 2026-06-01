// scripts/harness-sync.mjs
// 幂等分发: 生成 .agents/skills/*/SKILL.md
// + .claude/skills 的相对软链 (Windows/EPERM 回退复制)。
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  readlinkSync,
  lstatSync,
  cpSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGACY_SKILL_PREFIXES, VERBS, skillMdContent, skillName } from './harness-lib.mjs'

// 期望产物描述符
export function desiredArtifacts(root) {
  const items = []
  for (const v of VERBS) {
    const name = skillName(v)
    items.push({
      kind: 'file',
      path: join(root, '.agents/skills', name, 'SKILL.md'),
      content: skillMdContent(v)
    })
    items.push({
      kind: 'link',
      path: join(root, '.claude/skills', name),
      target: `../../.agents/skills/${name}`
    })
  }
  return items
}

function normalizeText(value) {
  return value.replace(/\r\n/g, '\n')
}

function fileInSync(path, content) {
  return existsSync(path) && normalizeText(readFileSync(path, 'utf8')) === normalizeText(content)
}

function legacyCommandPaths(root) {
  return LEGACY_SKILL_PREFIXES.flatMap((prefix) =>
    VERBS.flatMap((v) => [
      join(root, '.claude/commands', `${prefix}-${v}.md`),
      join(root, '.claude/commands', prefix, `${v}.md`)
    ])
  )
}

function legacySkillPaths(root) {
  return LEGACY_SKILL_PREFIXES.flatMap((prefix) =>
    VERBS.flatMap((v) => [
      join(root, '.agents/skills', `${prefix}-${v}`),
      join(root, '.claude/skills', `${prefix}-${v}`),
      join(root, '.codex/skills', `${prefix}-${v}`)
    ])
  )
}

function legacyArtifactPaths(root) {
  return [...legacyCommandPaths(root), ...legacySkillPaths(root)]
}

function linkInSync(root, path, target) {
  if (!existsSync(path)) return false
  try {
    if (lstatSync(path).isSymbolicLink()) return readlinkSync(path) === target
  } catch {
    return false
  }
  // 复制回退: 目录存在且其中 SKILL.md 内容与软链目标一致
  const srcSkill = join(root, target.replace(/^(\.\.\/)+/, ''), 'SKILL.md')
  const dstSkill = join(path, 'SKILL.md')
  return existsSync(dstSkill) && existsSync(srcSkill) &&
    normalizeText(readFileSync(dstSkill, 'utf8')) === normalizeText(readFileSync(srcSkill, 'utf8'))
}

export function apply(root) {
  const changed = []
  for (const path of legacyArtifactPaths(root)) {
    if (!existsSync(path) && !isBrokenLink(path)) continue
    rmSync(path, { recursive: true, force: true })
    changed.push(path)
  }
  // 文件先行 (软链目标须存在)
  for (const it of desiredArtifacts(root).filter((i) => i.kind === 'file')) {
    if (fileInSync(it.path, it.content)) continue
    mkdirSync(dirname(it.path), { recursive: true })
    writeFileSync(it.path, it.content)
    changed.push(it.path)
  }
  for (const it of desiredArtifacts(root).filter((i) => i.kind === 'link')) {
    if (linkInSync(root, it.path, it.target)) continue
    if (existsSync(it.path) || isBrokenLink(it.path)) rmSync(it.path, { recursive: true, force: true })
    mkdirSync(dirname(it.path), { recursive: true })
    try {
      symlinkSync(it.target, it.path, 'dir')
    } catch (e) {
      if (e && (e.code === 'EPERM' || e.code === 'EEXIST')) {
        const srcDir = join(root, it.target.replace(/^(\.\.\/)+/, ''))
        cpSync(srcDir, it.path, { recursive: true })
      } else {
        throw e
      }
    }
    changed.push(it.path)
  }
  return { changed }
}

function isBrokenLink(path) {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

export function check(root) {
  const drift = []
  for (const path of legacyArtifactPaths(root)) {
    if (existsSync(path) || isBrokenLink(path)) drift.push(path)
  }
  for (const it of desiredArtifacts(root)) {
    if (it.kind === 'file' && !fileInSync(it.path, it.content)) drift.push(it.path)
    if (it.kind === 'link' && !linkInSync(root, it.path, it.target)) drift.push(it.path)
  }
  return { ok: drift.length === 0, drift }
}

function main() {
  const root = process.cwd()
  const checkMode = process.argv.includes('--check') || process.argv.includes('check')
  if (checkMode) {
    const r = check(root)
    if (r.ok) {
      console.log('harness-sync: distribution in sync')
      process.exit(0)
    }
    console.error('harness-sync: DRIFT detected:\n' + r.drift.map((d) => '  - ' + d).join('\n'))
    console.error('Run `pnpm harness:sync` to repair.')
    process.exit(1)
  }
  const r = apply(root)
  if (r.changed.length === 0) console.log('harness-sync: already in sync (0 changes)')
  else console.log('harness-sync: updated ' + r.changed.length + ' artifact(s)')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
