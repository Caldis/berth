# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- `desiredArtifacts(root)` 只生成三类分发产物:
  - `.agents/skills/opsx-<verb>/SKILL.md`
  - `.claude/skills/opsx-<verb>`，允许 symlink 或目录复制
  - `.claude/commands/opsx-<verb>.md`
- Codex 不再需要 `.codex/skills` 产物；Codex 原生读取 `.agents/skills`。
- 文本比较统一归一化 CRLF/LF，避免平台换行误报。

## 模块结构 / 组件拆分

- `scripts/harness-sync.mjs`
  - 移除 `.codex/skills` desired artifact。
  - `fileInSync` 与复制回退检查使用 normalized text comparison。
  - 复制回退保留，保证 Windows 无 symlink 权限时能生成真实 skill 目录。
- `tests/harness/sync.test.ts`
  - 用 helper 判断 skill 分发是否有效: symlink 指向正确，或目录中 `SKILL.md` 与源一致。
  - 不再硬性 `readlinkSync`。
- 文档
  - Codex 入口改为 `.agents/skills` / `$opsx-<verb>`。
  - Claude 入口说明为 `/opsx-<verb>` 命令桩或同名 skill。
  - 历史设计文档补充本次实现修正。
- CI
  - 增加 `ubuntu-latest` / `windows-latest` matrix。

## 测试策略

- `pnpm vitest run tests/harness`
- `pnpm harness:check`
- 如时间允许，运行 `pnpm test`。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 移除 `.codex/skills` 分发 | 1 |
| Claude skill symlink/复制双形态 | 2 |
| 换行归一化比较 | 3 |
| sync 测试改为形态无关 | 4 |
| 文档入口修正 | 5 |
| CI matrix | 6 |
