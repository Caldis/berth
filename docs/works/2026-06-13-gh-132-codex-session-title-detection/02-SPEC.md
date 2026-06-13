# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增 Codex title index 读取:
  - 路径: 每个 Codex home 的 `session_index.jsonl`。
  - 输入字段: JSONL 每行的 `id` 与 `thread_name`; 兼容 `threadName/name/title` 作为弱兜底。
  - 输出: `Map<sessionId, title>`。
  - 解析失败策略: 单行 JSON 损坏跳过; 文件缺失或无法读取返回空 Map。
- `parseCodexSessionMeta(filePath, options?)` 接受可选 `titleIndex`:
  - 先按现有逻辑从 rollout JSONL 读取 `thread_name_updated`。
  - 结束时优先使用 `titleIndex.get(sessionId)`; 没有索引值时保留 rollout 内标题; 都没有时保留 `Codex Session <id>`。
  - 标题归一化: trim、折叠空白、限制最大长度, 避免 `session_index.jsonl` 异常长值破坏列表。
- `CodexAdapter.scanSessions()` 按 Codex home 读取一次 title index, active 与 archived session 都传入同一 index。
- source coverage:
  - 新增 `codex.user.session-index` 表示 `~/.codex/session_index.jsonl`。
  - asset descriptor 的 session sourceCodes 增加该 code, 因为标题属于 session state 的辅助元数据。
  - 本任务不新增 IPC 字段, `SessionSummary.title` 不变。

## 任务分类与 debt
- type / maintenance.subtype: bug; maintenance 不适用。
- source.kind / refs: user-request; GH-132; primary-source 参考 openai/codex #10462、#16405。
- debt.estimate: net 3, scope cross-process, risk medium, areas ui-ux/testability。
- debt.final 预期: 若实现和测试局限在 adapter/source descriptor, final 维持 net 3。
- revisions: design 已从 net 2 调整到 net 3。
- Project 字段同步: design 后运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-13-gh-132-codex-session-title-detection`。

## 模块结构 / 组件拆分
- `packages/berth-scan-engine/src/adapters/codex/parsers.ts`
  - 新增 `readCodexSessionTitleIndex(codexDir: string): Map<string, string>`。
  - 扩展 `parseCodexSessionMeta()` 参数, 只影响 Codex session asset 的 `name/meta.title`。
- `packages/berth-scan-engine/src/adapters/codex/index.ts`
  - `scanSourceCoverage()` 纳入 `session_index.jsonl`。
  - `scanSessions()` 从 per-Codex-home session dir 组装, 传入对应 titleIndex。
- `packages/berth-scan-engine/src/adapters/codex/descriptors.ts`
  - 新增 source descriptor。
- `packages/berth-scan-engine/src/shared/types/asset.ts`
  - `BuiltInScanSourceCode` 增加 `codex.user.session-index`。
- `src/main/agent-plugins/registry.ts`
  - Codex session asset descriptor sourceCodes 加上 session index。
- `src/renderer/src/components/layout/local-source-copy.ts`
  - 补 source label/description, 避免设置页出现 raw key。

## 界面质量与交互验收
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 Sessions row 布局, 只修正 `title` 数据 | parser/adapter 测试证明数据源修复 |
| 组件选择 / 设计系统一致性 | 不新增组件 | 代码评审确认无 renderer 结构改动 |
| 交互反馈 / 状态切换 | SWR 和刷新状态不变 | `useSessions` 不改; 目标测试只覆盖 main 数据 |
| loading / empty / error / disabled / focus | 不改 UI 状态 | 既有 renderer tests 继续通过 |
| 响应式 / 可访问性 / 键盘可达 | 标题仍进入原 row 文本节点, 搜索仍按 `SessionSummary.title` | sessions page/search 既有契约保持 |
| 文案 / i18n / 数字和路径格式 | 新增 source copy: `Codex session index`; title 值 trim/折叠空白/截断 | source copy 代码检查; parser 单测覆盖异常长标题 |

## 测试策略
每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Codex parser 读取 `session_index.jsonl` 并按 id 给 session title 兜底 | unit | `tests/unit/codex-session-parser.test.ts` | `pnpm test -- tests/unit/codex-session-parser.test.ts` | 不适用 |
| Codex adapter active/archived session 复用同一 title index | unit | `tests/unit/codex-adapter.test.ts` | `pnpm test -- tests/unit/codex-adapter.test.ts` | 不适用 |
| source descriptor/source coverage 同步 | unit | `tests/unit/agent-capability-plugins.test.ts`, 可能涉及 `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm test -- tests/unit/agent-capability-plugins.test.ts tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| 类型和 harness 结构 | typecheck/harness | 全仓 | `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-13-gh-132-codex-session-title-detection` | 不适用 |
| 真实截图对应问题 | manual/local sample | 本机 `C:\Users\mail\.codex\session_index.jsonl` 只读样本 | 用 parser/adapter 测试 fixture 复刻, 不直接写真实 Codex 数据 | 真实 UI 截图可在 verify 阶段按用户确认或 Electron 实测补做 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| title index 读取与 `parseCodexSessionMeta` 兜底 | 1, 2, 3, 4 |
| source coverage/descriptor/copy 同步 | 7 |
| renderer 不特判, 保持 `SessionSummary.title` | 5, 6 |
| 标题归一化与截断 | 5 |
