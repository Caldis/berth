# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

本任务保留内部 sidecar 文件格式, 删除 renderer 可见的恢复中心契约。

- 保留:
  - Claude Code soft-remove sidecar: `~/.claude/.berth/hooks-state.json`
  - Hook asset 元数据: `enabled`, `effectiveEnabled`, `canToggleHook`, `toggleStrategy: 'soft-remove'`, `disabledByBerth`, `disabledAt`, `removedCount`
  - 统一行内启停 IPC: `hooks:set-hook-enabled`
- 删除 renderer/API surface:
  - `HookRecoveryStatus`
  - `HookRecoveryPoint`
  - `HookRecoveryIssue`
  - `HookRecoveryListResult`
  - `ClearHookRecoveryRequest`
  - `ClearHookRecoveryResult`
  - `hooks:recoveries`
  - `hooks:clear-recovery`
  - `window.api.hooks.recoveries()`
  - `window.api.hooks.clearRecovery()`
- 主进程不再提供集中恢复点枚举/清理能力。sidecar 只通过 `setHookEnabled({ agentId: 'claude-code', enabled })` 的 disable/restore 路径读写。
- Claude user Hook 扫描条件改为: `settings.json` 存在或 user sidecar 存在时都允许扫描 Hook。`settings.json` 缺失但 sidecar 存在时, 只生成 disabled Hook assets, 不解析 permissions/env。

## 任务分类与 debt
- type / maintenance.subtype: feature
- source.kind / refs: user-request / GH-104
- debt.estimate: 不变, `net=2`, scope=module, risk=medium, areas=[ui-ux, architecture]
- debt.final 预期: verify 前填写
- revisions: 无
- Project 字段同步: 0.0-new 与 explore 阶段已 ensure, design 后再次 ensure
- harness:stats: 2026-06-04 输出 total=5, status=ok, 不触发维护任务 gate

## 模块结构 / 组件拆分

1. `src/main/adapters/claude-code/scanner.ts`
   - 对 user scope 计算 `sidecarPath` 和 `sidecarExists`。
   - 当 `settings.json` 不存在但 sidecar 存在时, 仍调用 `parseHooks(fp, 'user', { sidecarPath, onSidecarError })`。
   - permissions/env 仍只在 settings 文件存在时扫描, 避免从不存在文件派生其它资产。
   - 对应 ANALYSIS 验收标准 2, 5, 6。
2. `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
   - 删除 `<HookRecoveryCenter />` 和所有恢复中心子组件。
   - 删除恢复中心专用 imports (`useCallback` 若只剩恢复中心使用、`RotateCcw`, `Trash2`, recovery types 等)。
   - 保留 `HookAssetRow` 行内启停逻辑。Claude disabled sidecar asset 继续显示 Disabled tag 和 Enable 按钮。
   - 对应 ANALYSIS 验收标准 1, 2, 3, 4。
3. IPC / preload / shared types
   - 从 `src/shared/types/ipc.ts` 删除恢复中心类型与 channel。
   - 从 `src/preload/index.ts` / `index.d.ts` 删除 `recoveries` 和 `clearRecovery`。
   - 从 `src/main/ipc/handlers.ts` 删除 `hooks:recoveries` 和 `hooks:clear-recovery` handler。
   - 从 `src/main/engine/hooks-manager.ts` 删除恢复中心枚举/清理函数和只服务它们的 helper; 保留 disable/restore 所需 sidecar 读写函数。
   - 对应 ANALYSIS 验收标准 1, 7。
4. Tests / i18n
   - `tests/unit/claude-scanner.test.ts`: 增加 settings 缺失但 sidecar 存在时仍生成 disabled Hook asset 的测试。
   - `tests/unit/hooks-manager.test.ts`: 删除 `getHookRecoveries` / `clearHookRecovery` 专用测试; 保留 disable/restore sidecar 行为测试。
   - `tests/renderer/hooks-lifecycle-view.test.tsx`: 删除恢复中心测试; 增加不渲染 `hook-recovery-center` 且不调用 recovery IPC 的断言; 增加 disabled Claude Hook 行内恢复断言或收紧现有断言。
   - `tests/setup.ts`: 删除恢复中心 API mock。
   - `src/renderer/src/i18n/locales/{zh,en}.json`: 删除 `capabilities.hooks.recovery.*` 文案, 保留行内启停文案。
   - 对应 ANALYSIS 验收标准 1, 2, 3, 4, 5, 7, 8。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 左侧 rail 保留 lifecycle index 与 Hook 检查, 删除恢复中心折叠块; 不新增说明卡片。 | Renderer 测试断言 sidebar 内不存在 `hook-recovery-center`; 手动或截图确认左侧工具区更短。 |
| 组件选择 / 设计系统一致性 | 继续复用现有行内 button、status tag、raw JSON details; 不引入新组件。 | 代码审查 + renderer 测试。 |
| 交互反馈 / 状态切换 | Claude 与 Codex 都走行内 enable/disable 按钮; busy 时禁用按钮; 错误仍显示在当前 Hook 行。 | Renderer 测试模拟 `setHookEnabled` 成功/失败。 |
| loading / empty / error / disabled / focus | 删除 recovery loading skeleton; disabled Hook 行保留 Disabled tag; read-only/managed 仍显示不可用原因; sidecar parse error 走 Hook 检查。 | Renderer 测试 + `useHealthChecks` 既有覆盖; target test 不出现 recovery loading aria label。 |
| 响应式 / 可访问性 / 键盘可达 | 行内按钮保持 button 语义和 flex wrap; 删除 details 后减少 Tab 停靠点。 | Renderer DOM 断言; 真实 UI 验证按钮可聚焦。 |
| 文案 / i18n / 数字和路径格式 | 删除恢复中心文案; 行内 Claude confirm 文案继续说明从恢复点写回 settings, 但不提“恢复中心”。 | i18n grep + typecheck。 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| settings 缺失但 Claude sidecar 存在时仍生成 disabled Hook asset | unit | `tests/unit/claude-scanner.test.ts` | `pnpm vitest run tests/unit/claude-scanner.test.ts` |  |
| 删除恢复中心 UI, 不调用 `hooks.recoveries` | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| Claude disabled Hook 在右侧行内恢复 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| Codex `native-state` 行内启停不退化 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| 删除恢复中心 IPC/preload/types 后类型仍一致 | typecheck | `src/shared/types/ipc.ts`, `src/preload/*`, `src/main/ipc/handlers.ts` | `pnpm typecheck:node && pnpm typecheck:web` |  |
| 当前任务文档合规 | harness | `docs/works/2026-06-04-gh-104-inline-claude-hook-restore` | `pnpm harness:check --work docs/works/2026-06-04-gh-104-inline-claude-hook-restore` |  |
| 真实 UI 左侧恢复中心消失、行内恢复可见 | manual | Electron app | `pnpm dev:agent` + 实测/截图 | 自动化覆盖主要 DOM 与调用; 真实窗口用于密度和可用性确认。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 删除恢复中心 UI 与 recovery IPC/preload/type surface | 1, 7 |
| user sidecar 独立于 settings 文件参与 Hook 扫描 | 2, 5, 6 |
| 保留 `hooks:set-hook-enabled` 作为唯一行内恢复路径 | 2, 3, 4 |
| 更新测试与 i18n | 1, 2, 3, 4, 5, 7, 8 |
