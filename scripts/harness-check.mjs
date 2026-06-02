// scripts/harness-check.mjs
// 校验: 源 playbook / 模板 / works 任务产物与命名 / friction 命名 / issues 目录 / 分发完整性。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACTION_IDS,
  DEBT_AREAS,
  DEBT_CONFIDENCES,
  DEBT_RISKS,
  DEBT_SCOPES,
  MAINTENANCE_SUBTYPES,
  PRIORITIES,
  SOURCE_KINDS,
  TASK_TYPES,
  parseFrontmatter
} from './harness-lib.mjs'
import { check as checkDistribution } from './harness-sync.mjs'

const WORK_NAME = /^\d{4}-\d{2}-\d{2}-gh-(\d+)-[a-z0-9-]+$/
const TASK_ID = /^GH-(\d+)$/
const PROJECT_ITEM_ID = /^PVTI_[A-Za-z0-9_-]+$/
const FRICTION_NAME = new RegExp(`^\\d{8}-(${ACTION_IDS.map((id) => id.replace(/\./g, '\\.')).join('|')})-[a-z0-9-]+\\.md$`)
const PHASES = ['explore', 'design', 'blocked', 'implement', 'verify', 'polish', 'archive']
const PHASE_RANK = { explore: 0, design: 1, blocked: 1, implement: 2, verify: 3, polish: 4, archive: 5 }
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
export const SMALL_CHANGE_EXEMPTION_CONSENT = '小改动豁免前必须先声明豁免依据并征得用户确认。'
export const TEST_DISCIPLINE_RULE = '测试证据或明确例外理由'
export const FRONTEND_TASTE_RULE = '界面质量与交互验收'
export const CI_BASELINE_COMMAND = 'pnpm harness:ci:baseline'
export const CI_WAIT_COMMAND = 'pnpm harness:ci:wait'
export const CI_PREPUSH_COMMAND = 'pnpm harness:prepush'
const SUPERPOWERS_FLOW_POLICY = ['默认流程是 harness workflow', 'Superpowers 只能作为方法参考', 'Agent 自主判断并行或顺序执行']
const ARCHIVE_BACKLOG_REMINDER = ['5.1-friction', '5.2-issues', '本次产生或关联的 friction / issues']
const ALLOWED_SUPERPOWERS_DOCS = new Set([
  'docs/superpowers/specs/2026-05-29-ai-native-workflow-harness-design.md',
  'docs/superpowers/plans/2026-05-29-ai-native-workflow-harness.md'
])

function listDirs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => !n.startsWith('_') && statSync(join(p, n)).isDirectory())
}

function workNameFromArg(work) {
  const normalized = String(work || '').replace(/[\\/]+$/, '')
  return normalized.split(/[\\/]/).pop()
}

function prefersArchivedWork(work) {
  return String(work || '').replace(/\\/g, '/').split('/').includes('_archive')
}

function resolveWorkEntry(root, work) {
  const name = workNameFromArg(work)
  const base = join(root, 'docs/works')
  const active = { name, dir: join(base, name), archived: false }
  const archived = { name, dir: join(base, '_archive', name), archived: true }
  const candidates = prefersArchivedWork(work) ? [archived, active] : [active, archived]
  return candidates.find((entry) => existsSync(entry.dir) && statSync(entry.dir).isDirectory())
}

function requiredArtifacts(type, phase) {
  const req = [type === 'bug' ? '00-BUG.md' : '00-PRD.md']
  const rank = PHASE_RANK[phase]
  if (rank >= 1) req.push('01-ANALYSIS.md')
  if (rank >= 2) req.push('02-SPEC.md', '03-PLAN.md')
  if (phase === 'polish') req.push('04-POLISH.md')
  return req
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== ''
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDateOnly(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  return DATE_ONLY.test(String(value))
}

function validateEnum(errors, workName, path, value, allowed) {
  if (!isPresent(value)) {
    errors.push(`works/${workName}: ${path} is required`)
    return
  }
  if (!allowed.includes(String(value))) {
    errors.push(`works/${workName}: invalid ${path} "${value}"`)
  }
}

function hasDebtSnapshotValue(snapshot) {
  if (!isPlainObject(snapshot)) return false
  return ['incurred', 'repaid', 'net', 'scope', 'risk', 'confidence'].some((key) => isPresent(snapshot[key])) ||
    (Array.isArray(snapshot.areas) && snapshot.areas.length > 0)
}

function validateDebtSnapshot(errors, workName, path, snapshot, options = {}) {
  const required = Boolean(options.required)
  if (!isPresent(snapshot)) {
    if (required) errors.push(`works/${workName}: ${path} is required`)
    return
  }
  if (!isPlainObject(snapshot)) {
    errors.push(`works/${workName}: ${path} must be an object`)
    return
  }
  if (!required && !hasDebtSnapshotValue(snapshot)) return

  for (const key of ['incurred', 'repaid', 'net']) {
    if (!isFiniteNumber(snapshot[key])) errors.push(`works/${workName}: ${path}.${key} must be a finite number`)
  }
  if (isFiniteNumber(snapshot.incurred) && isFiniteNumber(snapshot.repaid) && isFiniteNumber(snapshot.net)) {
    const expected = snapshot.incurred - snapshot.repaid
    if (snapshot.net !== expected) errors.push(`works/${workName}: ${path}.net must equal incurred - repaid (${expected})`)
  }
  validateEnum(errors, workName, `${path}.scope`, snapshot.scope, DEBT_SCOPES)
  validateEnum(errors, workName, `${path}.risk`, snapshot.risk, DEBT_RISKS)
  validateEnum(errors, workName, `${path}.confidence`, snapshot.confidence, DEBT_CONFIDENCES)
  if (!Array.isArray(snapshot.areas) || snapshot.areas.length === 0) {
    errors.push(`works/${workName}: ${path}.areas must be a non-empty array`)
  } else {
    for (const area of snapshot.areas) {
      if (!DEBT_AREAS.includes(String(area))) errors.push(`works/${workName}: invalid ${path}.areas "${area}"`)
    }
  }
}

function validateTaskMetadata(errors, workName, fm) {
  if (fm.type && !TASK_TYPES.includes(String(fm.type)))
    errors.push(`works/${workName}: invalid type "${fm.type}"`)

  if (fm.type === 'maintenance') {
    if (!isPlainObject(fm.maintenance)) {
      errors.push(`works/${workName}: maintenance.subtype is required when type=maintenance`)
    } else {
      validateEnum(errors, workName, 'maintenance.subtype', fm.maintenance.subtype, MAINTENANCE_SUBTYPES)
    }
  } else if (isPresent(fm.maintenance)) {
    errors.push(`works/${workName}: maintenance block is only allowed when type=maintenance`)
  }

  if (isPresent(fm.priority) && !PRIORITIES.includes(String(fm.priority)))
    errors.push(`works/${workName}: invalid priority "${fm.priority}"`)
  if (isPresent(fm.target_date) && !isDateOnly(fm.target_date))
    errors.push(`works/${workName}: target_date must use YYYY-MM-DD`)

  const sourceRequired = fm.type === 'maintenance' || isPresent(fm.priority) || isPresent(fm.debt) || isPresent(fm.source)
  if (sourceRequired) {
    if (!isPlainObject(fm.source)) {
      errors.push(`works/${workName}: source.kind is required`)
    } else {
      validateEnum(errors, workName, 'source.kind', fm.source.kind, SOURCE_KINDS)
      if (isPresent(fm.source.refs) && !Array.isArray(fm.source.refs))
        errors.push(`works/${workName}: source.refs must be an array`)
    }
  }

  if (isPresent(fm.debt)) {
    if (!isPlainObject(fm.debt)) {
      errors.push(`works/${workName}: debt must be an object`)
      return
    }
    validateDebtSnapshot(errors, workName, 'debt.estimate', fm.debt.estimate, { required: true })
    validateDebtSnapshot(errors, workName, 'debt.final', fm.debt.final)
    if (isPresent(fm.debt.revisions) && !Array.isArray(fm.debt.revisions))
      errors.push(`works/${workName}: debt.revisions must be an array`)
  }
}

export function checkWorks(root, options = {}) {
  const errors = []
  const base = join(root, 'docs/works')
  const workFilter = options.work ? workNameFromArg(options.work) : undefined
  const entries = workFilter
    ? [resolveWorkEntry(root, options.work)].filter(Boolean)
    : listDirs(base).map((name) => ({ name, dir: join(base, name), archived: false }))
  if (workFilter && entries.length === 0) errors.push(`works: --work target not found "${workFilter}"`)
  for (const entry of entries) {
    const { name, dir, archived } = entry
    const workName = WORK_NAME.exec(name)
    if (!workName) {
      errors.push(`works: bad naming "${name}" (expect {YYYY-MM-DD}-gh-{number}-{summary})`)
      continue
    }
    const issueNumberFromName = Number(workName[1])
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
    if (fm.task && fm.task !== name)
      errors.push(`works/${name}: frontmatter task must match directory name`)
    if (!fm.task_id) {
      errors.push(`works/${name}: frontmatter missing "task_id"`)
    } else {
      const taskId = TASK_ID.exec(String(fm.task_id))
      if (!taskId) errors.push(`works/${name}: task_id must use GH-{number}`)
      else if (Number(taskId[1]) !== issueNumberFromName)
        errors.push(`works/${name}: task_id ${fm.task_id} does not match directory issue number ${issueNumberFromName}`)
    }
    const issue = fm.issue || {}
    if (!issue.number)
      errors.push(`works/${name}: frontmatter missing "issue.number"`)
    else if (Number(issue.number) !== issueNumberFromName)
      errors.push(`works/${name}: issue.number ${issue.number} does not match directory issue number ${issueNumberFromName}`)
    if (!issue.url)
      errors.push(`works/${name}: frontmatter missing "issue.url"`)
    else if (!String(issue.url).endsWith(`/issues/${issueNumberFromName}`))
      errors.push(`works/${name}: issue.url does not match directory issue number ${issueNumberFromName}`)
    const gh = fm.gh_project || {}
    const projectStatus = String(gh.status || '').trim()
    const projectItemId = String(gh.item_id || '').trim()
    const projectPendingAuth = projectStatus === 'pending-auth'
    if (projectPendingAuth) {
      if (fm.phase !== 'blocked')
        errors.push(`works/${name}: gh_project.status=pending-auth requires phase=blocked`)
      if (projectItemId)
        errors.push(`works/${name}: gh_project.status=pending-auth must not keep gh_project.item_id`)
    } else if (!projectItemId) {
      errors.push(`works/${name}: frontmatter missing "gh_project.item_id"`)
    } else if (!PROJECT_ITEM_ID.test(projectItemId)) {
      errors.push(`works/${name}: gh_project.item_id must be a GitHub ProjectV2Item node id (PVTI_...), got "${projectItemId}"`)
    }
    validateTaskMetadata(errors, name, fm)
    if (fm.phase && !PHASES.includes(fm.phase))
      errors.push(`works/${name}: invalid phase "${fm.phase}"`)
    if (fm.phase === 'archive' && !archived)
      errors.push(`works/${name}: phase=archive must be moved under docs/works/_archive`)
    if (archived && fm.phase && fm.phase !== 'archive')
      errors.push(`works/${name}: archived work must use phase=archive`)
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
      errors.push(`friction: bad naming "${name}" (expect {YYYYMMDD}-{action-id}-{summary}.md)`)
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
  for (const actionId of ACTION_IDS) {
    const f = join(dir, `${actionId}.md`)
    if (!existsSync(f)) errors.push(`workflow: missing .agents/workflow/${actionId}.md`)
    else if (!nonEmpty(f)) errors.push(`workflow: empty .agents/workflow/${actionId}.md`)
  }
  // 反向扫描: 检出非 _shared/非 VERB 的孤儿 playbook (防 verb 集与源静默分叉)
  if (existsSync(dir)) {
    const allowed = new Set([...ACTION_IDS.map((id) => `${id}.md`), '_shared.md'])
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.md') && !allowed.has(name))
        errors.push(`workflow: unexpected playbook "${name}" (not in action ids)`)
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

export function checkSuperpowers(root) {
  const errors = []
  for (const subdir of ['specs', 'plans']) {
    const base = join(root, 'docs/superpowers', subdir)
    if (!existsSync(base)) continue
    for (const name of readdirSync(base)) {
      const full = join(base, name)
      if (!statSync(full).isFile()) continue
      const rel = `docs/superpowers/${subdir}/${name}`
      if (!ALLOWED_SUPERPOWERS_DOCS.has(rel))
        errors.push(`superpowers: active ${rel} is not allowed; write harness output to docs/works/{task}/02-SPEC.md or 03-PLAN.md`)
    }
  }
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
  for (const rel of ['.agents/workflow/_shared.md', '.agents/workflow/3.0-implement.md', '.agents/workflow/4.0-verify.md', 'docs/issues/AGENTS.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    if (!content.includes('docs/issues') || !content.includes('不属于当前主线'))
      errors.push(`entry-rules: ${rel} missing side product issue capture rule`)
  }
  for (const rel of ['AGENTS.md', '.agents/workflow/_shared.md', '.agents/workflow/3.0-implement.md', '.agents/workflow/5.0-archive.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    if (!content.includes('自己相关') || !content.includes('git diff --cached'))
      errors.push(`entry-rules: ${rel} missing frequent scoped commit rule`)
  }
  for (const rel of [
    '.agents/workflow/_shared.md',
    '.agents/workflow/1.0-explore.md',
    '.agents/workflow/2.0-design.md',
    '.agents/workflow/4.0-verify.md',
    'docs/works/_template/01-ANALYSIS.md',
    'docs/works/_template/02-SPEC.md',
    'docs/works/_template/03-PLAN.md'
  ]) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    if (!readFileSync(path, 'utf8').includes(FRONTEND_TASTE_RULE))
      errors.push(`entry-rules: ${rel} missing frontend taste rule`)
  }
  for (const rel of [
    '.agents/workflow/_shared.md',
    '.agents/workflow/2.0-design.md',
    '.agents/workflow/3.0-implement.md',
    '.agents/workflow/4.0-verify.md',
    'docs/works/_template/02-SPEC.md',
    'docs/works/_template/03-PLAN.md'
  ]) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    if (!readFileSync(path, 'utf8').includes(TEST_DISCIPLINE_RULE))
      errors.push(`entry-rules: ${rel} missing test evidence rule`)
  }
  for (const rel of ['AGENTS.md', '.agents/workflow/_shared.md', '.agents/workflow/2.0-design.md', '.agents/workflow/3.0-implement.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    for (const rule of SUPERPOWERS_FLOW_POLICY) {
      if (!content.includes(rule)) {
        errors.push(`entry-rules: ${rel} missing Superpowers flow policy`)
        break
      }
    }
  }
  {
    const rel = '.agents/workflow/5.0-archive.md'
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`entry-rules: missing ${rel}`)
    } else {
      const content = readFileSync(path, 'utf8')
      for (const rule of ARCHIVE_BACKLOG_REMINDER) {
        if (!content.includes(rule)) {
          errors.push(`entry-rules: ${rel} missing archive backlog reminder`)
          break
        }
      }
    }
  }
  return errors
}

export function checkCiGateRules(root) {
  const errors = []
  const packagePath = join(root, 'package.json')
  if (!existsSync(packagePath)) {
    errors.push('ci-gate: missing package.json')
  } else {
    const content = readFileSync(packagePath, 'utf8')
    for (const script of ['harness:ci:baseline', 'harness:ci:wait', 'harness:prepush']) {
      if (!content.includes(`"${script}"`)) errors.push(`ci-gate: package.json missing ${script} script`)
    }
  }

  for (const rel of ['.agents/tools.md', '.agents/workflow/_shared.md']) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`ci-gate: missing ${rel}`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    for (const command of [CI_BASELINE_COMMAND, CI_WAIT_COMMAND, CI_PREPUSH_COMMAND]) {
      if (!content.includes(command)) {
        errors.push(`ci-gate: ${rel} missing ${command}`)
        break
      }
    }
  }

  {
    const rel = '.agents/workflow/5.0-archive.md'
    const path = join(root, rel)
    if (!existsSync(path)) {
      errors.push(`ci-gate: missing ${rel}`)
    } else {
      const content = readFileSync(path, 'utf8')
      for (const command of [CI_BASELINE_COMMAND, CI_WAIT_COMMAND]) {
        if (!content.includes(command)) {
          errors.push(`ci-gate: ${rel} missing ${command}`)
          break
        }
      }
    }
  }

  return errors
}

export function checkAll(root, options = {}) {
  const errors = [
    ...checkWorkflowSources(root),
    ...checkEntryRules(root),
    ...checkCiGateRules(root),
    ...checkTemplates(root),
    ...checkWorks(root, options),
    ...checkFriction(root),
    ...checkIssues(root),
    ...checkSuperpowers(root)
  ]
  const dist = checkDistribution(root)
  if (!dist.ok) for (const d of dist.drift) errors.push(`distribution drift: ${d}`)
  return { ok: errors.length === 0, errors }
}

function parseArgs(argv) {
  const options = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--work') {
      const work = argv[i + 1]
      if (!work || work.startsWith('--')) throw new Error('--work requires docs/works/{task} or task directory name')
      options.work = work
      i += 1
      continue
    }
    throw new Error(`unknown option: ${arg}`)
  }
  return options
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`harness-check: ${error.message}`)
    process.exit(2)
  }
  const { ok, errors } = checkAll(process.cwd(), options)
  if (ok) {
    console.log('harness-check: all checks passed')
    process.exit(0)
  }
  console.error('harness-check: FAILED\n' + errors.map((e) => '  - ' + e).join('\n'))
  process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
