# 技术方案

## 有效状态计算

在 renderer 层先做只读推导，不改后端 schema:

- `getStatusLineGroupKey(asset)`:
  - Claude Code: `claude-code:${statusLineKind}`
  - Codex: `codex:footer-items`
- `rankStatusLineAsset(asset)`:
  - enterprise > project > user > unknown。
  - 同 scope 中保持原始顺序，后续若发现更精确的 source precedence 再收敛。
- 同组最高 rank 作为 effective，其余标记 overridden。

原因: 当前资产已经带 scope 和 provider；先在 UI 计算能最小化后端影响，也能满足用户判断“最终用哪条”。

## 健康检查

每条 asset 推导 `StatusLineDiagnostic[]`:

- blocked:
  - Claude Code `disableAllHooks === true`。
  - Codex `hidden === true`。
- warning:
  - Claude Code command 为空或不是字符串。
  - Claude Code command 引用了本地脚本但 `entryPaths` 为空时，提示 Berth 未确认到脚本文件。
  - Codex 存在 `unknownItems`。
  - 同组 asset 被更高优先级覆盖。
- ok:
  - 其他已识别配置。

UI 在 summary 增加 warning / blocked 计数，卡片显示具体诊断。

## 敏感信息处理

新增纯函数:

- `redactStatusLineCommand(command): { value: string; redacted: boolean }`
- 识别常见命令片段:
  - `KEY=value` 中 key 包含 `token|secret|password|passwd|api_key|apikey|authorization|bearer`。
  - `--token value` / `--api-key value` / `--password value`。
  - `Bearer <token>`。
- UI 默认展示脱敏后的命令，并显示“已隐藏敏感片段”提示。
- 原始配置仍可通过“查看原始文件”打开，避免 Berth 自己伪造配置内容。

## 测试

- Renderer:
  - effective / overridden 标记。
  - Codex default footer empty state。
  - sensitive command redaction。
  - diagnostics warning / blocked。
- Unit:
  - 保持 Codex empty array hidden 测试。

## 提交策略

1. 如果当前主分支缺少上一轮 Status Line 页面基础改动，先独立验证并提交恢复该基础。
2. 提交任务态文档。
3. 提交有效状态计算。
4. 提交健康检查和敏感信息处理。
5. 跑目标测试、typecheck、harness。
