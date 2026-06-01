# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

在 `src/shared/types/ipc.ts` 增加:

```ts
export type HookRecoveryStatus = 'recoverable' | 'source-missing' | 'already-restored' | 'invalid'

export interface HookRecoveryPoint {
  hookKey: string
  agentId: 'claude-code'
  agentName: string
  sourcePath: string
  scope: 'user'
  event: string
  matcher?: string
  hookType: string
  command?: string
  summary: string
  createdAt?: string
  status: HookRecoveryStatus
  message?: string
}

export interface HookRecoveryIssue {
  agentId: HooksAgentId
  sourcePath: string
  severity: 'warning' | 'error'
  message: string
}

export interface HookRecoveryListResult {
  points: HookRecoveryPoint[]
  issues: HookRecoveryIssue[]
}

export interface ClearHookRecoveryRequest {
  agentId: 'claude-code'
  hookKey: string
  sourcePath: string
}

export interface ClearHookRecoveryResult {
  hookKey: string
  sourcePath: string
  changed: boolean
}
```

IPC:

- `hooks:recoveries`: 无参, 返回 `HookRecoveryListResult`。
- `hooks:clear-recovery`: 入参 `ClearHookRecoveryRequest`, 返回 `ClearHookRecoveryResult`。

## 模块结构 / 组件拆分

- `src/main/engine/hooks-manager.ts`
  - 增加 `getHookRecoveries(homeDir = os.homedir())`。
  - 增加 `clearHookRecovery(request, homeDir = os.homedir())`。
  - 复用 sidecar 解析、稳定 hash、`hasClaudeHook`、写前比较函数。
  - 列表只读取 Claude sidecar。Codex 没有 sidecar 时返回空集合。
- `src/main/ipc/handlers.ts`
  - 注册 `hooks:recoveries` 和 `hooks:clear-recovery`。
  - 清理成功后触发 asset rescan/search rebuild。
- `src/preload/index.ts` / `src/preload/index.d.ts`
  - 暴露 `window.api.hooks.recoveries()` 和 `window.api.hooks.clearRecovery(request)`。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - 增加 `HookRecoveryCenter` 组件。
  - 默认折叠, 摘要显示恢复点数和 issue 数。
  - 展开后按 source path + event 排序展示。
  - “恢复”复用 `window.api.hooks.setHookEnabled({ enabled: true })`。
  - “清理”调用新 IPC, 只删 sidecar entry。
  - “打开”调用已有 `window.api.shell.openPath(sourcePath)`。
- `src/renderer/src/i18n/locales/{zh,en}.json`
  - 增加恢复中心文案和状态解释。
- `tests/setup.ts`
  - 增加默认 API mock。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 恢复中心作为 Hooks 页顶部/生命周期侧栏附近的折叠式工具区, 默认一行摘要; 展开后用紧凑列表展示恢复点。 | Renderer 测试检查摘要、展开列表; 手动截图检查页面不被恢复中心吞掉。 |
| 组件选择 / 设计系统一致性 | 使用现有按钮、tag、details 风格, 不新增重型卡片。状态 tag 采用低饱和边框。 | 代码审查 + 截图。 |
| 交互反馈 / 状态切换 | restore/clear 按钮有 busy 状态; 操作后刷新恢复点和资产列表; IPC 错误内联显示。 | Renderer 测试模拟 API 成功/失败。 |
| loading / empty / error / disabled / focus | loading 骨架; empty 短文案; error 保留旧数据; source-missing 禁用恢复; button 保留 focus outline。 | Renderer 测试 + 手动键盘检查。 |
| 响应式 / 可访问性 / 键盘可达 | 窄屏列表垂直堆叠, 按钮换行; `aria-expanded`/`aria-label` 使用本地化文案。 | Renderer DOM 断言 + 手动截图。 |
| 文案 / i18n / 数字和路径格式 | 中文短句, 英文对应; path 保持 monospace 和 title; 时间用本地格式。 | i18n key 检查 + screenshot。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 恢复点枚举: recoverable/already-restored/source-missing/invalid | unit | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |  |
| 清理只改 sidecar, 不改 source settings | unit | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |  |
| IPC/preload 类型接入 | typecheck | `src/shared/types/ipc.ts`, `src/preload/*` | `pnpm typecheck:node && pnpm typecheck:web` |  |
| UI 展示、restore/clear 调用和刷新 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 真实页面视觉与交互 | manual | Electron app | `pnpm dev:agent` + Electron 截图 | 需要真实窗口确认密度和 sticky 布局。 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新增恢复点 IPC 和主进程列表/清理能力 | 1, 2, 4, 5, 6, 8 |
| 恢复复用现有单 hook restore | 3 |
| Hooks 页恢复中心 UI | 1, 2, 5, 7 |
| Renderer 和 unit 测试 | 8 |
| Electron 截图和可用性验证 | 7 |

