# 需求分析 (Explore 产物)

## 现状理解
涉及的进程 / 模块 / IPC 契约 (参 docs/ARCHITECTURE.md)。

- `assets:scan-sources` 已存在, renderer 通过 `useScanSources()` 读取 `AgentScanSourceGroup[]`。数据来自 `AssetScanner.getScanSourceGroups()`。
- `AgentScanSourceGroup.sources` 已包含用户级、项目级、企业级、会话级来源; `ScanRoot` 有 `path / scope / code / categories / kind / status / reason`。
- `AssetScanner.withProjectSourceCandidates()` 已把当前项目和会话历史里的项目路径补成 `project.current-candidate` / `project.session-derived-candidate` 来源候选。
- `ProjectScopeSwitcher` 已读取 `project-scope:candidates` 并展示项目候选, 但只显示 `Current / Session / Source` 标签和会话数, 没有来源明细、状态、路径解释。
- `SettingsContent` 当前直接渲染 `LocalSourcesSection`, 所以“本地来源”主要藏在设置页, 与项目切换主路径割裂。
- `LocalSourcesSection` 已有可复用的来源分组、状态 tag、路径展示和打开 Explorer 行为。现有 tests 覆盖设置页来源展开和项目候选来源提示。

## 关联与依赖
调用关系、region/scope 差异、历史设计取舍。

- 主链路: `ProjectScopeSwitcher -> project-scope:candidates / project-scope:activate -> activateProjectScope() -> scanner/search/watcher`。
- 来源链路: `SettingsContent -> useScanSources() -> assets:scan-sources -> AssetScanner.getScanSourceGroups()`。
- 现有项目候选和来源候选已经共用 `ScanRoot` / `ProjectScopeCandidate`, 因此本任务优先迁移 renderer 展示, 不新增 IPC。
- 来源状态差异:
  - `scanned`: Berth 当前能读取该来源, 可以提供打开路径动作。
  - `not-scanned`: 来源来自会话历史等候选, 当前 project scanner 没读它。
  - `missing`: 当前项目已检查但未发现支持的来源, 或候选路径不存在。
- 项目范围和用户范围不同: 用户级 / 企业级来源对所有项目都有影响; 项目级 / 会话级来源需要按选中项目路径过滤或作为候选展示。
- 历史设计取舍: GH-77 已把项目范围入口放入 sidebar footer; GH-78 已让 project scanner 上溯项目配置。GH-85 应在这个入口内补来源可见性, 不再把设置页作为主要位置。

## 任务分类与 debt 校准
- type / maintenance.subtype: feature。
- source.kind / refs: docs-issues; `docs/issues/2026-06-02-IMPROVEMENT-local-sources-project-integration.md`。
- debt estimate 修正: 从 `incurred=4, net=4, scope=cross-process, risk=medium, confidence=low` 修正为 `incurred=2, net=2, scope=module, risk=medium, confidence=medium`。
- scope / risk / areas / confidence: 主要改 renderer project switcher、settings 和测试; 复用现有 `assets:scan-sources` 契约, 不改扫描器和 IPC 类型。
- revision: explore 阶段追加一次, 说明影响面收窄。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. 项目切换器打开后会同时加载项目候选和本地来源组; 加载失败时保留可用的项目候选并显示轻量错误提示。
2. 每个项目候选行能展示与该项目关联的来源数量和状态摘要, 不只显示抽象的 `Source` 标签。
3. 当前选中项目在项目切换器内有来源明细区, 能看到 agent、来源标题、状态、路径、路径解释和可打开动作。
4. 未选择项目时, 项目切换器不强行平铺所有来源; 只提示选择项目后查看项目来源, 避免 dropdown 变成设置页。
5. 设置页移除 `LocalSourcesSection`; 设置只保留外观、扫描开关、能力插件和关于等全局配置入口。
6. 现有来源复制、状态含义、路径打开逻辑保持一致; 不改变 `ScanRoot` / `AgentScanSourceGroup` 数据契约。
7. i18n 中英文齐全, 文案明确“项目来源 / 全局来源”的差异, 不用泛泛的“本地来源”作为唯一入口。
8. renderer 测试覆盖项目来源摘要、项目来源明细、设置页移除来源区、加载错误和空态。
9. 前端验收截图确认项目切换器下拉信息密度可控, 长路径不溢出, 旧设置页不再出现本地来源卡片。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险。

- 现有页面结构: sidebar footer 的 `ProjectScopeSwitcher` 是高频入口; SettingsContent 是全局设置页。
- 设计系统用法: 现有 UI 使用小圆角、1px border、muted 文案、lucide icon。应继续使用同一套密度, 避免新增大卡片。
- 信息密度: 下拉宽度当前 320px; 来源明细必须限制高度、truncate 路径、保留 title, 不把所有 agent 全部展开。
- 主要用户路径: 打开项目范围 -> 看项目候选 -> 选中项目 -> 在同一下拉看到项目来源状态 -> 必要时打开已扫描路径。
- 可见状态: loading、empty、error、selected project、scanned / not-scanned / missing 都要有可见提示。
- 交互反馈: 选择项目后关闭下拉; 下次打开能看到当前项目来源。来源路径的打开动作只对 scanned 来源显示。
- 响应式 / 可访问性风险: dropdown 是 `listbox`; 新增来源明细不能破坏 option 语义。按钮、错误提示和路径都要有可读标签或 title。

## 未决问题
无需用户澄清。实现采用保守方案: 不新增“项目详情页”, 先把来源整合进现有 Project Scope Switcher; 后续若需要更大的项目页, 作为新需求处理。
