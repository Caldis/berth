# 技术方案 (Design 产物)

每条方案回指 `01-ANALYSIS.md` 的验收标准编号。

## 数据契约

保留 `SearchResult` 基础结构, 不新增 IPC channel:

```ts
interface SearchResult {
  id: string
  asset: Asset
  score: number
  matches: { field: string; snippet: string }[]
}
```

调整点:

- `src/preload/index.d.ts`: `assets.search` 从 `Promise<unknown[]>` 改为 `Promise<SearchResult[]>`。对应验收 1、9。
- `src/main/ipc/handlers.ts`: `assets:search` 改为 async, 先 `ensureScanned()`, 再确保搜索索引基于当前资产集合构建。对应验收 1、3。
- `src/main/engine/search.ts`: SearchDoc 扩展安全元数据字段, 包括 `agentId`、`summary`、`metadata`, 并为 session/hook/skill/MCP/command 等类型提取可搜索文本。对应验收 2、4。
- 搜索结果上限控制在 UI 可读范围内, 默认返回前 20 条。对应验收 4、7。

不把 `asset.raw` 加入索引。raw 全文搜索另开功能处理。

## 任务分类与 debt

- type: bug。
- source.kind / refs: `docs-issues` / `docs/issues/2026-06-02-BUG-global-search-usability.md`。
- debt.estimate: incurred 4 / repaid 0 / net 4 / cross-process / high / architecture,testability,ui-ux / medium。
- debt.final 预期: verify 后根据实际修改填写。若只修复搜索入口和元数据索引, final 仍应接近 net 4。
- revisions: `explore` 阶段已把 confidence 从 low 调为 medium。
- Project 字段同步: 保持 GH #81 的 Project item `In Progress`; archive 前再置 Done。

## 模块结构 / 组件拆分

### Main

`src/main/engine/search.ts`

- 增加 `SearchDoc` 字段:
  - `agentId`
  - `summary`
  - `metadata`
- 增加 `extractSearchMetadata(asset)` 私有 helper, 只读稳定、短文本和结构字段:
  - session: `project`, `projectPath`, `model`, `transcriptPath`, `skillsUsed`, `mcpServers`
  - hook: `event`, `matcher`, `type`, `command`, `sourcePath`
  - skill/agent/command/plugin/mcp-server: `description`, `summary`, `name`, `command`, `serverName`
  - 其他资产: 短字符串、字符串数组、浅层对象中的短文本
- 增加索引 freshness 标记, 记录当前资产签名或 id 集合。`buildIndex()` 后更新; `ensureIndexed(assets)` 仅在资产集合变化时重建。

`src/main/ipc/handlers.ts`

- `assets:search` 改成 async:
  1. `const scanner = await ensureScanned()`
  2. `const assets = scanner.getAllAssets()`
  3. `search.ensureIndexed(assets)`
  4. `return search.search(query, assets)`

### Preload

`src/preload/index.d.ts`

- 引入 `SearchResult` 类型并修正 `assets.search` 返回值。

### Renderer

`src/renderer/src/components/layout/search-dialog.tsx`

- 增加 query/results/loading/error/activeIndex 状态。
- 输入为空: 显示快捷入口。
- 输入非空: 防抖调用 `window.api.assets.search(query.trim())`。
- 结果列表:
  - row button, 固定紧凑高度, 不使用卡片嵌套。
  - 主行: title + type tag + agent tag。
  - 次行: scope/category/path 或匹配字段。
  - 长路径截断, 保留 tooltip/title。
- 键盘:
  - `ArrowDown/ArrowUp` 修改 activeIndex。
  - `Enter` 打开选中结果。
  - `Escape` 关闭仍保留。
  - `Tab` 继续在弹窗内循环。
- 结果导航:
  - session -> `/sessions/:id`
  - instruction/claude-md/agents-md/command/agent/skill -> `/configuration/instructions`
  - hook/mcp-server/permission/plugin/statusline/env -> `/configuration/capabilities`
  - usage-data/stats-cache -> `/usage`
  - 默认 -> `/`

`src/renderer/src/i18n/locales/{zh,en}.json`

- 增加 loading/error/result/field 标签。
- 复用已有 asset type 翻译, 缺失类型按原值显示。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持 command palette, 输入区 + 单列表; 非空查询不再显示快捷入口。 | renderer 测试 + Electron 截图。 |
| 组件选择 / 设计系统一致性 | 使用现有 `rounded-md`, `border-border`, `bg-popover`, `hover:bg-accent`, tag 用轻量边框。 | 视觉检查, 不新增重装饰。 |
| 交互反馈 / 状态切换 | active result 有背景和 `aria-selected`; click/Enter 都关闭弹窗并导航。 | renderer 键盘测试。 |
| loading / empty / error / disabled / focus | loading/empty/error 分别有短文案; 输入框打开后 focus; error 后保留输入。 | renderer 状态测试。 |
| 响应式 / 可访问性 / 键盘可达 | 弹窗宽度沿用 `max-w-lg`; 结果容器滚动; 每行 button 可聚焦; Tab trap 保留。 | renderer 测试 + 截图。 |
| 文案 / i18n / 数字和路径格式 | 文案短, 中英文齐全; 路径用原始字符串截断展示。 | i18n 测试。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 搜索引擎索引 session/hook/MCP/skill 元数据 | unit | `tests/unit/search.test.ts` | `pnpm test tests/unit/search.test.ts` |  |
| `assets:search` 类型契约 | typecheck | `src/preload/index.d.ts`, `src/shared/types/ipc.ts` | `pnpm typecheck` |  |
| 搜索弹窗调用 IPC 并显示结果 | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm test tests/renderer/search-dialog.test.tsx` |  |
| loading/empty/error 状态 | renderer | `tests/renderer/search-dialog.test.tsx` | 同上 |  |
| Arrow/Enter 键盘选择与导航 | renderer | `tests/renderer/search-dialog.test.tsx` | 同上 |  |
| command palette 视觉与可用性 | manual + screenshot | Electron dev app | CDP / 截图 | 自动化只能覆盖结构和交互, 视觉密度需要实测。 |
| harness 和 Project 状态 | harness | `docs/works/2026-06-03-gh-81-global-search-usability` | `pnpm harness:check --work ...` / `node scripts/harness-projects.mjs check --strict` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 数据契约与 async `assets:search` | 1, 3, 9 |
| 搜索元数据提取和索引 | 2, 4, 9 |
| 搜索弹窗 query/results 状态 | 1, 5, 7 |
| 结果行信息和导航 | 4, 8 |
| 键盘操作 | 6 |
| i18n 与视觉状态 | 5, 7 |
