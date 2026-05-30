// scripts/harness-stats.mjs
// 最小观测: 汇总 harness 运行健康度 (works 阶段分布 / friction 消费率 / issues 计数 / 分发完整性)。
// 只读, 不改任何文件。源文档「观测」一节的 v1 落地。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VERBS, parseFrontmatter } from './harness-lib.mjs'
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
    distribution: { ok: dist.ok, expected: desiredArtifacts(root).length, drift: dist.drift.length }
  }
}

function main() {
  const s = collectStats(process.cwd())
  const lines = [
    'harness-stats:',
    `  works    active=${s.works.active} archived=${s.works.archived}` +
      (s.works.active ? ` (${Object.entries(s.works.byPhase).map(([k, v]) => `${k}:${v}`).join(' ')})` : ''),
    `  friction active=${s.friction.active} archived=${s.friction.archived}`,
    `  issues   active=${s.issues.active} resolved=${s.issues.resolved}`,
    `  dist     ${s.distribution.ok ? 'in-sync' : `DRIFT(${s.distribution.drift})`} (expected ${s.distribution.expected} artifacts)`
  ]
  console.log(lines.join('\n'))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
