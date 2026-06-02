# 需求分析 (Explore 产物)

## 现状理解
- 任务只改渲染层首页。现有数据链路为 `AppLayout -> useAssets()` 扫描资产, `Overview -> useSessions({ limit: 5, agentView, projectPath })`, `Overview -> useUsageSummary(7, agentView, projectPath)`, `Overview -> useHealthChecks()`。
- 资产、会话、用量、健康检查都通过 preload API 进入 renderer, 不需要新增 IPC 契约。`src/shared/types/ipc.ts` 与 `src/shared/types/asset.ts` 当前类型足够覆盖首页显示。
- 当前首页结构是 `h1 + 4 个 StatCard + 最近会话 / 近 7 天费用双列 + 健康检查整块列表`。它有数据能力, 但不清楚地回答当前 agent 视角、项目范围、健康状态、最近活动和待处理事项。
- 当前健康检查列表保留了重要动作: 信息项忽略、修复片段复制、证据链接打开、按 route/path/asset 跳转。重设计不能丢掉这些动作。

## 关联与依赖
- 首页依赖全局 app store:
  - `agentView`: 影响资产统计、最近会话和用量汇总。
  - `scopeSelection`: 经 `projectPathForScope()` 传入最近会话和用量汇总。
  - `stats/assets`: agent 视角过滤后生成能力入口计数。
- 首页相关测试已有两组:
  - `tests/renderer/overview-health-checks.test.tsx`: 健康检查分组、i18n、费用来源 badge。
  - `tests/renderer/sessions-pages.test.tsx`: 最近会话字段、项目范围传参、用量页面共享行为。
- e2e 当前只检查默认页存在 `h1`, 不足以覆盖 GH-82 的首页信息结构。
- 新 app shell 已经把 Instructions / Capabilities 细分到一级侧栏, 首页入口应该跳到新路径, 避免继续依赖 `/configuration/*` 旧路径重定向。

## 任务分类与 debt 校准
- type / maintenance.subtype: `feature`, 无 maintenance subtype。
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-FEATURE-overview-redesign.md`。
- debt estimate 修正: 初始 `incurred=5, repaid=0, net=5` 保持不变。
- scope / risk / areas / confidence: scope 仍是 `cross-process`, 因为首页读取 renderer store、IPC hook 结果和多页面路由; risk 保持 `high`; areas 保持 `architecture/testability/ui-ux`; confidence 从 `low` 调整为 `medium`。
- revision: Explore 已确认无需新增主进程或 IPC, 但影响首页布局、i18n、renderer 测试和 e2e, 仍需较完整验证。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 首页首屏必须直接展示当前 agent 视角与项目范围, 并能看出这些范围会影响会话与用量数据。
2. 首页必须展示健康检查总体状态: 正常、加载中、刷新中、警告、错误都要有清楚状态; 有问题时优先展示待处理项, 正常时也要有明确说明。
3. 健康检查动作不得退化: route/path 跳转、证据链接、复制修复片段、忽略 info 项都必须继续可用。
4. 首页必须展示最近会话, 可见字段包含标题、时间、项目路径、费用、token; 空态和加载态不能只显示裸文本。
5. 首页必须展示近 7 天用量/费用摘要, 费用来源必须继续用本地化 badge 说明, 未知费用不能显示为 `$0.00` 或原始 enum。
6. 能力入口必须指向新的一级路由, 至少覆盖 Skills、MCP、Sessions、Plugins, 不再依赖旧 `/configuration/*` 入口。
7. 视觉上应接近新的黑白 app shell: 少解释文本、层级清楚、卡片不过度堆叠、信息密度适合桌面入口页。
8. 响应式和可访问性要覆盖: 大屏可形成工作台布局, 小屏单列; 可点击区域有按钮语义或键盘路径; 操作按钮有可访问名称。
9. 自动化测试要覆盖主要字段、范围传参、健康检查动作、新路由入口、加载/空/未知费用状态; e2e 至少验证首页核心区域真实出现。

## 界面质量与交互验收
- 现有页面结构: 首页是多个圆角卡片平铺, 健康检查列表很长时会压过最近活动; 标题区域没有传达当前 agent / project 范围。
- 设计系统用法: 使用 Tailwind token、lucide-react、`EmptyState`、`TokenUsageDisplay`、`CostSourceBadge`、Recharts。没有 shadcn `components/ui` 目录, 需要继续用现有共享组件和本地小组件。
- 信息密度: 4 个 stat card 与双列卡片都偏平均, 缺少主次。首页应让健康状态和最近活动更靠前, 能力入口作为侧向入口。
- 主要用户路径:
  - 看当前范围和系统健康。
  - 打开最近会话。
  - 进入 Skills / MCP / Sessions / Plugins。
  - 处理或忽略健康检查。
  - 查看费用来源和近 7 天趋势。
- 可见状态:
  - sessions loading/empty/non-empty。
  - usage empty/non-empty/unknown cost。
  - health loading/stale/empty/info/warning/error。
- 风险:
  - 健康检查长列表可能撑大首屏, 需要限制首页只展示优先项, 同时保留细节。
  - 旧测试依赖具体文案和旧路径, 需要同步更新。
  - 图表和列表在窄宽度下可能挤压, 需要稳定网格和 `min-w-0`。

## 未决问题
- 无需向用户澄清。PRD 已明确要完整重构首页, 且现有数据契约足够支撑第一版。
