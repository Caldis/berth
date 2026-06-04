# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
无。纯 renderer 展示层, 不动 main / IPC / store / i18n key。

## 任务分类与 debt
- type / maintenance.subtype: bug / —
- source.kind / refs: user-request / GH-101
- debt.estimate: incurred 2, repaid 1, net 1, scope module, risk medium, areas [ui-ux], confidence medium
- debt.final 预期: 与 estimate 接近; repaid 体现于删除 capabilities 本地重复实现
- revisions: explore 已追加 (risk low→medium)
- Project 字段同步: ensure 已绑定 item_id; archive 前 done 同步

## 模块结构 / 组件拆分

### S1. 共享组件 `components/shared/empty-state.tsx` (验收 1/2/3)
1. 新增导出复用常量:
   ```ts
   export const PAGE_EMPTY_FILL =
     'min-h-[calc(100dvh-var(--berth-page-top-offset)-var(--berth-page-gutter))]'
   ```
   语义: 页面根 wrapper 的"内容区可视高度"。变量惰性求值, 在使用节点 (main 后代) 解析。
2. `EmptyStateProps` 新增 `fullHeight?: boolean` (默认 false)。
3. 容器 className 调整 (用 cn):
   - 基础不变: `flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center`
   - `fullHeight` 时追加: `h-full w-full flex-1` (在 flex 列父中 flex-1 撑满剩余; h-full 兜底; 内部 justify-center 保证占位图垂直水平居中)
4. 占位图 / heading / description / action 结构与样式**不变** (保持堆叠卡片占位图 = 全站统一外观)。
5. 默认 (局部, B 类) 行为零变化 → overview / settings 不受影响 (验收 4)。

### S2. chrome-less 页 (验收 2/3): sessions / session-detail / memory-view
空态分支**外包**一层高度 wrapper, 仅作用于 empty 分支, 不动 loading / list 分支:
```tsx
<div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
  <EmptyState fullHeight ... />
</div>
```
- sessions.tsx:184、session-detail.tsx:115、memory-view.tsx:735。
- 非空分支 (含 `min-h-[520px]` 列表) 保持原样。

### S3. in-flow-chrome 页 (验收 2/3): instructions / capabilities
页面根由 `space-y-4` 改为 `cn('flex flex-col gap-4', PAGE_EMPTY_FILL)`:
- 工具条 (InstructionPageChrome / CapabilityPageChrome) 作为首个 flex child, 自然高度 (默认不收缩到 0: 内容撑开)。
- 内容分支:
  - 整页空态 → `fullHeight` (flex-1 撑满工具条下方)。
  - 列表 / section → 普通 flex child, 自然高度 (root min-h 兜底, 短内容下方留白无边框无感, 长内容正常滚动)。
- instructions.tsx: 根 wrapper 改造; renderContent 的两处空态 (465 动态 icon / 480 FileText) 加 `fullHeight`。memories tab (MemoryView, 无工具条) 作为 flex child 正常。
- capabilities.tsx:
  - **删除本地 `EmptyState` (62-69)**, 改 `import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'` (验收 1)。本地用法 `icon` + `message` 与共享 props 兼容。
  - 根 wrapper 改造。
  - 直接返回空态: mcp(869) / plugins(884) / default(902) 加 `fullHeight`。
  - **EnvSection**(env, 752): 空时 `return <EmptyState fullHeight icon={Variable} .../>` (EnvSection 输出即该空态 → 作为 root flex child flex-1 撑满)。
  - **PermissionsSection**(permissions): 同 EnvSection 处理 (implement 时读其结构, 空分支加 fullHeight; 若 section 有外层 wrapper, 给该 wrapper flex-1)。
  - **StatusLineSection**(statusLine, 573, 特殊 — 空态可伴随 `CodexDefaultStatusLine`): section 根 `space-y-3` → `flex flex-1 flex-col gap-3`; 空态加 `fullHeight`; 伴随卡片保持在其下。非空 (summary + cards) 在 flex 列自然堆叠, 视觉等价。

### S4. 不改动 (验收 4)
- app-layout.tsx / globals.css / overview.tsx / local-sources-section.tsx / agent-capability-plugins-section.tsx 不动。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 空态撑满内容区, 列表/loading 不变 | 截图: 空态填满, 非空列表密度不变 |
| 组件选择 / 设计系统一致性 | 全站收敛到单一共享 EmptyState (堆叠卡片占位图) | 代码: capabilities 无本地 EmptyState; 截图: 各页空态外观一致 |
| 交互反馈 / 状态切换 | 三态 (loading/empty/list) 切换不变 | 手动切换 tab/scope 触发空↔非空 |
| loading / empty / error / disabled / focus | 仅改 empty 布局 | 截图对比四张原图场景 |
| 响应式 / 可访问性 / 键盘可达 | flex 居中天然响应式; 占位图 aria-hidden 不变 | 窗口缩放截图; 占位图无障碍属性保持 |
| 文案 / i18n / 数字和路径格式 | 复用现有 i18n key, 不新增 | 代码核对无新增 key |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| EmptyState fullHeight 追加填满类, 默认不追加 | renderer | tests/renderer/empty-state.test.tsx (新增) | `pnpm test:renderer -- empty-state` | — |
| capabilities 空 tab 渲染共享空态 (堆叠卡片占位图, 非单图标) | renderer | tests/renderer/capabilities-empty-state.test.tsx (新增) 或并入现有 | `pnpm test:renderer -- capabilities` | — |
| 撑满高度 / 垂直居中视觉 | manual (electron 实测坐标截图) | — | 见 4.0-verify | jsdom 无真实布局尺寸, 高度撑满靠真实渲染验收 |
| B 类局部空态未变 | manual + 现有 overview/settings 测试 | 现有 | `pnpm test:renderer` | 回归既有测试覆盖 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| S1 (fullHeight + 占位图不变) | 1, 3 |
| S2 / S3 (接 flex 高度链) | 2, 3 |
| S3 capabilities 删本地 | 1 |
| S4 不改动 | 4 |
| 测试矩阵 + 截图 | 5 |
