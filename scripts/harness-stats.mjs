// scripts/harness-stats.mjs
// 最小观测: 汇总 harness 运行健康度 (works 阶段分布 / friction 消费率 / issues 计数 / 分发完整性)。
// 只读, 不改任何文件。源文档「观测」一节的 v1 落地。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEBT_THRESHOLDS, MAINTENANCE_AUTO_PRIORITY, parseFrontmatter } from './harness-lib.mjs'
import { check as checkDistribution, desiredArtifacts } from './harness-sync.mjs'

function listTaskDirs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => !n.startsWith('_') && statSync(join(p, n)).isDirectory())
}

function listMdFiles(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => n.endsWith('.md') && !n.startsWith('_') && statSync(join(p, n)).isFile())
}

function listIssueFiles(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) =>
    n.endsWith('.md') && n !== 'AGENTS.md' && !n.startsWith('_') && statSync(join(p, n)).isFile()
  )
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function effectiveDebtSnapshot(frontmatter) {
  const debt = frontmatter && frontmatter.debt
  if (!isPlainObject(debt)) return null
  const finalNet = isPlainObject(debt.final) ? finiteNumber(debt.final.net) : undefined
  if (finalNet !== undefined) return debt.final
  const estimateNet = isPlainObject(debt.estimate) ? finiteNumber(debt.estimate.net) : undefined
  if (estimateNet !== undefined) return debt.estimate
  return null
}

function debtStatus(total) {
  if (total >= DEBT_THRESHOLDS.requireOverrideReason) return 'requires-override'
  if (total >= DEBT_THRESHOLDS.recommendMaintenance) return 'recommend-maintenance'
  if (total >= DEBT_THRESHOLDS.notice) return 'notice'
  return 'ok'
}

function addGroupedValue(group, key, value) {
  if (!key) return
  group[key] = (group[key] || 0) + value
}

function maintenancePriority(area) {
  const index = MAINTENANCE_AUTO_PRIORITY.indexOf(area)
  return index >= 0 ? index : MAINTENANCE_AUTO_PRIORITY.length
}

function selectMaintenanceRecommendation(debt) {
  // 2026-07-04 域级触发: total 是跨域净和, 冷域盈余会掩蔽热域 (ui-ux +41 曾被
  // performance/testability 负分轧差成 total 23 而永不触发)。任一域自身过推荐线
  // 即触发, 不再仅由 total 门控。
  const totalTriggered = ['recommend-maintenance', 'requires-override'].includes(debt.status)
  const areaTriggered = Object.values(debt.byArea).some(
    (value) => typeof value === 'number' && value >= DEBT_THRESHOLDS.recommendMaintenance
  )
  if (!totalTriggered && !areaTriggered) return null
  const candidates = Object.entries(debt.byArea)
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .map(([area, score]) => ({ area, score, subtype: area }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return maintenancePriority(a.area) - maintenancePriority(b.area)
    })

  for (const candidate of candidates) {
    if (candidate.area === 'architecture' && candidate.score < DEBT_THRESHOLDS.recommendMaintenance) continue
    return {
      ...candidate,
      reason: candidate.area === 'architecture'
        ? 'architecture area reached recommend-maintenance threshold'
        : 'highest positive debt area'
    }
  }
  return null
}

function collectDebt(root) {
  const bases = [join(root, 'docs/works'), join(root, 'docs/works/_archive')]
  const debt = { total: 0, status: 'ok', unscored: 0, byArea: {}, byType: {}, maintenanceRecommendation: null }
  for (const base of bases) {
    for (const name of listTaskDirs(base)) {
      const idx = join(base, name, 'INDEX.md')
      const frontmatter = existsSync(idx) ? parseFrontmatter(readFileSync(idx, 'utf8')) : null
      const snapshot = effectiveDebtSnapshot(frontmatter)
      const net = snapshot ? finiteNumber(snapshot.net) : undefined
      if (net === undefined) {
        debt.unscored += 1
        continue
      }
      debt.total += net
      addGroupedValue(debt.byType, frontmatter.type || 'unknown', net)
      if (Array.isArray(snapshot.areas)) {
        for (const area of snapshot.areas) addGroupedValue(debt.byArea, String(area), net)
      }
    }
  }
  debt.status = debtStatus(debt.total)
  debt.maintenanceRecommendation = selectMaintenanceRecommendation(debt)
  return debt
}

export function collectStats(root) {
  // works: 活动任务按 phase 分布 + 归档数
  const worksBase = join(root, 'docs/works')
  const byPhase = {}
  for (const name of listTaskDirs(worksBase)) {
    const idx = join(worksBase, name, 'INDEX.md')
    const fm = existsSync(idx) ? parseFrontmatter(readFileSync(idx, 'utf8')) : null
    const phase = (fm && fm.phase) || 'unknown'
    byPhase[phase] = (byPhase[phase] || 0) + 1
  }
  const worksActive = Object.values(byPhase).reduce((a, b) => a + b, 0)
  const worksArchived = listTaskDirs(join(worksBase, '_archive')).length

  // friction: 待消费 (active) vs 已归档
  const frictionActive = listMdFiles(join(root, 'docs/friction')).length
  const frictionArchived = listMdFiles(join(root, 'docs/friction/_archive')).length

  // issues: 产品问题 active vs resolved
  const issuesActive = listIssueFiles(join(root, 'docs/issues')).length
  const issuesResolved = listIssueFiles(join(root, 'docs/issues/resolved')).length

  // distribution: 复用 sync 的期望产物描述与 check
  const dist = checkDistribution(root)

  return {
    works: { active: worksActive, byPhase, archived: worksArchived },
    friction: { active: frictionActive, archived: frictionArchived },
    issues: { active: issuesActive, resolved: issuesResolved },
    debt: collectDebt(root),
    distribution: { ok: dist.ok, expected: desiredArtifacts(root).length, drift: dist.drift.length }
  }
}

function groupLine(group) {
  const entries = Object.entries(group)
  return entries.length ? ` (${entries.map(([key, value]) => `${key}:${value}`).join(' ')})` : ''
}

// 2026-07-04 观测补全: 域后缀标记水位 — `!` 已过推荐线 (域级触发中), `~` 已过 notice。
function debtAreaLine(byArea) {
  const entries = Object.entries(byArea).sort((a, b) => b[1] - a[1])
  if (!entries.length) return ''
  const mark = (value) =>
    value >= DEBT_THRESHOLDS.recommendMaintenance ? '!' : value >= DEBT_THRESHOLDS.notice ? '~' : ''
  return ` (${entries.map(([key, value]) => `${key}:${value}${mark(value)}`).join(' ')})`
}

function maintenanceLine(recommendation) {
  return recommendation ? ` maintenance=${recommendation.subtype}:${recommendation.score}` : ''
}

function main() {
  const s = collectStats(process.cwd())
  const lines = [
    'harness-stats:',
    `  works    active=${s.works.active} archived=${s.works.archived}` +
      (s.works.active ? ` (${Object.entries(s.works.byPhase).map(([k, v]) => `${k}:${v}`).join(' ')})` : ''),
    `  friction active=${s.friction.active} archived=${s.friction.archived}`,
    `  issues   active=${s.issues.active} resolved=${s.issues.resolved}`,
    `  debt     total=${s.debt.total} status=${s.debt.status} unscored=${s.debt.unscored}` +
      debtAreaLine(s.debt.byArea) +
      maintenanceLine(s.debt.maintenanceRecommendation),
    `  debt/type${groupLine(s.debt.byType)}`,
    `  dist     ${s.distribution.ok ? 'in-sync' : `DRIFT(${s.distribution.drift})`} (expected ${s.distribution.expected} artifacts)`
  ]
  console.log(lines.join('\n'))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
