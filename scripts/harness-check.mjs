// scripts/harness-check.mjs
// 校验: 源 playbook / 模板 / works 任务产物与命名 / friction 命名 / issues 目录 / 分发完整性。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VERBS, parseFrontmatter } from './harness-lib.mjs'
import { check as checkDistribution } from './harness-sync.mjs'

const WORK_NAME = /^\d{4}-\d{2}-\d{2}(-[A-Z][A-Z0-9]+-\d+)?-[a-z0-9-]+$/
const FRICTION_NAME = new RegExp(`^\\d{8}-(${VERBS.join('|')})-[a-z0-9-]+\\.md$`)
const PHASES = ['explore', 'design', 'blocked', 'implement', 'verify', 'polish', 'archive']
const PHASE_RANK = { explore: 0, design: 1, blocked: 1, implement: 2, verify: 3, polish: 4, archive: 5 }
export const SMALL_CHANGE_EXEMPTION_CONSENT = '小改动豁免前必须先声明豁免依据并征得用户确认。'

function listDirs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => !n.startsWith('_') && statSync(join(p, n)).isDirectory())
}

function requiredArtifacts(type, phase) {
  const req = [type === 'bug' ? '00-BUG.md' : '00-PRD.md']
  const rank = PHASE_RANK[phase]
  if (rank >= 1) req.push('01-ANALYSIS.md')
  if (rank >= 2) req.push('02-SPEC.md', '03-PLAN.md')
  if (phase === 'polish') req.push('04-POLISH.md')
  return req
}

export function checkWorks(root) {
  const errors = []
  const base = join(root, 'docs/works')
  for (const name of listDirs(base)) {
    const dir = join(base, name)
    if (!WORK_NAME.test(name)) {
      errors.push(`works: bad naming "${name}" (expect {YYYY-MM-DD}[-{JIRA}]-{summary})`)
      continue
    }
    const indexPath = join(dir, 'INDEX.md')
    if (!existsSync(indexPath)) {
      errors.push(`works/${name}: missing INDEX.md`)
      continue
    }
    const fm = parseFrontmatter(readFileSync(indexPath, 'utf8'))
    if (!fm) {
      errors.push(`works/${name}: INDEX.md missing frontmatter`)
      continue
    }
    for (const key of ['task', 'type', 'phase', 'created']) {
      if (!fm[key]) errors.push(`works/${name}: frontmatter missing "${key}"`)
    }
    if (fm.type && !['feature', 'bug'].includes(fm.type))
      errors.push(`works/${name}: invalid type "${fm.type}"`)
    if (fm.phase && !PHASES.includes(fm.phase))
      errors.push(`works/${name}: invalid phase "${fm.phase}"`)
    if (fm.phase === 'archive')
      errors.push(`works/${name}: phase=archive must be moved under docs/works/_archive`)
    if (fm.type && fm.phase && PHASES.includes(fm.phase) && fm.phase !== 'archive') {
      for (const f of requiredArtifacts(fm.type, fm.phase)) {
        if (!existsSync(join(dir, f)))
          errors.push(`works/${name}: phase=${fm.phase} requires ${f}`)
      }
    }
  }
  return errors
}

export function checkFriction(root) {
  const errors = []
  const base = join(root, 'docs/friction')
  if (!existsSync(base)) return errors
  for (const name of readdirSync(base)) {
    if (name.startsWith('_') || name === '_archive') continue
    if (!statSync(join(base, name)).isFile()) continue
    if (!FRICTION_NAME.test(name))
      errors.push(`friction: bad naming "${name}" (expect {YYYYMMDD}-{phase}-{summary}.md)`)
  }
  return errors
}

export function checkTemplates(root) {
  const errors = []
  const wt = join(root, 'docs/works/_template')
  for (const f of ['INDEX.md', '00-PRD.md', '00-BUG.md', '01-ANALYSIS.md', '02-SPEC.md', '03-PLAN.md', '04-POLISH.md']) {
    if (!existsSync(join(wt, f))) errors.push(`templates: missing docs/works/_template/${f}`)
  }
  if (!existsSync(join(root, 'docs/friction/_template.md')))
    errors.push('templates: missing docs/friction/_template.md')
  return errors
}

export function checkWorkflowSources(root) {
  const errors = []
  const dir = join(root, '.agents/workflow')
  // 非空断言: playbook 是操作真源, 0 字节/空白文件等于无 (existsSync 检不出截断)
  const nonEmpty = (f) => existsSync(f) && readFileSync(f, 'utf8').trim().length > 0
  if (!existsSync(join(dir, '_shared.md')))
    errors.push('workflow: missing .agents/workflow/_shared.md')
  else if (!nonEmpty(join(dir, '_shared.md')))
    errors.push('workflow: empty .agents/workflow/_shared.md')
  for (const v of VERBS) {
    const f = join(dir, `${v}.md`)
    if (!existsSync(f)) errors.push(`workflow: missing .agents/workflow/${v}.md`)
    else if (!nonEmpty(f)) errors.push(`workflow: empty .agents/workflow/${v}.md`)
  }
  // 反向扫描: 检出非 _shared/非 VERB 的孤儿 playbook (防 verb 集与源静默分叉)
  if (existsSync(dir)) {
    const allowed = new Set([...VERBS.map((v) => `${v}.md`), '_shared.md'])
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.md') && !allowed.has(name))
        errors.push(`workflow: unexpected playbook "${name}" (not in VERBS)`)
    }
  }
  return errors
}

export function checkIssues(root) {
  const errors = []
  if (existsSync(join(root, 'issues')))
    errors.push('issues: root directory named issues is deprecated; use docs/issues/')
  const base = join(root, 'docs/issues')
  if (!existsSync(base)) {
    errors.push('issues: missing docs/issues')
    return errors
  }
  if (!existsSync(join(base, 'AGENTS.md')))
    errors.push('issues: missing docs/issues/AGENTS.md')
  return errors
}

export function checkEntryRules(root) {
  const errors = []
  for (const rel of ['AGENTS.md', '.agents/README.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    if (!readFileSync(path, 'utf8').includes(SMALL_CHANGE_EXEMPTION_CONSENT))
      errors.push(`entry-rules: ${rel} missing small-change exemption consent rule`)
  }
  for (const rel of ['.agents/workflow/_shared.md', '.agents/workflow/implement.md', '.agents/workflow/verify.md', 'docs/issues/AGENTS.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    if (!content.includes('docs/issues') || !content.includes('不属于当前主线'))
      errors.push(`entry-rules: ${rel} missing side product issue capture rule`)
  }
  for (const rel of ['AGENTS.md', '.agents/workflow/_shared.md', '.agents/workflow/implement.md', '.agents/workflow/archive.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    if (!content.includes('自己相关') || !content.includes('git diff --cached'))
      errors.push(`entry-rules: ${rel} missing frequent scoped commit rule`)
  }
  return errors
}

export function checkAll(root) {
  const errors = [
    ...checkWorkflowSources(root),
    ...checkEntryRules(root),
    ...checkTemplates(root),
    ...checkWorks(root),
    ...checkFriction(root),
    ...checkIssues(root)
  ]
  const dist = checkDistribution(root)
  if (!dist.ok) for (const d of dist.drift) errors.push(`distribution drift: ${d}`)
  return { ok: errors.length === 0, errors }
}

function main() {
  const { ok, errors } = checkAll(process.cwd())
  if (ok) {
    console.log('harness-check: all checks passed')
    process.exit(0)
  }
  console.error('harness-check: FAILED\n' + errors.map((e) => '  - ' + e).join('\n'))
  process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
