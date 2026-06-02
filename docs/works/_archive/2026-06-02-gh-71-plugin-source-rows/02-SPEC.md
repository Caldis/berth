# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

沿用现有 `AgentCapabilityPluginSourceCoverage.sources`:

- `path`: 实际扫描路径; 缺失时退回 `pathPattern`。
- `scope`: user / project / enterprise / session。
- `status`: scanned / missing / not-scanned。
- `kind`: file / directory, 可为空。
- `categories`: instruction / capability / state / observability / integration。
- `declared`: 是否匹配插件 source descriptor。
- `labelKey` / `descriptionKey`: 已声明来源的本地化标题和说明。
- `pathPattern`: 插件声明的路径模式。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- 修改 `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`。
- 在同文件内扩展 `SourceCoverageDetails`, 增加紧凑的 source row 子组件, 避免跨文件抽象。
- 修改 `src/renderer/src/i18n/locales/en.json` 和 `zh.json` 补齐文案。
- 更新 `tests/renderer/settings-agent-plugins.test.tsx` 覆盖 expanded sources。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | collapsed 仍只展示总数; expanded Sources 用紧凑列表列出来源行。 | renderer test 确认 collapsed 不出现路径, expanded 出现路径。 |
| 组件选择 / 设计系统一致性 | 沿用 Badge、border、divide-y、muted 文案; 不新增弹窗或嵌套卡片。 | 代码审查 + 截图检查。 |
| 交互反馈 / 状态切换 | 仍由插件行按钮控制展开; source row 不新增交互按钮。 | renderer test 点击展开。 |
| loading / empty / error / disabled / focus | sources 为空时展示紧凑空态; 其他状态沿用现有 Settings。 | renderer test 覆盖空态。 |
| 响应式 / 可访问性 / 键盘可达 | 行内布局使用 flex wrap/min-w-0, 长路径 truncate 并保留 title。 | renderer test + 类型检查。 |
| 文案 / i18n / 数字和路径格式 | 补中英文 kind/declared/pathPattern/noSources 文案; path 保持 monospace。 | i18n key 在测试中可见。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| expanded Sources 列出具体来源行 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` |  |
| sources 为空时有紧凑空态 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` |  |
| 类型与 harness | typecheck / harness |  | `pnpm typecheck:web`; `pnpm harness:check` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 展开 Sources 列出 source row | 1, 2 |
| 空态与折叠低噪声 | 3, 4 |
| i18n 和长路径 | 5 |
