# Implementation Plan

- [x] 扩展 `SessionSummary` 类型: 增加 `projectPath`、`transcriptPath`、nullable `startedAt/endedAt/duration/cost`, 并同步 preload/typecheck 受影响点。verify: `pnpm typecheck` 通过。
- [x] 重写 `parseSessionMeta()` 为逐行 JSONL 元数据扫描: 读取 `cwd`、`ai-title.aiTitle`、timestamp、`message.model`、`message.usage`、Skill tool_use、MCP tool_use、Stop hook summary、file-history-snapshot, 保持不保存正文。verify: `tests/unit/session-meta-parser.test.ts` 覆盖真实结构、详情关联字段和无 cost 字段。
- [x] 让 session id 稳定: 优先 JSONL `sessionId`, 其次文件名 stem, 避免 `Date.now()`。verify: 同一 fixture 重复 parse id 不变。
- [x] 在 IPC 层提取 `toSessionSummary()` 并复用到 `sessions:list` / `sessions:get`; 排序改为 `endedAt ?? startedAt ?? modifiedAt`; filter 覆盖真实路径; 详情页关联 Skill/MCP/Hook 由同一份 session meta 生成。verify: parser + renderer 详情测试覆盖输出契约。
- [x] 增加共享 UI formatter: optional date/duration/currency/model/path, 不输出 `Invalid Date`、误导性 `$0.00` 或 `0s`。verify: `tests/unit/utils.test.ts`。
- [x] 修 Overview Recent Sessions: 使用 loading, 取消 project 分组保持时间线, 展示真实路径、token、unknown cost。verify: `tests/renderer/sessions-pages.test.tsx`。
- [x] 修 Sessions 页面: project/date 分组安全展示, filter 支持真实路径, token/cost/model/duration 使用 formatter。verify: `tests/renderer/sessions-pages.test.tsx`。
- [x] 修 Session Detail: Project 显示真实路径, Started 文案 i18n, cost/duration/model/date 统一 formatter, skills/mcp/hooks 不再由 IPC 写死为空。verify: `tests/renderer/sessions-pages.test.tsx`。
- [x] 补 i18n: `common.unknown`、`sessions.started`、必要的 cost unknown 文案。verify: 中英文 key 对齐。
- [x] 跑门禁: `pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/parsers.test.ts tests/unit/utils.test.ts`, renderer 目标测试, `pnpm typecheck`, `pnpm harness:check`。补充: `pnpm test` 和 `pnpm build` 已通过。
