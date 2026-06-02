# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增 IPC channel, 继续使用:
  - `project-scope:candidates -> ProjectScopeCandidate[]`
  - `project-scope:activate -> ProjectScopeActivationResult`
  - `assets:scan-sources -> AgentScanSourceGroup[]`
- 新增 renderer-only helper, 从 `AgentScanSourceGroup[]` 派生项目来源:
  - `ProjectSourceSummary { total, scanned, notScanned, missing }`
  - `projectSourceSummaryFor(candidate, groups)`
  - `projectSourceGroupsFor(candidate, groups)`
- 匹配规则:
  - `scope === 'project'`: `source.path` 等于项目路径, 或在项目路径内。
  - `scope === 'session'`: 若后续来源带 `projectPath` 再纳入; 当前不强行匹配 user session root。
  - `project.current-candidate` / `project.session-derived-candidate` 作为项目来源候选展示, 状态依旧来自 scanner。
- 用户级 / 企业级来源不算进项目候选来源数, 避免误导“项目有这些文件”。全局用户来源仍由能力插件权限/来源描述展示。

## 任务分类与 debt
- type / maintenance.subtype: feature。
- source.kind / refs: docs-issues; `docs/issues/2026-06-02-IMPROVEMENT-local-sources-project-integration.md`。
- debt.estimate: `incurred=2, repaid=0, net=2, scope=module, risk=medium, areas=[ui-ux,testability], confidence=medium`。
- debt.final 预期: 若只改 renderer 并通过测试/截图, final 可降为 low risk。
- revisions: explore 阶段从初始 cross-process 估算修正为 renderer module。
- Project 字段同步: design 完成后运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-85-local-sources-project-integration` 同步 debt 字段。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/components/layout/project-scope-switcher.tsx`
  - 增加 `scanSourceGroups / sourceLoading / sourceError` 状态。
  - `loadCandidates()` 同时请求 project candidates 和 scan sources。
  - `ProjectOption` 增加来源摘要 tags, 例如 `2 sources`, `1 scanned`, `1 missing`。
  - 下拉底部新增 `SelectedProjectSources` 区块: 只在当前 scope 为 project 时显示项目来源明细。
  - 来源明细复用 `getScanSourceCopy()`、`getScanSourceStatusLabel()` 和状态计数逻辑。
- `src/renderer/src/components/settings/local-source-copy.ts`
  - 继续作为来源文案 helper。
  - 如需被 layout 组件引用, 保持导出路径不变; 不引入 Node API。
- `src/renderer/src/pages/settings.tsx`
  - 移除 `useScanSources` 和 `LocalSourcesSection`。
  - Settings 保留全局配置入口。
- `src/renderer/src/i18n/locales/{en,zh}.json`
  - 增加 projectScope 来源摘要、项目来源区标题、错误、空态。
  - Settings 里的 local source key 可保留给历史组件测试或后续复用, 但页面不再使用。
- `tests/renderer/project-scope-switcher.test.tsx`
  - 覆盖来源摘要、来源明细、错误态。
- `tests/renderer/settings-sources.test.tsx`
  - 改为测试 `ProjectScopeSwitcher` 或拆成 project source renderer 测试。
  - SettingsContent 测试改为确认不出现 `Local Sources`。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 项目候选仍是主列表; 来源摘要在候选行内用小 tag; 详细来源只显示当前项目, 放在分隔线下方。 | renderer 测试 + Electron 截图检查 dropdown 不超过窗口、路径不撑宽。 |
| 组件选择 / 设计系统一致性 | 继续用现有 button/listbox/dropdown 风格、lucide `Folder/AlertCircle/ExternalLink`; 不新增大卡片和强调色。 | 视觉检查确认与 sidebar footer、settings 风格一致。 |
| 交互反馈 / 状态切换 | 打开 dropdown 时并行加载项目和来源; 选项目后关闭, 重新打开能看到该项目来源。 | renderer 测试模拟 load/select/reopen。 |
| loading / empty / error / disabled / focus | 候选 loading 使用已有 spinner; 来源 loading 用一行小文本; 来源失败显示 error row, 不阻断项目选择; 无项目时显示选择提示。 | renderer 测试覆盖 empty/error。 |
| 响应式 / 可访问性 / 键盘可达 | `role=listbox/option` 继续只包项目选择; 来源区不嵌入 option。路径 truncate + title; Esc 关闭保持现有行为。 | renderer 测试 + 手动键盘检查。 |
| 文案 / i18n / 数字和路径格式 | 英文使用 `Project sources`; 中文使用 `项目来源`; 状态 tag 使用现有 scanned/missing 文案。 | i18n key 覆盖 + 页面截图。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| ProjectScopeSwitcher 加载并展示项目来源摘要 | renderer | `tests/renderer/project-scope-switcher.test.tsx` | `pnpm test tests/renderer/project-scope-switcher.test.tsx` |  |
| 当前项目来源明细展示状态、路径解释和打开动作 | renderer | `tests/renderer/project-scope-switcher.test.tsx` | `pnpm test tests/renderer/project-scope-switcher.test.tsx` |  |
| 来源加载失败不阻断项目选择 | renderer | `tests/renderer/project-scope-switcher.test.tsx` | `pnpm test tests/renderer/project-scope-switcher.test.tsx` |  |
| SettingsContent 不再展示 Local Sources | renderer | `tests/renderer/settings-sources.test.tsx` 或 `settings-page.test.tsx` | `pnpm test tests/renderer/settings-sources.test.tsx tests/renderer/settings-page.test.tsx` |  |
| i18n key 和类型检查 | type/unit | TS + renderer tests | `pnpm typecheck:web` |  |
| UI 视觉验收 | manual/electron | 临时截图 | `pnpm dev:agent start --id gh85-sources --debug-port <port>` + `pnpm dev:agent screenshot gh85-sources --mode print-window` | 自动断言不能完全证明视觉密度和长路径裁剪。 |
| harness 产物 | harness | 当前 work | `pnpm harness:check --work docs/works/2026-06-03-gh-85-local-sources-project-integration` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 复用 `assets:scan-sources` 和 renderer helper | 1, 6 |
| Project option 来源摘要 | 2, 7, 8 |
| SelectedProjectSources 明细区 | 3, 6, 7, 8, 9 |
| 未选项目提示与错误态 | 1, 4, 8 |
| Settings 移除 LocalSourcesSection | 5, 8 |
| i18n 和视觉验收 | 7, 9 |
