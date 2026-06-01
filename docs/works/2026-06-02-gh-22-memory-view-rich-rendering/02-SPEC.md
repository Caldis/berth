# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- `MemoryNote.links` 继续使用 string array。
- `united-memory` 解析时新增正文双链提取, 输出仍写入 `links`, 不新增 IPC 字段。
- 双链格式只处理 `[[target]]`, target 去掉两端空白; 空字符串忽略; 与 frontmatter links 去重。

## 模块结构 / 组件拆分

- 新增 renderer 私有组件 `MarkdownBody`, 放在 `memory-view.tsx` 内部, 使用 `react-markdown` 和 `remark-gfm`。
- 新增纯函数 `linkifyWikiLinks(text)` 或等价逻辑, 把 `[[target]]` 预处理成 markdown 链接 `berth-memory://target`。
- `MarkdownBody` 覆盖 `a` 组件: 遇到 `berth-memory://target` 渲染为 button 并调用 `onNavigate(globalId)`; 普通链接保留 `<a>` 并设置安全属性。
- `MemoryView` 增加 `importanceFilter` 和 `tagFilter` 状态, 与 source/search 组合过滤。
- `SourceFilter` 扩展或新增 `FilterChips` 组件, 用一致 chip 样式展示 All/importance/tag。
- `src/main/memory/sources/united-memory.ts` 增加正文双链解析并测试。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持搜索一行; filter chip 使用两组紧凑按钮, 不新增说明卡 | renderer test + 代码检查 |
| 组件选择 / 设计系统一致性 | 复用现有 button/chip 样式; markdown 使用中性色排版 | renderer test |
| 交互反馈 / 状态切换 | filter button 使用 `aria-pressed`; 双链使用现有 navigate 高亮 | renderer test |
| loading / empty / error / disabled / focus | 不改 loading/error; filter 后无结果复用 EmptyState 和 Clear filters | renderer test |
| 响应式 / 可访问性 / 键盘可达 | chip/button 可键盘操作; table overflow-x; link button 有明确文本 | renderer test |
| 文案 / i18n / 数字和路径格式 | 新增最少 fallback 文案: Importance, Tags, All, Clear filters | renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| markdown 渲染和正文双链点击 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` |  |
| importance/tag 过滤组合与清空 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` |  |
| united-memory 正文双链提取 | unit | `tests/unit/memory-service.test.ts` | `pnpm test -- tests/unit/memory-service.test.ts` |  |
| 新依赖和类型 | typecheck | n/a | `pnpm typecheck:web`; `pnpm typecheck:node` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| MarkdownBody + GFM | 1, 2, 7 |
| united-memory 双链提取 | 3 |
| importance/tag filter | 4, 5, 6 |
| UI chip 与可访问性 | 4, 5, 6 |
