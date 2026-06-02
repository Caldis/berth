# 描述
- 会话详情页 token 速率计算不准确。
- 使用的 skills、MCP 和触发 hooks 有时显示不正确。

# 重现步骤
- 打开包含多条消息、工具调用、skills、MCP 或 hooks 的会话详情。
- 对照原始会话数据检查 token 速率和相关资产识别。

# 预期结果
- token 速率按可靠的时间范围和 token 字段计算。
- skills、MCP、hooks 的识别来源可解释, 与原始会话事件一致。

# 实际结果
- 当前 token 速率被认为错误, skills / MCP / hooks 识别也存在不稳定情况。

# 解决方案
- 先补原始会话样本和单元测试。
- 明确 token rate 的定义, 避免用不可靠时间戳或不完整 token 字段计算。
- 将 skills / MCP / hooks 识别改为可测试的解析器逻辑。

# 处理结果
- 已在 GH-80 中修复。
- 归档任务: `docs/works/_archive/2026-06-03-gh-80-session-detail-activity-metrics/`
- 主要提交: `505094d fix(sessions): derive activity metrics from usage events`
- 验证: `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; CI `505094d` 通过; Electron 实测 Session Detail Overview 通过。
