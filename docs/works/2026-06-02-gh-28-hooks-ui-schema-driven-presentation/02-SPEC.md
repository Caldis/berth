# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不新增 IPC, 复用 `agent-plugins:list` 返回的 `AgentCapabilityPlugin.hookSchema`。

Renderer 侧增加一个轻量 view model:

```ts
type HookSchemaMap = Partial<Record<'claude-code' | 'codex', AgentCapabilityPluginHookSchemaDescriptor>>

interface HookLifecycleOptions {
  hookSchemas?: HookSchemaMap
}
```

使用规则:

- `groupHookAssetsByStage(assets, view, { hookSchemas })` 优先按 `hookSchema.events[].stageId` 归类 event。缺 schema 或 event 未声明时, 回退到当前静态 `stageByEvent`。
- `getVisibleStageSupport(stage, view, { hookSchemas })` 优先按 schema 生成当前 stage 的 agent support、event 列表和 support 状态。缺 schema 时回退到当前静态 `stage.supports`。
- Hook 行展示新增 schema-aware helper, 优先使用 handler descriptor:
  - `primaryFieldNames` 决定主字段。
  - `fields` 决定可见配置摘要。
  - `runMode` / `supportNoteKey` 生成一个短状态 tag 或提示。
  - 未知字段按原字段名显示; 已知字段继续走 `capabilities.hooks.config.*`。
  - 缺 schema 时回退到当前 `hookDisplayDetails()` 行为。

不改:

- parser 产出的 `Asset.meta` 字段。
- `hooks-manager.ts` 写入和恢复逻辑。
- health engine 运行时检查。
- preload / shared IPC 契约。

## 模块结构 / 组件拆分

- `src/renderer/src/pages/capabilities.tsx`
  - 调用 `useAgentCapabilityPlugins()`。
  - 将插件列表传给 `HooksLifecycleView`。
  - 插件加载失败时不阻断 Hooks 页面, 只让 Hooks 使用 fallback。

- `src/renderer/src/lib/hook-lifecycle.ts`
  - 新增 schema map 类型、schema 查找 helper、schema-aware support/event/grouping 函数。
  - 保留现有 stage 顺序、title、summary、behavior、recommendation、risk 和 management action。
  - 增加纯函数测试, 覆盖 schema event、fallback 和 unknown event。

- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - props 增加 `plugins?: AgentCapabilityPlugin[]`。
  - `groups` 和 support tooltip 读取 schema-aware lifecycle helper。
  - `HookAssetRow` 读取对应 agent 的 handler schema。
  - 行级展示补 `runMode` tag; `parsed-only` 不视为错误。
  - raw JSON、copy、toggle、recovery、health hover、action menu 不改行为。

- `src/renderer/src/i18n/locales/en.json` / `zh.json`
  - 只补本轮 UI 新增的短文案: runMode label、required fields label。
  - 不补全所有 `settings.agentPluginHookEvents.*` / `settings.agentPluginHookHandlers.*` 长文案, 避免扩大范围。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 | 保留左侧 sticky lifecycle + 右侧阶段列表, 不新增外层卡片 | renderer 测试和桌面实测 |
| 信息密度 | Hook 行仍默认展示高频字段; `parsed-only` 作为短 tag, 不挤占主字段 | renderer 测试断言主字段和 tag |
| 组件一致性 | 继续使用现有 outline/tag/details/button 样式 | 视觉检查 |
| 颜色 | 黑白灰为主; `parsed-only` 使用轻 warning 或 muted 样式, 不新增强色 | 视觉检查 |
| 交互反馈 | raw JSON details、copy、action menu、toggle button 行为不变 | renderer 测试 |
| loading / error | plugin schema 加载失败时 fallback, Hooks 不空白 | renderer/page 测试 |
| empty / disabled | 空 stage、不可切换 hook、managed hook 行为不变 | 现有测试 |
| focus / 键盘 | raw JSON、copy、action menu、toggle 保持 button/details 可达 | renderer 测试 + 实测 |
| 响应式 | 长 command/url/prompt 使用现有 break/truncate 规则, 不横向撑开 | 窄窗口截图 |
| 文案/i18n | 新增 runMode/required fields 短文案, 旧 native event 文案 fallback | i18n + renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| schema event 归类 lifecycle stage | unit | `tests/unit/hook-lifecycle.test.ts` | `pnpm vitest run tests/unit/hook-lifecycle.test.ts` | 不适用 |
| schema 缺失或 event 未声明 fallback | unit | `tests/unit/hook-lifecycle.test.ts` | 同上 | 不适用 |
| handler primary fields / runMode / fallback | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` | 不适用 |
| raw JSON、toggle、recovery、health hover 行为不变 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 | 不适用 |
| Capabilities 页面把 plugin schema 传入 Hooks | renderer | `tests/renderer/capabilities-guidance.test.tsx` 或新增专用测试 | `pnpm vitest run tests/renderer/capabilities-guidance.test.tsx` | 不适用 |
| 类型与任务态 | typecheck/harness | 全仓 / 当前 work | `pnpm typecheck`; `pnpm harness:check --work docs/works/2026-06-02-gh-28-hooks-ui-schema-driven-presentation` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Capabilities 读取并传入 plugin schema | 1 |
| schema-aware lifecycle grouping/support | 2, 7 |
| handler primary fields | 3, 7 |
| runMode / parsed-only 展示 | 4 |
| raw JSON 不变 | 5, 6 |
| toggle/recovery/health 不变 | 6 |
| 测试与 harness | 7, 8 |
