# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

扩展 `HealthCheck`:

```ts
export interface HealthCheckEvidence {
  label: string
  url: string
}

export interface HealthCheckFix {
  label: string
  description: string
  snippet?: string
}

export interface HealthCheckTarget {
  route?: string
  path?: string
  assetId?: string
}

export interface HealthCheck {
  // existing fields...
  evidence?: HealthCheckEvidence[]
  fix?: HealthCheckFix
  target?: HealthCheckTarget
  confidence?: 'high' | 'medium' | 'low'
}
```

约定:

- `evidence` 只放官方文档 URL, 不放长摘录。
- `fix` 只给只读建议和可复制片段, 不自动写文件。
- `target.route` 是 UI 深度跳转首选; 当前先支持 `/configuration/capabilities?tab=hooks|mcp|permissions|env`, `/configuration/instructions`, `/sessions/{id}`。
- `confidence` 用于表达经验性规则边界; schema/语法错误为 high, 平台兼容提示为 medium, 隐私/质量提示为 low。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/shared/types/ipc.ts`: 增加 evidence/fix/target/confidence 类型。
- `src/main/engine/health.ts`: 增加官方 evidence 常量、target/fix helper, 并修正误报规则。
- `src/renderer/src/pages/overview.tsx`: 展示 evidence/fix, 点击优先使用 `check.target.route`。
- `tests/unit/health-check.test.ts`: 覆盖 evidence/fix/target 和误报修正。
- `tests/renderer/overview-health-checks.test.tsx`: 覆盖 evidence 展示和 target 跳转。

本阶段不改:

- settings 页额外目录配置。
- scanner/watcher 增量刷新。
- capabilities 页 query param 解析。如果 capabilities 未消费 `?tab=hooks`, 仍先把 route 数据送到 UI; 后续再增强页面接收 query。

## 测试策略

- 单测:
  - Codex ignored project config key -> warning + evidence + fix。
  - Codex prompt/agent hook -> info, 不报结构错误。
  - Claude plain command hook on Windows -> 不 warning。
  - Claude PowerShell-like command on Windows without `shell: "powershell"` -> warning。
  - Claude hook `args` + `shell` -> info。
  - Claude skill `SKILL.md` 缺 description -> 不报错。
- Renderer:
  - evidence link 可见。
  - target route 优先于 path open。
- 回归:
  - `pnpm test -- tests/unit/health-check.test.ts`
  - `pnpm test -- tests/renderer/overview-health-checks.test.tsx`
  - `pnpm typecheck`
  - 若全局工作区恢复: `pnpm harness:check`

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| HealthCheck evidence/fix/target/confidence | 1, 2 |
| Overview evidence 展示与 target 跳转 | 2, 3, 11 |
| Codex schema URL、ignored key、hooks、skills、agents 修正 | 4, 5, 6, 11 |
| Claude hooks/MCP/subagent/skills/CLAUDE.md 误报修正 | 7, 8, 11 |
| 额外 home/WSL 后续阶段边界 | 9 |
| 增量刷新后续阶段边界 | 10 |
| 验证与 harness blocker 说明 | 12 |
