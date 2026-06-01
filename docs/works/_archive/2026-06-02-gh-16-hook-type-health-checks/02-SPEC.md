# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不改 `HealthCheck` 类型。新增检查继续使用:
- `assetType: "hook"`
- `target.route: "/configuration/capabilities?tab=hooks"` 由现有 `targetFor` 自动推导
- evidence 由 `evidenceFor` 自动落到 Claude/Codex hooks 官方文档

## 模块结构 / 组件拆分

- 扩展 `collectHooks` 返回字段: `url`, `server`, `tool`, `prompt`, `async`.
- `checkClaudeHooks` 根据 type 分支检查必填字段。
- `checkCodexHooks` 增加 async skip info; Windows 有 commandWindows 时增加覆盖 info。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Claude typed handler required fields | unit | `tests/unit/health-check.test.ts` | `pnpm test -- tests/unit/health-check.test.ts` |  |
| Codex async skip and Windows override info | unit | `tests/unit/health-check.test.ts` | `pnpm test -- tests/unit/health-check.test.ts` |  |
| 类型检查 | typecheck | n/a | `pnpm typecheck:node` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Claude typed handler checks | 1, 2, 3, 7 |
| Codex async / commandWindows checks | 4, 5, 6, 7 |
