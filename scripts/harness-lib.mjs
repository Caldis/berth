// scripts/harness-lib.mjs
// 共享常量 + 分发产物内容生成器 + frontmatter 解析。
// sync 与 check 都从这里取生成器, 保证两侧一致 (DRY)。
import yaml from 'js-yaml'

export const SKILL_PREFIX = 'harness'
export const LEGACY_SKILL_PREFIXES = ['opsx']

export const TASK_TYPES = ['feature', 'bug', 'maintenance']
export const MAINTENANCE_SUBTYPES = ['ui-ux', 'performance', 'architecture', 'testability', 'tooling-ci', 'dependency', 'docs']
export const SOURCE_KINDS = ['user-request', 'github-issue', 'docs-issues', 'docs-friction', 'ci', 'harness']
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3']
export const DEBT_SCOPES = ['file', 'module', 'cross-process', 'global']
export const DEBT_RISKS = ['low', 'medium', 'high']
export const DEBT_CONFIDENCES = ['low', 'medium', 'high']
export const DEBT_AREAS = ['ui-ux', 'performance', 'architecture', 'testability', 'tooling-ci', 'dependency', 'docs']

export const DEBT_THRESHOLDS = {
  notice: 20,
  recommendMaintenance: 40,
  requireOverrideReason: 60
}

export const MAINTENANCE_AUTO_PRIORITY = ['tooling-ci', 'ui-ux', 'testability', 'performance', 'dependency', 'docs', 'architecture']

export const LEGACY_VERBS = [
  'new',
  'continue',
  'explore',
  'design',
  'implement',
  'verify',
  'polish',
  'archive',
  'optimization'
]

export const LEGACY_ACTION_IDS = ['5.1-optimization']

export const WORKFLOW_ACTIONS = [
  { id: '0.0-new', verb: 'new', title: '启动新任务' },
  { id: '0.1-continue', verb: 'continue', title: '继续已有任务' },
  { id: '0.2-sync', verb: 'sync', title: '多设备同步续跑' },
  { id: '1.0-explore', verb: 'explore', title: '探索' },
  { id: '2.0-design', verb: 'design', title: '设计' },
  { id: '3.0-implement', verb: 'implement', title: '实现' },
  { id: '3.1-polish', verb: 'polish', title: '抛光' },
  { id: '4.0-verify', verb: 'verify', title: '验证' },
  { id: '5.0-archive', verb: 'archive', title: '归档' },
  { id: '5.1-friction', verb: 'friction', title: '流程摩擦收敛' },
  { id: '5.2-issues', verb: 'issues', title: '问题收敛' }
]

export const ACTION_IDS = WORKFLOW_ACTIONS.map((action) => action.id)
export const VERBS = WORKFLOW_ACTIONS.map((action) => action.verb)

export function workflowAction(value) {
  const action = WORKFLOW_ACTIONS.find((item) => item.id === value || item.verb === value)
  if (!action) throw new Error(`unknown harness workflow action: ${value}`)
  return action
}

export function skillName(actionOrVerb) {
  return `${SKILL_PREFIX}-${workflowAction(actionOrVerb).id}`
}

export function workflowFileName(actionOrVerb) {
  return `${workflowAction(actionOrVerb).id}.md`
}

// .agents/skills/<prefix>-<action-id>/SKILL.md 的内容 (软链目标, 由 sync 生成)
export function skillMdContent(actionOrVerb) {
  const action = workflowAction(actionOrVerb)
  return `---
name: ${skillName(action.id)}
description: Berth Harness Workflow ${action.id} ${action.title}. 读取并执行 .agents/workflow/${action.id}.md, 任务=$ARGUMENTS
---

读取仓库根的 \`.agents/workflow/${action.id}.md\` 并严格按其执行。任务标识由参数提供 ($ARGUMENTS)。
`
}

// 提取并解析 markdown 顶部的 YAML frontmatter; 无则返回 null
export function parseFrontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  if (!m) return null
  try {
    const obj = yaml.load(m[1])
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}
