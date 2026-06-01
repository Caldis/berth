// scripts/harness-issues.mjs
// 只读列出 docs/issues 的待处理问题, 为 5.2-issues 提供起点。
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

function listIssueFiles(root, dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) =>
      name.endsWith('.md') &&
      name !== 'AGENTS.md' &&
      !name.startsWith('_') &&
      statSync(join(dir, name)).isFile()
    )
    .sort()
    .map((name) => ({ name, path: relative(root, join(dir, name)).replace(/\\/g, '/') }))
}

export function collectIssues(root) {
  const base = join(root, 'docs/issues')
  return {
    active: listIssueFiles(root, base),
    resolved: listIssueFiles(root, join(base, 'resolved'))
  }
}

export function formatIssuesReport(root) {
  const issues = collectIssues(root)
  const lines = [
    'harness-issues:',
    `  active=${issues.active.length} resolved=${issues.resolved.length}`,
    '',
    '5.2-issues 可选收敛入口: harness-5.2-issues'
  ]
  if (issues.active.length) {
    lines.push('', 'active issues:')
    for (const issue of issues.active) lines.push(`  - ${issue.path}`)
    lines.push(
      '',
      'next:',
      '  - 已修复: 补解决记录并移入 docs/issues/resolved/',
      '  - 仍有效: 转为 GitHub Issue / docs/works 任务',
      '  - 重复或过期: 写明原因后移入 docs/issues/resolved/'
    )
  } else {
    lines.push('', 'active issues: none')
  }
  return lines.join('\n')
}

function main() {
  console.log(formatIssuesReport(process.cwd()))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
