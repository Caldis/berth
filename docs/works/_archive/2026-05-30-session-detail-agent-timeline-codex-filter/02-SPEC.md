# Design Spec

## 数据契约

覆盖 A2-A7。

1. `AgentView = "all" | "claude" | "codex"` 放在 shared asset types 中。
2. `SessionSummary` 增加 `agentId`。Claude Code 继续用现有 `claude-code`; Codex 用 `codex`。
3. `SessionDetailResult` 增加:
   - `toolTimeline: SessionToolEvent[]`
   - `artifacts: SessionArtifacts`
4. `SessionToolEvent` 只保存复盘所需摘要: id、name、category、status、startedAt、endedAt、summary、filePaths、mcpServer、mcpTool、skillName。避免把完整命令输出或消息正文塞进 IPC。
5. `SessionArtifacts` 包含 `plans`、`todos`、`files`、`checkpoints`; 旧字段 `plans/todos/fileHistoryCount` 保留, 由 artifacts 派生填充。

## 主进程结构

覆盖 A1、A2、A5、A6、A7。

1. `AssetScanner` 持有 `AgentAdapter[]`, 扫描时逐个 adapter 聚合结果和错误。
2. 新增 `CodexAdapter`:
   - root: `~/.codex`, session root: `~/.codex/sessions`
   - 只实现 state session 扫描, 其他分类返回空数组
   - 读取 `**/rollout-*.jsonl`
3. Claude parser 新增 `parseSessionDetail(filePath)`:
   - `assistant.message.content[].type === "tool_use"` 生成调用事件
   - `user.message.content[].type === "tool_result"` 回填状态
   - `file-history-snapshot` 生成 checkpoint
   - Task/Todo/Plan/File 类工具生成 artifact 摘要
4. Codex parser 新增 `parseCodexSessionMeta` 和 `parseCodexSessionDetail`:
   - 支持 `session_meta`、`turn_context`、`event_msg`、`response_item`
   - `function_call`、`custom_tool_call`、`tool_search_call`、`web_search_call` 生成时间线
   - `function_call_output`、`custom_tool_call_output` 等按 call id 回填状态
   - `patch_apply_end`、`exec_command_end`、`mcp_tool_call_end` 补充文件和状态信息
5. IPC `sessions:list` 根据 `agentView` 过滤; `sessions:get` 根据 asset.agentId 分派解析器。

## 渲染层结构

覆盖 A2、A3、A4、A7。

1. Zustand store 增加 `agentView` 和 `setAgentView`。
2. `sidebar.tsx` 在 Logo/应用名右侧放 select, 值为 all/claude/codex。
3. `useSessions` 参数透传 `agentView`。
4. Overview 和 Sessions 读取 store.agentView 并传给 `useSessions`。
5. 新增 agent view helper, Instructions/Capabilities 使用同一规则过滤 assets 和 stats。
6. Session Detail 新增工具时间线区, 产物区改用 `detail.artifacts`。

## 测试策略

覆盖 A1-A8。

1. 单元测试 Claude detail parser: tool timeline、Skill/MCP、todos/files/checkpoints。
2. 单元测试 Codex parser: metadata、bad JSON 容错、function call timeline、patch artifact。
3. 单元测试/renderer 测试 agent view: `useSessions` 参数、sidebar dropdown 更新 store。
4. 更新现有 session 页面渲染测试, 覆盖时间线和产物区。
5. 全量验证执行 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm harness:check`。
