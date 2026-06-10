# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
无数据契约变化。仍使用 `nav-config.ts` 的 `NavSection` / `NavItem` 和 i18n key; 不改 IPC、asset model、store state 或路由定义。

## 任务分类与 debt
- type / maintenance.subtype: `bug`, 不适用 maintenance subtype。
- source.kind / refs: `user-request`, GH-87。
- debt.estimate: `incurred=2, repaid=0, net=2, scope=module, risk=low, areas=[ui-ux,testability], confidence=medium`。
- debt.final 预期: 若 renderer 测试、目标 e2e、视觉验收通过, 预期 `net=1, risk=low, confidence=high`。
- revisions: Explore 阶段已写入 `INDEX.md`。
- Project 字段同步: `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-87-navigation-title-duplication` 已完成。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/components/layout/top-navigation.tsx`: 将 breadcrumb 计算从“分组 + 当前页”调整为“上层位置上下文”。当前页面 label 不在顶部栏重复显示。
- `src/renderer/src/components/layout/nav-config.ts`: 不改路由与左侧导航数据。必要时只复用现有 `findNavMatch`。
- 页面组件: 不改 `Overview` / `Sessions` / `Instructions` / `Capabilities` / `Usage` 的 `h1`, 保留语义标题与屏幕阅读器主标题。
- 测试: 更新 `tests/renderer/top-navigation.test.tsx` 与 `tests/e2e/app.e2e.ts` 中的顶部栏断言。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 顶部栏只显示上层上下文; 内容区保留唯一当前页 `h1`。 | Desktop 界面截图 + breadcrumb 文本断言。 |
| 组件选择 / 设计系统一致性 | 继续使用现有 `header > nav`、Tailwind token、lucide 分隔图标; 不新增视觉组件。 | renderer 测试 + 视觉检查。 |
| 交互反馈 / 状态切换 | 不改 Sidebar 点击、active、hover、focus 与路由跳转。 | e2e 导航仍可切换页面。 |
| loading / empty / error / disabled / focus | 本次不触碰状态面; 顶部栏无 crumb 时不渲染空 `nav` landmark。 | renderer DOM 断言。 |
| 响应式 / 可访问性 / 键盘可达 | `h1` 保持可见; 顶部栏有 crumb 时保留 `aria-label`; 无 crumb 时只保留拖拽 header。 | Testing Library role 查询 + 视觉检查。 |
| 文案 / i18n / 数字和路径格式 | 复用现有 EN/ZH `nav.sections.*`、`nav.sessions`; 不新增翻译 key。 | EN/ZH renderer 测试。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 顶部栏不显示当前页 label, 只显示上层上下文 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm test -- tests/renderer/top-navigation.test.tsx` | 不适用 |
| App shell 导航仍可用, e2e 断言匹配新顶部栏 | e2e | `tests/e2e/app.e2e.ts` | `pnpm build && pnpm test:e2e -- tests/e2e/app.e2e.ts` | 不适用 |
| 视觉层级无重复标题 | manual / screenshot | 临时截图输出到系统临时目录 | `pnpm dev:agent start --id gh87-nav-title --debug-port 9337 --json`; CDP/截图检查 | 自动化截图像素判断不适合判定文案层级, 以 DOM 断言 + 截图记录为证据 |
| harness 任务态合规 | harness | `docs/works/2026-06-03-gh-87-navigation-title-duplication` | `pnpm harness:check --work docs/works/2026-06-03-gh-87-navigation-title-duplication` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 顶部栏仅显示上层位置上下文 | 1, 2, 3, 4 |
| 页面 `h1` 保留且不改文案 | 1, 2, 3 |
| renderer/e2e/i18n 测试更新 | 5 |
| 视觉层级检查 | 1, 2, 3, 4 |
