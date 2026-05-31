# AI Native Workflow Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 berth 仓库内落地一套自包含、同时兼容 Claude Code 与 Codex 的 AI Native Workflow harness (四设施 + 四阶段 + /opsx:* 命令封装)。

**Architecture:** 单一真源在 `.agents/workflow/*.md` (手写 playbook); 分发层 (skills 软链 + Claude 命令桩 + 各 skill 的 SKILL.md) 由 `scripts/harness-sync.mjs` 幂等生成; `scripts/harness-check.mjs` 校验任务产物/模板/命名/issues 目录/分发完整性, 接入 CI。

**Tech Stack:** Node ESM (`.mjs` 脚本), Vitest (校验器测试), js-yaml (frontmatter 解析), GitHub Actions (CI), pnpm 9。

**约定:** 所有 git commit 结尾附带下方 trailer (每次都加):
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
所有命令前置 `export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"` 以确保 node/pnpm 可用 (本机环境)。当前分支: `feature/ai-native-workflow-harness`。

**关键事实 (已核实):**
- vitest `include: tests/**/*.{test,spec}.{ts,tsx}` → `tests/harness/*.test.ts` 自动纳入。
- `tsconfig.web.json` 的 `include` 含 `tests/**/*` → 测试 `.ts` 受 `pnpm typecheck:web` 检查, 必须类型干净。
- ESLint 仅扫 `.ts,.tsx` → `.mjs` 脚本不被 lint, 也不被 typecheck。
- `js-yaml` 已在依赖中, 脚本可直接 `import yaml from 'js-yaml'`。
- 8 个 verb: `new continue explore design implement verify archive optimization`。

---

## File Structure

**新建 (源, 手写):**
- `.agents/workflow/_shared.md` — 门禁 + 状态契约 + 命名规范 (被各 verb 引用)
- `.agents/workflow/{new,continue,explore,design,implement,verify,archive,optimization}.md` — 8 个 playbook
- `.agents/README.md` — 体系总览 + 观测占位
- `.agents/tools.md` — berth 自用工具索引
- `docs/ARCHITECTURE.md` — Project Map
- `docs/works/_template/{INDEX,00-PRD,00-BUG,01-ANALYSIS,02-SPEC,03-PLAN}.md`
- `docs/friction/_template.md`
- `.github/workflows/ci.yml`, `.github/pull_request_template.md`

**新建 (代码):**
- `scripts/harness-lib.mjs` — 共享常量 + 内容生成器 + frontmatter 解析 (DRY 核心)
- `scripts/harness-sync.mjs` — 分发: 生成 SKILL.md + 命令桩 + 软链; apply/check
- `scripts/harness-check.mjs` — 校验: 源/模板/works/friction/issues/分发
- `tests/harness/sync.test.ts` — sync 幂等性 + drift 检测
- `tests/harness/check.test.ts` — 校验器 fixture 测试

**新建 (生成, 由 sync 产出后提交):**
- `.agents/skills/opsx-<verb>/SKILL.md` ×8
- `.claude/skills/opsx-<verb>` → 软链 ×8
- `.claude/commands/opsx/<verb>.md` ×8
- `.codex/skills/opsx-<verb>` → 软链 ×8

**修改:**
- `package.json` — `packageManager` 字段 + `harness:sync`/`harness:check` 脚本
- `AGENTS.md` — 增 Harness 索引章节
- `docs/issues/AGENTS.md` — 改为重定向说明

**新建 (dogfood):**
- `docs/friction/20260529-implement-pnpm-version-pinning.md`
- `docs/issues/20260529-pnpm-version-pinning.md`

---

## Task 1: 钉死 pnpm 版本 (构建可靠性 + dogfood 根因)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在 package.json 顶层加 packageManager 字段**

在 `"license": "MIT",` 行之后插入一行:
```json
  "packageManager": "pnpm@9.15.4",
```

- [ ] **Step 2: 验证 corepack 据此锁定 pnpm 9**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
corepack prepare pnpm@9.15.4 --activate >/dev/null 2>&1
pnpm -v
```
Expected: `9.15.4`

- [ ] **Step 3: 验证干净安装可编译原生模块 (corepack 不再破坏构建)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
rm -rf node_modules && pnpm install --ignore-workspace --node-linker=hoisted 2>&1 | tail -3
ls node_modules/better-sqlite3/build/Release/better_sqlite3.node && echo "NATIVE_OK"
test -e node_modules/electron/dist/Electron.app/Contents/MacOS/Electron && echo "ELECTRON_OK"
```
Expected: 末尾出现 `NATIVE_OK` 与 `ELECTRON_OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add package.json
git commit -m "build: pin pnpm to 9.15.4 via packageManager

corepack default (pnpm 11) ignores pnpm.onlyBuiltDependencies, skipping
native build scripts and breaking the Electron build. Pin to 9.x.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: harness-lib.mjs — 共享常量与生成器

**Files:**
- Create: `scripts/harness-lib.mjs`

- [ ] **Step 1: 创建 harness-lib.mjs**

```js
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
```

- [ ] **Step 2: 验证模块可导入且生成器确定性**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
node -e "import('./scripts/harness-lib.mjs').then(m=>{console.log('verbs',m.VERBS.length);console.log(m.skillMdContent('explore').includes('opsx-explore')?'SKILL_OK':'SKILL_FAIL');console.log(m.parseFrontmatter('---\nphase: design\n---\nbody').phase)})"
```
Expected: `verbs 8` / `SKILL_OK` / `design`

- [ ] **Step 3: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add scripts/harness-lib.mjs
git commit -m "feat(harness): add shared lib (verbs, generators, frontmatter)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: harness-sync.mjs — 分发引擎 (TDD)

**Files:**
- Create: `scripts/harness-sync.mjs`
- Test: `tests/harness/sync.test.ts`

- [ ] **Step 1: 写失败测试 (幂等 + drift)**

```ts
// tests/harness/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { apply, check } from '../../scripts/harness-sync.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-sync-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('harness-sync', () => {
  it('apply 生成 8 个 verb 的 SKILL.md / 命令桩 / 双工具软链', () => {
    apply(root)
    expect(existsSync(join(root, '.agents/skills/opsx-explore/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.claude/commands/opsx/explore.md'))).toBe(true)
    const link = readlinkSync(join(root, '.claude/skills/opsx-explore'))
    expect(link).toBe('../../.agents/skills/opsx-explore')
    expect(readlinkSync(join(root, '.codex/skills/opsx-explore'))).toBe('../../.agents/skills/opsx-explore')
  })

  it('apply 幂等: 二次运行零变更', () => {
    apply(root)
    const second = apply(root)
    expect(second.changed).toEqual([])
  })

  it('check: 同步后 ok, 删桩后报 drift', () => {
    apply(root)
    expect(check(root).ok).toBe(true)
    rmSync(join(root, '.claude/commands/opsx/verify.md'))
    const r = check(root)
    expect(r.ok).toBe(false)
    expect(r.drift.some((d: string) => d.includes('verify'))).toBe(true)
  })

  it('check: 桩内容漂移可被检出', () => {
    apply(root)
    writeFileSync(join(root, '.claude/commands/opsx/new.md'), 'tampered')
    expect(check(root).ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm test tests/harness/sync.test.ts 2>&1 | tail -15
```
Expected: FAIL — `Cannot find module '../../scripts/harness-sync.mjs'`

- [ ] **Step 3: 实现 harness-sync.mjs**

```js
// scripts/harness-sync.mjs
// 幂等分发: 生成 .agents/skills/*/SKILL.md + .claude/commands/opsx/*.md
// + .claude/skills 与 .codex/skills 的相对软链 (Windows/EPERM 回退复制)。
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
import { VERBS, skillMdContent, commandStubContent } from './harness-lib.mjs'

// 期望产物描述符
export function desiredArtifacts(root) {
  const items = []
  for (const v of VERBS) {
    items.push({
      kind: 'file',
      path: join(root, '.agents/skills', `opsx-${v}`, 'SKILL.md'),
      content: skillMdContent(v)
    })
    items.push({
      kind: 'file',
      path: join(root, '.claude/commands/opsx', `${v}.md`),
      content: commandStubContent(v)
    })
    items.push({
      kind: 'link',
      path: join(root, '.claude/skills', `opsx-${v}`),
      target: `../../.agents/skills/opsx-${v}`
    })
    items.push({
      kind: 'link',
      path: join(root, '.codex/skills', `opsx-${v}`),
      target: `../../.agents/skills/opsx-${v}`
    })
  }
  return items
}

function fileInSync(path, content) {
  return existsSync(path) && readFileSync(path, 'utf8') === content
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
    readFileSync(dstSkill, 'utf8') === readFileSync(srcSkill, 'utf8')
}

export function apply(root) {
  const changed = []
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
  for (const it of desiredArtifacts(root)) {
    if (it.kind === 'file' && !fileInSync(it.path, it.content)) drift.push(it.path)
    if (it.kind === 'link' && !linkInSync(root, it.path, it.target)) drift.push(it.path)
  }
  return { ok: drift.length === 0, drift }
}

function main() {
  const root = process.cwd()
  const checkMode = process.argv.includes('--check')
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

if (import.meta.url === `file://${process.argv[1]}`) main()
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm test tests/harness/sync.test.ts 2>&1 | tail -12
```
Expected: PASS — 4 passed

- [ ] **Step 5: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add scripts/harness-sync.mjs tests/harness/sync.test.ts
git commit -m "feat(harness): idempotent distribution sync with drift check

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: harness-check.mjs — 校验引擎 (TDD)

**Files:**
- Create: `scripts/harness-check.mjs`
- Test: `tests/harness/check.test.ts`

- [ ] **Step 1: 写失败测试 (fixture 驱动)**

```ts
// tests/harness/check.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { checkWorks, checkFriction, checkTemplates } from '../../scripts/harness-check.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-check-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function task(name: string, frontmatter: string, files: string[]): void {
  const dir = join(root, 'docs/works', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'INDEX.md'), `---\n${frontmatter}\n---\n`)
  for (const f of files) writeFileSync(join(dir, f), 'x')
}

describe('checkWorks', () => {
  it('feature 在 design 阶段须有 00-PRD + 01-ANALYSIS', () => {
    task('2026-05-29-SPFOODY-1-order-notes', 'task: t\ntype: feature\nphase: design\ncreated: 2026-05-29', [
      '00-PRD.md',
      '01-ANALYSIS.md'
    ])
    expect(checkWorks(root)).toEqual([])
  })

  it('design 阶段缺 01-ANALYSIS 报错', () => {
    task('2026-05-29-order-notes', 'task: t\ntype: feature\nphase: design\ncreated: 2026-05-29', ['00-PRD.md'])
    const errs = checkWorks(root)
    expect(errs.some((e) => e.includes('01-ANALYSIS.md'))).toBe(true)
  })

  it('非法目录命名报错', () => {
    task('OrderNotes', 'task: t\ntype: feature\nphase: explore\ncreated: 2026-05-29', ['00-PRD.md'])
    expect(checkWorks(root).some((e) => e.includes('naming'))).toBe(true)
  })

  it('非法 phase 枚举报错', () => {
    task('2026-05-29-x', 'task: t\ntype: feature\nphase: coding\ncreated: 2026-05-29', ['00-PRD.md'])
    expect(checkWorks(root).some((e) => e.includes('phase'))).toBe(true)
  })

  it('archive 阶段仍在 works 顶层报错', () => {
    task('2026-05-29-x', 'task: t\ntype: feature\nphase: archive\ncreated: 2026-05-29', [
      '00-PRD.md',
      '01-ANALYSIS.md',
      '02-SPEC.md',
      '03-PLAN.md'
    ])
    expect(checkWorks(root).some((e) => e.includes('_archive'))).toBe(true)
  })
})

describe('checkFriction', () => {
  it('合规命名通过, 非法命名报错', () => {
    mkdirSync(join(root, 'docs/friction'), { recursive: true })
    writeFileSync(join(root, 'docs/friction/20260529-implement-foo.md'), 'x')
    writeFileSync(join(root, 'docs/friction/bad-name.md'), 'x')
    const errs = checkFriction(root)
    expect(errs.some((e) => e.includes('bad-name'))).toBe(true)
    expect(errs.some((e) => e.includes('20260529-implement-foo'))).toBe(false)
  })
})

describe('checkTemplates', () => {
  it('模板缺失报错', () => {
    expect(checkTemplates(root).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm test tests/harness/check.test.ts 2>&1 | tail -12
```
Expected: FAIL — `Cannot find module '../../scripts/harness-check.mjs'`

- [ ] **Step 3: 实现 harness-check.mjs**

```js
// scripts/harness-check.mjs
// 校验: 源 playbook / 模板 / works 任务产物与命名 / friction 命名 / 分发完整性。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { VERBS, parseFrontmatter } from './harness-lib.mjs'
import { check as checkDistribution } from './harness-sync.mjs'

const WORK_NAME = /^\d{4}-\d{2}-\d{2}(-[A-Z][A-Z0-9]+-\d+)?-[a-z0-9-]+$/
const FRICTION_NAME = /^\d{8}-(explore|design|implement|verify)-[a-z0-9-]+\.md$/
const PHASES = ['explore', 'design', 'blocked', 'implement', 'verify', 'archive']
const PHASE_RANK = { explore: 0, design: 1, blocked: 1, implement: 2, verify: 3, archive: 4 }

function listDirs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => !n.startsWith('_') && statSync(join(p, n)).isDirectory())
}

function requiredArtifacts(type, phase) {
  const req = [type === 'bug' ? '00-BUG.md' : '00-PRD.md']
  const rank = PHASE_RANK[phase]
  if (rank >= 1) req.push('01-ANALYSIS.md')
  if (rank >= 2) req.push('02-SPEC.md', '03-PLAN.md')
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
  for (const f of ['INDEX.md', '00-PRD.md', '00-BUG.md', '01-ANALYSIS.md', '02-SPEC.md', '03-PLAN.md']) {
    if (!existsSync(join(wt, f))) errors.push(`templates: missing docs/works/_template/${f}`)
  }
  if (!existsSync(join(root, 'docs/friction/_template.md')))
    errors.push('templates: missing docs/friction/_template.md')
  return errors
}

export function checkWorkflowSources(root) {
  const errors = []
  if (!existsSync(join(root, '.agents/workflow/_shared.md')))
    errors.push('workflow: missing .agents/workflow/_shared.md')
  for (const v of VERBS) {
    if (!existsSync(join(root, '.agents/workflow', `${v}.md`)))
      errors.push(`workflow: missing .agents/workflow/${v}.md`)
  }
  return errors
}

export function checkAll(root) {
  const errors = [
    ...checkWorkflowSources(root),
    ...checkTemplates(root),
    ...checkWorks(root),
    ...checkFriction(root)
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

if (import.meta.url === `file://${process.argv[1]}`) main()
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm test tests/harness/check.test.ts 2>&1 | tail -12
```
Expected: PASS — 全部通过

- [ ] **Step 5: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add scripts/harness-check.mjs tests/harness/check.test.ts
git commit -m "feat(harness): structure/naming/distribution validator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 接线 package.json 脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在 scripts 块加入两条命令**

在 `"typecheck": "pnpm typecheck:node && pnpm typecheck:web"` 行之后 (该块最后一项, 需在其末尾补逗号) 追加:
```json
    "harness:sync": "node scripts/harness-sync.mjs",
    "harness:check": "node scripts/harness-check.mjs"
```

- [ ] **Step 2: 验证脚本可被 pnpm 调用 (此刻应报缺源文件, 属预期)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm harness:check 2>&1 | tail -8 || true
```
Expected: 输出 `harness-check: FAILED` 且列出 `.agents/workflow/...` 缺失 (源尚未创建, 符合预期)

- [ ] **Step 3: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add package.json
git commit -m "chore(harness): add harness:sync / harness:check scripts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: workflow/_shared.md — 门禁与契约

**Files:**
- Create: `.agents/workflow/_shared.md`

- [ ] **Step 1: 创建 _shared.md**

```markdown
# Workflow 共享契约

被 `.agents/workflow/*.md` 各 verb 引用。定义命名、状态契约、阶段门禁。

## 任务标识

以 Jira ID 为可选主键。任务目录命名 `{YYYY-MM-DD}[-{JIRA}]-{SUMMARY}`:
- `2026-05-29-SPFOODY-63829-order-notes` (有 Jira)
- `2026-05-29-cold-start-crash` (无 Jira)

SUMMARY 为 kebab-case。任务目录位于 `docs/works/`。

## INDEX.md 状态契约

每个任务目录含 `INDEX.md`, 顶部 YAML frontmatter 为唯一状态源:

\`\`\`yaml
---
task: 2026-05-29-SPFOODY-63829-order-notes
type: feature          # feature | bug
jira: SPFOODY-63829    # 可选
phase: explore         # explore | design | implement | verify | blocked | archive
created: 2026-05-29
artifacts:
  source: 00-PRD.md    # feature: 00-PRD.md; bug: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---
\`\`\`

`phase` 表示任务当前所处阶段, 即 `/opsx:continue` 将续跑的步骤。

## 阶段门禁

| phase | 必备产物 | 下一步 |
|---|---|---|
| explore | source | design |
| design | source + 01-ANALYSIS | implement 或 blocked |
| implement | source + 01-ANALYSIS + 02-SPEC + 03-PLAN | verify |
| verify | 同 implement | archive 或 退回 implement |
| blocked | source + 01-ANALYSIS | 人工澄清后回 design |
| archive | 全部 | 移入 docs/works/_archive |

## 不变量

1. 阶段间只靠 INDEX.md 与产物文件交接, 不靠会话记忆。
2. PRD/BUG 快照 (00-*) 为只读输入, 任何阶段不回写。
3. design 遇 PRD 级歧义 → phase 置 blocked 并在 INDEX 标注待澄清项, 不进 implement。
4. verify 不通过项回写 03-PLAN.md 新任务, phase 退回 implement。
5. 工程摩擦不就地处理, 沉到 docs/friction/{YYYYMMDD}-{phase}-{summary}.md。

## 工具

可用工具索引见 `.agents/tools.md`。项目地图见 `docs/ARCHITECTURE.md`。
```

- [ ] **Step 2: 验证文件存在**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
test -f .agents/workflow/_shared.md && grep -c "phase" .agents/workflow/_shared.md
```
Expected: 文件存在, 输出 ≥ 3

- [ ] **Step 3: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .agents/workflow/_shared.md
git commit -m "docs(harness): add workflow shared contract

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: workflow playbooks (new / continue / explore / design)

**Files:**
- Create: `.agents/workflow/new.md`, `.agents/workflow/continue.md`, `.agents/workflow/explore.md`, `.agents/workflow/design.md`

- [ ] **Step 1: 创建 new.md**

```markdown
# /opsx:new — 启动新任务

输入: 任务描述 + 可选 Jira ID (参数 $ARGUMENTS)。

步骤:
1. 读取 `.agents/workflow/_shared.md` 的命名与状态契约。
2. 确定任务类型 (feature / bug) 与 SUMMARY (kebab-case)。
3. 计算目录名 `{今日YYYY-MM-DD}[-{JIRA}]-{SUMMARY}`, 在 `docs/works/` 下创建。
4. 从 `docs/works/_template/` 拷贝模板:
   - 公共: INDEX.md, 01-ANALYSIS.md, 02-SPEC.md, 03-PLAN.md
   - feature 拷 00-PRD.md; bug 拷 00-BUG.md
5. 填写 INDEX.md frontmatter: task / type / jira / phase=explore / created。
6. 若有 PRD/BUG 来源, 将原始内容快照写入 00-PRD.md 或 00-BUG.md。

产出: `docs/works/{task}/` 初始化完成, phase=explore。
完成提示用户: 下一步 `/opsx:explore`。
```

- [ ] **Step 2: 创建 continue.md**

```markdown
# /opsx:continue — 继续已有任务

输入: 任务目录名或 Jira ID (参数 $ARGUMENTS); 为空时列出 `docs/works/` 下所有未归档任务供选择。

步骤:
1. 定位任务目录, 读取 INDEX.md frontmatter。
2. 按 `phase` 路由:
   - explore → 执行 `.agents/workflow/explore.md`
   - design → 执行 `.agents/workflow/design.md`
   - implement → 执行 `.agents/workflow/implement.md`
   - verify → 执行 `.agents/workflow/verify.md`
   - blocked → 向用户展示 INDEX 中标注的待澄清项, 澄清后回 design
   - archive → 提示该任务已可归档, 执行 `.agents/workflow/archive.md`
3. 不重置已完成阶段的产物。

产出: 续跑当前阶段。
```

- [ ] **Step 3: 创建 explore.md**

```markdown
# /opsx:explore — 探索 (Explore 阶段)

目标: 把外部需求与内部现实对齐, 建立对现状的真实理解。

前置: INDEX.phase == explore。

步骤:
1. 读取 00-PRD.md / 00-BUG.md 原始输入。
2. 用 `.agents/tools.md` 列出的工具拉取关联上下文 (代码、关联模块、历史设计)。
3. 阅读 `docs/ARCHITECTURE.md` 项目地图与相关模块文档。
4. 产出 `01-ANALYSIS.md`:
   - 现状理解 (涉及哪些进程/模块/IPC 契约)
   - 关联与依赖 (谁调用谁, region/scope 差异)
   - 验收标准 (逐条编号, 后续 SPEC 与 verify 据此核对)
   - 未决问题 (留给 design 向人澄清)
5. 更新 INDEX.phase = design。

不编码。摩擦记入 docs/friction。完成提示用户: `/opsx:design`。
```

- [ ] **Step 4: 创建 design.md**

```markdown
# /opsx:design — 设计 (Design 阶段)

目标: 基于 01-ANALYSIS 产出技术方案与任务清单。人在此澄清意图。

前置: INDEX.phase == design 且存在 01-ANALYSIS.md。

步骤:
1. 阅读 01-ANALYSIS.md 与 docs/ARCHITECTURE.md 约定。
2. 就 ANALYSIS 中的未决问题主动向工程师提问, 由人消解歧义, 不臆测。
3. 若存在 PRD 级歧义 (需 PM 澄清): 将 INDEX.phase 置 blocked, 在 INDEX 标注待澄清项, 停止, 不进 implement。
4. 否则产出:
   - `02-SPEC.md`: 数据契约、模块结构、组件拆分、测试策略; 每条回指 01-ANALYSIS 的验收标准编号。
   - `03-PLAN.md`: 从 SPEC 拆解的任务清单, 每任务可独立执行/验证, 顺序确定, 用 `- [ ]` 复选框。
5. 方案须遵守 ARCHITECTURE 的模块边界与 MVVM/进程隔离约定。
6. 更新 INDEX.phase = implement。

完成提示用户: `/opsx:implement`。
```

- [ ] **Step 5: 验证四文件存在**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
for f in new continue explore design; do test -f .agents/workflow/$f.md && echo "$f OK" || echo "$f MISSING"; done
```
Expected: 四行均 `OK`

- [ ] **Step 6: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .agents/workflow/new.md .agents/workflow/continue.md .agents/workflow/explore.md .agents/workflow/design.md
git commit -m "docs(harness): add new/continue/explore/design playbooks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: workflow playbooks (implement / verify / archive / optimization)

**Files:**
- Create: `.agents/workflow/implement.md`, `.agents/workflow/verify.md`, `.agents/workflow/archive.md`, `.agents/workflow/optimization.md`

- [ ] **Step 1: 创建 implement.md**

```markdown
# /opsx:implement — 实现 (Implementation 阶段)

目标: 按 03-PLAN.md 落地实现。

前置: INDEX.phase == implement 且存在 02-SPEC.md 与 03-PLAN.md。

步骤:
1. 按 03-PLAN.md 任务顺序逐项实现。
2. 每项: 先写单元测试, 后写最小实现, 跑测试通过, 频繁提交。
3. 将 03-PLAN.md 当作活清单: 完成项勾掉, 与方案的偏差就地记录在 PLAN 中。
4. 遇到工程摩擦 (卡顿、被迫手动补的上下文、被迫的手动修正) 不就地消化, 写入
   `docs/friction/{YYYYMMDD}-implement-{summary}.md` (模板见 docs/friction/_template.md)。
5. 全部任务完成后, 更新 INDEX.phase = verify。

产出: 代码 + 单测 + 更新后的 03-PLAN.md。完成提示用户: `/opsx:verify`。
```

- [ ] **Step 2: 创建 verify.md**

```markdown
# /opsx:verify — 验证 (Verify 阶段)

目标: 完成完整测试 + code review + 前端视觉/交互验收。人在此确认验收。

前置: INDEX.phase == verify。

步骤:
1. 机械检查: `pnpm lint`, `pnpm typecheck`, `pnpm test` 全绿 (CI 亦会拦截)。
2. Code Review (只看机器判断不了的部分):
   - 对照 01-ANALYSIS.md 验收标准逐条核对产出。
   - 对照 02-SPEC.md 与 docs/ARCHITECTURE.md, 检查是否偏离设计、越界、违反 MVVM/进程隔离。
3. 前端验收: 用 `run` skill / Playwright `_electron` 启动应用, 截图, 走通受影响界面的交互流程,
   完成视觉与交互验收 (Agent 需"看到界面、摸到设备")。
4. 不通过项: 回写为 03-PLAN.md 新任务, 将 INDEX.phase 退回 implement, 重新进入开发循环。
5. 全部通过后, 提示用户确认验收, 然后 `/opsx:archive`。

评审记录留在 PR/CI, 不进入项目持久层。
```

- [ ] **Step 3: 创建 archive.md**

```markdown
# /opsx:archive — 归档

目标: 完成一个任务。

前置: verify 全部通过。

步骤:
1. 将 INDEX.phase 置 archive。
2. 将 `docs/works/{task}/` 整体移动到 `docs/works/_archive/{task}/`, 避免污染上下文。
3. 提交代码 (遵守提交规范), 准备提测。
4. 若任务关联 `docs/issues/`, 更新其状态并交叉引用归档路径。

产出: 任务归档 + commit。
```

- [ ] **Step 4: 创建 optimization.md**

```markdown
# /opsx:optimization — 流程优化

目标: 消费 docs/friction 的经验, 优化工作流本身。

步骤:
1. 阅读 `docs/friction/` 下未归档的摩擦记录。
2. 归类: 哪些应固化为 `.agents/workflow/*.md` 的步骤改进, 哪些应补进 `.agents/tools.md`
   或 `docs/ARCHITECTURE.md`, 哪些应补成新的 skill。
3. 落地改进 (修改对应 playbook / 文档)。
4. 改进对应的摩擦记录移入 `docs/friction/_archive/`。
5. 若改动了分发产物的生成逻辑, 运行 `pnpm harness:sync`。

产出: 工作流增量优化。这是反馈闭环, 使每完成一个任务工作流更可靠。
```

- [ ] **Step 5: 验证四文件存在**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
for f in implement verify archive optimization; do test -f .agents/workflow/$f.md && echo "$f OK" || echo "$f MISSING"; done
```
Expected: 四行均 `OK`

- [ ] **Step 6: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .agents/workflow/implement.md .agents/workflow/verify.md .agents/workflow/archive.md .agents/workflow/optimization.md
git commit -m "docs(harness): add implement/verify/archive/optimization playbooks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: .agents/README.md + tools.md

**Files:**
- Create: `.agents/README.md`, `.agents/tools.md`

- [ ] **Step 1: 创建 .agents/README.md**

```markdown
# .agents — AI Native Workflow Harness

berth 的 Agent 工作流单一真源, 同时服务 Claude Code 与 Codex。

## 结构

- `workflow/` — 流程 playbook (唯一真源, 手写)
  - `_shared.md` 门禁与状态契约; 8 个 verb 各一份。
- `skills/opsx-<verb>/SKILL.md` — 薄指针 (由 `pnpm harness:sync` 生成, 勿手改)。
- `tools.md` — 可用工具索引。

## 分发

`pnpm harness:sync` 幂等生成:
- `.agents/skills/opsx-<verb>/SKILL.md`
- `.claude/skills/opsx-<verb>` 与 `.codex/skills/opsx-<verb>` 软链
- `.claude/commands/opsx/<verb>.md` 命令桩 (commands 不跟随软链, 故复制)

`pnpm harness:check` 校验产物/模板/命名/分发。CI 强制。

## 调用

- Claude Code: `/opsx:<verb>` (命令) 或 `opsx-<verb>` (skill)
- Codex: `opsx-<verb>` (skill)

verb: new · continue · explore · design · implement · verify · archive · optimization

## 四阶段

Explore → Design → Implementation → Verify。人在 design 澄清意图, 在 verify 确认验收, 其余交给 Agent。
状态见各任务 `docs/works/{task}/INDEX.md`; 摩擦见 `docs/friction/`。

## 观测 (v2)

工作流健康度观测机制留待 v2, 当前未实现。
```

- [ ] **Step 2: 创建 .agents/tools.md**

```markdown
# 工具索引

berth 项目自用工具 (不含企业内部设施)。Agent 据此主动获取上下文与执行验证。

## 版本控制
- `git` — 版本操作; 提交规范见根 AGENTS.md。
- `gh` — GitHub CLI (PR / issue / CI 状态), 远端 Caldis/berth。

## 包与构建
- `pnpm` (钉死 9.x, 见 package.json packageManager) — 依赖与脚本。
- `electron-vite` — 开发/构建 (`pnpm dev` / `pnpm build`)。

## 测试与验证
- `pnpm test` (Vitest) — 单元测试。
- `pnpm test:e2e` (Playwright) — 端到端。
- `run` skill / Playwright `_electron` REPL + 截图 — 启动应用做视觉/交互验收。
- `pnpm lint` / `pnpm typecheck` — 机械检查。
- `pnpm harness:check` / `pnpm harness:sync` — harness 自检与分发。

## 项目地图
- `docs/ARCHITECTURE.md` — 进程/模块边界、IPC 契约、安全约束。
```

- [ ] **Step 3: 验证**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
test -f .agents/README.md && test -f .agents/tools.md && echo "BOTH OK"
```
Expected: `BOTH OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .agents/README.md .agents/tools.md
git commit -m "docs(harness): add .agents README and tools index

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: works 模板 + friction 模板

**Files:**
- Create: `docs/works/_template/INDEX.md`, `00-PRD.md`, `00-BUG.md`, `01-ANALYSIS.md`, `02-SPEC.md`, `03-PLAN.md`
- Create: `docs/friction/_template.md`

- [ ] **Step 1: 创建 docs/works/_template/INDEX.md**

```markdown
---
task: {YYYY-MM-DD}-{SUMMARY}
type: feature
jira:
phase: explore
created: {YYYY-MM-DD}
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# {任务标题}

任务索引与交接锚。phase 字段为唯一状态源, `/opsx:continue` 据此续跑。

## 产物
- [ ] 00-PRD.md / 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
```

- [ ] **Step 2: 创建 00-PRD.md 与 00-BUG.md**

`docs/works/_template/00-PRD.md`:
```markdown
# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

## 正文
```

`docs/works/_template/00-BUG.md`:
```markdown
# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:

## 复现步骤

## 期望 vs 实际
```

- [ ] **Step 3: 创建 01-ANALYSIS.md / 02-SPEC.md / 03-PLAN.md**

`docs/works/_template/01-ANALYSIS.md`:
```markdown
# 需求分析 (Explore 产物)

## 现状理解
涉及的进程 / 模块 / IPC 契约 (参 docs/ARCHITECTURE.md)。

## 关联与依赖
调用关系、region/scope 差异、历史设计取舍。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1.

## 未决问题
留给 design 向人澄清。
```

`docs/works/_template/02-SPEC.md`:
```markdown
# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

## 测试策略

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
```

`docs/works/_template/03-PLAN.md`:
```markdown
# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [ ] 任务 1:
- [ ] 任务 2:

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
```

- [ ] **Step 4: 创建 docs/friction/_template.md**

```markdown
# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: explore|design|implement|verify)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

## 现象
卡顿 / 被迫手动补的上下文 / 被迫的手动修正。

## 工程师介入动作

## 应沉淀的上下文或规则

## 建议的流程改进
(由 /opsx:optimization 消费)
```

- [ ] **Step 5: 验证模板齐全 (校验器 checkTemplates 应通过)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
node -e "import('./scripts/harness-check.mjs').then(m=>{const e=m.checkTemplates(process.cwd());console.log(e.length===0?'TEMPLATES_OK':'MISSING:'+e.join(','))})"
```
Expected: `TEMPLATES_OK`

- [ ] **Step 6: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add docs/works/_template docs/friction/_template.md
git commit -m "docs(harness): add works and friction templates

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: docs/ARCHITECTURE.md — Project Map

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: 先核对真实源码结构 (避免地图与代码漂移)**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
find src -maxdepth 3 -type d | sort
echo "--- IPC handlers ---"; find src/main/ipc -type f 2>/dev/null
echo "--- shared types ---"; find src/shared -type f 2>/dev/null
```
记录实际目录, 用于下一步填充/修正。

- [ ] **Step 2: 创建 docs/ARCHITECTURE.md (基于下方骨架, 按 Step 1 实测修正路径)**

```markdown
# berth 架构 (Project Map)

面向 Agent 的项目地图。渐进式披露的入口之一, 详见各模块。

## 进程边界

- `src/main/` — Electron 主进程 (Node.js)。文件系统访问、扫描、IPC handler。
- `src/preload/` — contextIsolation 预加载桥, 暴露受控 API 给渲染层。
- `src/renderer/` — React 19 应用 (UI)。无直接 Node 访问。
- `src/shared/` — 跨进程共享类型 (Asset model, IPC 契约)。

## 主进程模块

- `src/main/adapters/` — Agent 适配器 (v0.1 仅 Claude Code), 25+ 资产类型扫描器, YAML/JSON/Markdown 解析, @path 导入链解析。
- `src/main/engine/` — 资产引擎: 全量+增量扫描、chokidar 文件监听、MiniSearch 全文索引、关系解析。
- `src/main/ipc/` — IPC handler 注册 (16 个 handler)。

## IPC 契约

- 渲染层经 preload 暴露的 API 调用主进程; `contextIsolation: true`, `nodeIntegration: false`。
- 契约类型定义于 `src/shared/types/`。修改 handler 须同步更新共享类型。

## 数据模型

- Asset model: 统一资产表示。
- Scope merge: user / project / enterprise 配置合并展示规则。

## 安全约束 (硬边界)

- 只读: v0.1 不写任何本地文件。
- 凭证隔离: OAuth token / API key 不进渲染进程, 仅探测存在性, 标记 `sensitive: true`。
- 路径白名单: 扫描器仅访问预定义路径。
- 无遥测: 数据不出本机。

## 技术栈

Electron 33 (electron-vite 5) · React 19 + TS · Tailwind/shadcn · Zustand · react-router-dom 7 · Recharts · i18next · MiniSearch · better-sqlite3 · chokidar · Vitest · Playwright。

## 相关
- 工作流: `.agents/README.md`
- 任务态: `docs/works/` · 摩擦: `docs/friction/`
```

- [ ] **Step 3: 验证地图路径与源码一致 (人工核对 Step 1 输出, 修正任何不符项)**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
for d in src/main/adapters src/main/engine src/main/ipc src/shared; do test -d $d && echo "$d OK" || echo "$d MISSING-修正ARCHITECTURE.md"; done
```
Expected: 四行 `OK` (若有 MISSING, 据实修改 ARCHITECTURE.md 对应段落)

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add docs/ARCHITECTURE.md
git commit -m "docs(harness): add ARCHITECTURE project map

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: 运行分发同步, 提交生成产物

**Files:**
- Generated: `.agents/skills/opsx-*/SKILL.md`, `.claude/skills/opsx-*`, `.claude/commands/opsx/*.md`, `.codex/skills/opsx-*`

- [ ] **Step 1: 运行 harness:sync 生成分发产物**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm harness:sync
```
Expected: `harness-sync: updated 32 artifact(s)` (8 SKILL.md + 8 stub + 8+8 link)

- [ ] **Step 2: 验证 sync 幂等 (二次运行零变更)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm harness:sync
```
Expected: `harness-sync: already in sync (0 changes)`

- [ ] **Step 3: 运行 harness:check 全绿**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm harness:check
```
Expected: `harness-check: all checks passed`

- [ ] **Step 4: 验证软链解析正确**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
readlink .claude/skills/opsx-explore
readlink .codex/skills/opsx-explore
cat .claude/skills/opsx-explore/SKILL.md | head -2
```
Expected: 两个 readlink 均输出 `../../.agents/skills/opsx-explore`; cat 输出含 `name: opsx-explore`

- [ ] **Step 5: Commit (含软链, 确认 git 以 symlink 模式记录)**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .agents/skills .claude/skills .claude/commands .codex/skills
git ls-files -s .claude/skills/opsx-explore | grep -q '^120000' && echo "SYMLINK_TRACKED" || echo "WARN: not symlink mode"
git commit -m "chore(harness): generate skill pointers, command stubs, symlinks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
Expected: 输出 `SYMLINK_TRACKED`

---

## Task 13: 实现首步亲验 — 命令可见性 (人工)

**Files:** 无 (验证 + 记录)

- [ ] **Step 1: 验证 Codex 软链可解析 (自动)**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
test -f .codex/skills/opsx-design/SKILL.md && echo "CODEX_LINK_RESOLVES"
test -f .claude/skills/opsx-design/SKILL.md && echo "CLAUDE_LINK_RESOLVES"
```
Expected: 两行均输出 (软链跟随到目标 SKILL.md)

- [ ] **Step 2: 人工验证 Claude Code 命令命名空间**

在本仓库目录启动 Claude Code, 输入 `/opsx` 观察补全菜单:
- 若出现 `/opsx:new` … `/opsx:optimization` (冒号) → 冒号命名空间成立, spec 第 15 节该项确认。
- 若只出现 `/opsx-new` …(连字符) 或 skill 形式 → 走 skill 通道, 在 `.agents/README.md` 标注 Claude 用 `/opsx-<verb>`。

记录结论 (无论哪种, skill 通道始终可用, 不阻塞)。

- [ ] **Step 3: 人工验证 Codex skill 可见**

在本仓库目录启动 Codex, 确认 `opsx-*` skills 出现在 skill 列表且可触发其一 (如 opsx-new)。

- [ ] **Step 4: 若结论与 spec 第 15 节假设不符, 更新 .agents/README.md 调用说明并 commit**

```bash
cd /Users/caldis/Desktop/Code/berth
# 仅当需要修正调用说明时执行
git add .agents/README.md
git commit -m "docs(harness): correct invocation form per verified tool behavior

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: AGENTS.md 索引章节 + docs/issues 重定向

**Files:**
- Modify: `AGENTS.md`, `docs/issues/AGENTS.md`

- [ ] **Step 1: 在 AGENTS.md 末尾追加 Harness 索引章节**

```markdown

# AI NATIVE WORKFLOW HARNESS
Agent 工作流体系, 单一真源在 `.agents/`, 同时服务 Claude Code 与 Codex。
- 总览与调用: `.agents/README.md`
- 流程 playbook: `.agents/workflow/` (Explore → Design → Implementation → Verify)
- 工具索引: `.agents/tools.md`; 项目地图: `docs/ARCHITECTURE.md`
- 任务态 (操作目录, 非冷文档): `docs/works/{date}[-{jira}]-{summary}/`
- 工程摩擦: `docs/friction/{yyyymmdd}-{phase}-{summary}.md`
- 自检/分发: `pnpm harness:check` / `pnpm harness:sync` (CI 强制)
命令: /opsx:new · continue · explore · design · implement · verify · archive · optimization
```

- [ ] **Step 2: 验证 AGENTS.md 仍 < 500 行**

Run:
```bash
cd /Users/caldis/Desktop/Code/berth
wc -l AGENTS.md
```
Expected: 行数 < 500

- [ ] **Step 3: 改写 docs/issues/AGENTS.md 为重定向 (在文件顶部追加说明, 保留原内容)**

读取 `docs/issues/AGENTS.md` 现有内容, 在其首行之前插入:
```markdown
> 重定向: 开发过程中的工程摩擦 (卡顿/手动补的上下文/被迫修正) 改记入 AI Native Workflow 的
> `docs/friction/{yyyymmdd}-{phase}-{summary}.md`, 由 `/opsx:optimization` 消费。本目录用于
> 跟踪产品缺陷与改进项, 与 friction 双向交叉引用。详见 `.agents/README.md`。

```

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add AGENTS.md docs/issues/AGENTS.md
git commit -m "docs(harness): wire AGENTS index and docs issue guidance

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Dogfood — pnpm 摩擦记录 + issue

**Files:**
- Create: `docs/friction/20260529-implement-pnpm-version-pinning.md`
- Create: `docs/issues/20260529-pnpm-version-pinning.md`

- [ ] **Step 1: 创建 friction 记录**

```markdown
# 工程摩擦记录

## 发生阶段
implement (首次 `pnpm dev` 启动 berth)。

## 现象
非交互环境无 pnpm; 经 corepack 启用时默认拉取 pnpm 11.4.0。pnpm 11 不再读取
`package.json` 的 `pnpm.onlyBuiltDependencies`, 跳过 better-sqlite3 / electron / esbuild
的构建脚本 (原生模块不编译、Electron 二进制不下载); 且自动生成无效 `pnpm-workspace.yaml`
(缺 packages 字段), 导致后续所有 pnpm 命令报 `packages field missing or empty`,
`pnpm dev` 连续失败。

## 工程师介入动作
删除 rogue `pnpm-workspace.yaml`; `corepack prepare pnpm@9.15.4 --activate` 钉死版本;
以 `--ignore-workspace --node-linker=hoisted` 重装, 原生模块成功编译, 应用启动。

## 应沉淀的上下文或规则
本项目必须用 pnpm 9.x。corepack 默认版本会破坏构建。

## 建议的流程改进 (已落地)
package.json 增 `"packageManager": "pnpm@9.15.4"`; CI 用 pnpm/action-setup 钉死 9.15.4。
关联 issue: docs/issues/20260529-pnpm-version-pinning.md。
```

- [ ] **Step 2: 创建 issue 记录**

```markdown
# pnpm 版本必须钉死为 9.x

- 类型: 构建/工具链
- 状态: 已解决 (package.json packageManager + CI)
- 关联摩擦: docs/friction/20260529-implement-pnpm-version-pinning.md

## 问题
corepack 默认 pnpm 11 无视 `pnpm.onlyBuiltDependencies`, 跳过原生构建脚本,
并生成无效 pnpm-workspace.yaml, 破坏 `pnpm dev`。

## 解决
1. package.json 增 `"packageManager": "pnpm@9.15.4"`。
2. CI 用 `pnpm/action-setup@v4` 指定 9.15.4。
3. README 的 "pnpm 9+" 措辞偏宽松, 实际须 9.x (后续可收紧文案)。
```

- [ ] **Step 3: 验证 friction 命名合规 (校验器)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
node -e "import('./scripts/harness-check.mjs').then(m=>{const e=m.checkFriction(process.cwd());console.log(e.length===0?'FRICTION_OK':e.join(','))})"
```
Expected: `FRICTION_OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add docs/friction/20260529-implement-pnpm-version-pinning.md docs/issues/20260529-pnpm-version-pinning.md
git commit -m "docs(harness): record pnpm pinning friction + issue (dogfood)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: CI + PR 模板

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/pull_request_template.md`

- [ ] **Step 1: 创建 .github/workflows/ci.yml**

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm harness:check
```

- [ ] **Step 2: 创建 .github/pull_request_template.md**

```markdown
## 概述
<!-- 本 PR 做了什么, 关联哪个任务 -->

关联任务: `docs/works/{date}-{summary}/` (或 N/A)
关联 docs/issues / friction:

## 验收标准
<!-- 对照 01-ANALYSIS.md 逐条勾选 -->
- [ ]

## 自检
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm harness:check` 通过
- [ ] 前端改动已做视觉/交互验收 (截图见下)
- [ ] 工程摩擦已记入 docs/friction (若有)

## 截图 / 验收证据
```

- [ ] **Step 3: 校验 CI YAML 语法**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
node -e "const y=require('js-yaml');y.load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log('YAML_OK')"
```
Expected: `YAML_OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/caldis/Desktop/Code/berth
git add .github/workflows/ci.yml .github/pull_request_template.md
git commit -m "ci(harness): add CI pipeline and PR template

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: 全量验收 + 收尾

**Files:** 无 (验证)

- [ ] **Step 1: 全量机械检查 (模拟 CI)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
pnpm lint && pnpm typecheck && pnpm test && pnpm harness:check
echo "ALL_GREEN=$?"
```
Expected: 末尾 `ALL_GREEN=0`, harness 测试 (sync + check) 与既有单测全部通过

- [ ] **Step 2: 验证干净安装可重建 (corepack 不再破坏)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
rm -rf node_modules && pnpm install --frozen-lockfile 2>&1 | tail -2
ls node_modules/better-sqlite3/build/Release/better_sqlite3.node >/dev/null && echo "NATIVE_OK"
```
Expected: `NATIVE_OK`

- [ ] **Step 3: 逐条核对 spec 验收标准 (spec 第 14 节)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH"
cd /Users/caldis/Desktop/Code/berth
echo "1 sync 幂等:"; pnpm harness:sync
echo "2 check:"; pnpm harness:check
echo "4 verb 分发:"; ls .claude/commands/opsx | wc -l; ls .codex/skills | wc -l
echo "7 AGENTS 行数:"; wc -l AGENTS.md
echo "8 dogfood:"; grep -q 'pnpm@9.15.4' package.json && echo pnpm-pinned
```
Expected: sync 0 changes; check passed; 两个目录各 8; AGENTS < 500; `pnpm-pinned`

- [ ] **Step 4: 创建端到端样例任务, 走查 new→archive 路径可行性 (手动冒烟, 完成后删除样例)**

在 Claude Code 或 Codex 中对一个最小样例触发 `/opsx:new` 起一个临时任务, 确认目录与模板正确生成、INDEX.phase 流转符合 _shared.md 契约; 冒烟后:
```bash
cd /Users/caldis/Desktop/Code/berth
rm -rf docs/works/2026-05-29-*smoke* 2>/dev/null; echo "smoke cleaned"
```

- [ ] **Step 5: 收尾 (推送 / PR 决策)**

REQUIRED SUB-SKILL: 调用 `superpowers:finishing-a-development-branch` 决定合并/PR/清理。分支 `feature/ai-native-workflow-harness`, 远端 `Caldis/berth`, 可用 `gh`。

---

## Self-Review

**1. Spec coverage:** 第 1-3 节背景/映射/现状 → 体现在各 playbook 与 README (T6-9); 第 4 节双工具决策 → T2/T3/T12/T13; 第 5 节目录树 → 全量任务; 第 6 节四设施 → 指令(T11,T14)/工具(T9)/状态(T10)/反馈(T16,T8 verify,T15); 第 7 节四阶段 → T7/T8 playbook + _shared(T6); 第 8 节 verb 规格 → T7/T8; 第 9 节 sync → T3; 第 10 节 check+测试 → T4; 第 11 节任务计划/docs/issues 调和 → T14; 第 12 节 pnpm → T1+T15; 第 13 节 CI/PR → T16; 第 14 节验收 → T17; 第 15 节亲验 → T13; 第 16 节范围外 (观测 v2) → README 占位(T9)。无遗漏。

**2. Placeholder scan:** 模板文件中的 `{YYYY-MM-DD}` / `{SUMMARY}` 是模板占位符 (交付物的有意内容, 非计划缺口); 代码与命令步骤均含完整内容。无 TODO/TBD/"类似 Task N"。

**3. Type consistency:** `harness-lib.mjs` 导出 `VERBS / skillMdContent / commandStubContent / parseFrontmatter`; sync 导入前三 + 自有 `desiredArtifacts/apply/check`; check 导入 `VERBS/parseFrontmatter` + sync 的 `check`(as checkDistribution) + 自有 `checkWorks/checkFriction/checkTemplates/checkWorkflowSources/checkAll`。测试导入名与实现一致。命令桩/SKILL 内容生成器单一来源, sync 写、check 比, 无重复定义。
