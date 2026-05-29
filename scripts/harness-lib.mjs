// scripts/harness-lib.mjs
// 共享常量 + 分发产物内容生成器 + frontmatter 解析。
// sync 与 check 都从这里取生成器, 保证两侧一致 (DRY)。
import yaml from 'js-yaml'

export const VERBS = [
  'new',
  'continue',
  'explore',
  'design',
  'implement',
  'verify',
  'archive',
  'optimization'
]

// .agents/skills/opsx-<verb>/SKILL.md 的内容 (软链目标, 由 sync 生成)
export function skillMdContent(verb) {
  return `---
name: opsx-${verb}
description: AI Native Workflow ${verb} 阶段. 读取并执行 .agents/workflow/${verb}.md, 任务=$ARGUMENTS
---

读取仓库根的 \`.agents/workflow/${verb}.md\` 并严格按其执行。任务标识由参数提供 ($ARGUMENTS)。
`
}

// .claude/commands/opsx/<verb>.md 命令桩内容 (复制, 因 commands 不跟随软链)
export function commandStubContent(verb) {
  return `---
description: AI Native Workflow ${verb} 阶段. 读取并执行 .agents/workflow/${verb}.md
argument-hint: [task-id]
---

执行 AI Native Workflow 的 \`${verb}\` 阶段。

读取仓库根的 \`.agents/workflow/${verb}.md\` 并严格按其执行。任务标识: $ARGUMENTS
`
}

// 提取并解析 markdown 顶部的 YAML frontmatter; 无则返回 null
export function parseFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md)
  if (!m) return null
  try {
    const obj = yaml.load(m[1])
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}
