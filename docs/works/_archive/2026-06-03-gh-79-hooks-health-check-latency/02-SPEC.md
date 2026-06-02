# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增健康检查请求参数, 保持返回值仍为 `HealthCheck[]`, 避免改动 Overview 和 Hooks 的数据消费面。

```ts
export interface HealthCheckRequest {
  refresh?: boolean
}
```

- `refresh: false | undefined`: main 端仅在 scanner 尚未扫描时执行 `scanAll()`, 否则复用当前 scanner 缓存生成健康检查。
- `refresh: true`: main 端执行 `scanAll()`, 用于用户显式刷新或 watcher 触发的资产变更。
- preload 的 `window.api.assets.healthCheck(opts?)` 接受同一个参数。
- renderer 的 `useHealthChecks()` 继续返回 `checks`, `loading`, `lastCheckedAt`, `refresh`, 另新增 `stale`:

```ts
{
  checks: HealthCheck[]
  loading: boolean
  stale: boolean
  lastCheckedAt: string | null
  refresh: (opts?: { force?: boolean }) => void
}
```

`stale=true` 表示当前展示的是上次成功结果, 后台正在刷新。

## 任务分类与 debt

- type / maintenance.subtype: `bug`
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-BUG-hooks-health-check-latency.md`
- debt.estimate: 沿用 explore 估算, `incurred=4 net=4`, cross-process medium risk。
- debt.final 预期: 新增少量共享状态与 IPC 参数, 通过单测和 renderer 测试降低风险, 预计 `net=1`。
- revisions: design 暂不修正。
- Project 字段同步: design 产物完成后运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-79-hooks-health-check-latency`。

## 模块结构 / 组件拆分

- `src/shared/types/ipc.ts`
  - 增加 `HealthCheckRequest`。
  - 将 `assets:health-check` args 从 `[]` 改为 `[HealthCheckRequest?]`。
- `src/preload/index.ts` / `src/preload/index.d.ts`
  - `healthCheck(opts?)` 透传到 IPC。
- `src/main/ipc/handlers.ts`
  - `assets:health-check` 根据 `opts.refresh` 和 `scanner.hasScanned()` 决定是否调用 `scanner.scanAll()`。
  - 保持 `runHealthChecks()` 输入为 scanner 当前 assets/errors/projectDir。
- `src/renderer/src/hooks/use-ipc.ts`
  - 引入模块级 health check cache、in-flight promise 和 60s TTL。
  - 首次无缓存时显示 loading 并请求 `{ refresh: false }`。
  - 有缓存且 TTL 内时直接返回缓存, 不发 IPC。
  - 有缓存但 TTL 过期时保留缓存, `stale=true`, 后台请求 `{ refresh: false }`。
  - 收到 `assets:changed` 后保留缓存, `stale=true`, 后台请求 `{ refresh: true }`。
  - 并发请求复用 in-flight promise。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - `HookHealthSignal` 接收 `stale`。
  - stale 时顶部 tag 显示“Refreshing / 刷新中”, tooltip 说明正在后台刷新当前 Agent 视角的 Hook 检查, 同时保留旧结果和 severity tags。
- `src/renderer/src/i18n/locales/{en,zh}.json`
  - 增加 stale 文案, 不增加长说明块。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增平铺区块; 继续把健康检查放在 sticky 生命周期 sidebar 内 | renderer 测试 + Electron 实测 |
| 组件选择 / 设计系统一致性 | 继续使用现有小 tag + hover/focus tooltip | renderer 测试检查 role/tooltip 文案 |
| 交互反馈 / 状态切换 | 首次 `Checking`, 后台刷新 `Refreshing`, 旧结果继续可见 | renderer 测试覆盖资产变更刷新 |
| loading / empty / error / disabled / focus | loading 和 ok 复用现有状态; stale 新增文案; tooltip 支持 focus | renderer 测试 + 手动 focus/hover |
| 响应式 / 可访问性 / 键盘可达 | 不改变 sidebar 响应式结构; tag 仍是 button, 可 focus | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 英中 stale 文案简短, 明确范围是 Hook + 当前 Agent 视角 | renderer 测试覆盖英文; typecheck 覆盖 i18n 结构 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| `useHealthChecks` 首次加载、缓存命中、并发去重、资产变更强制刷新 | renderer | `tests/renderer/use-health-checks.test.tsx` | `pnpm vitest run tests/renderer/use-health-checks.test.tsx` | 不适用 |
| Hooks sidebar stale 状态保留旧检查结果 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` | 不适用 |
| IPC 参数和 main 端非强制路径 | unit / typecheck | `tests/unit/engine-scanner.test.ts` 或 handler 相关测试, 以及 `pnpm typecheck:node` | `pnpm typecheck:node` | handler 直接测试若现有 harness 不适合, 至少用 typecheck 加 renderer 调用参数测试覆盖契约 |
| 最终回归 | harness / typecheck / targeted tests | 多文件 | `pnpm harness:check`; `pnpm typecheck:web`; `pnpm typecheck:node` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `HealthCheckRequest.refresh` 与 main handler 分支 | 1, 2, 3, 5 |
| renderer 共享缓存、TTL、in-flight 去重 | 1, 2, 3, 4, 8 |
| Hooks stale tag 与 tooltip | 3, 6, 7 |
| Overview 共享 hook 不退化 | 4, 8 |
