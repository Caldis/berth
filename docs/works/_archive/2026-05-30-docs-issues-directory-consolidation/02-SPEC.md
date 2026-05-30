# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 本地产品 issue 目录改为 `docs/issues/`。
- `docs/friction/` 继续只记录工程摩擦。
- `docs/works/` 继续只记录任务态。

## 模块结构 / 组件拆分

- 使用 `git mv` 将原根目录产品 issue 清单移动到 `docs/issues/`, 保留历史。
- 更新 `.agents/`、根 `AGENTS.md`、`docs/superpowers/*`、`docs/works/*`、`docs/friction/*` 中的本地 issue 路径。
- 在 harness 校验器中加入 `docs/issues/` 的轻量检查, 避免旧根目录复活。

## 测试策略

- 跑 `pnpm test tests/harness/check.test.ts` 覆盖新增校验。
- 跑 `pnpm harness:check` 验证任务态、friction、模板与分发仍一致。
- 用 `rg` 检查旧本地目录引用已清理。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 迁移目录并保持三类状态语义 | 1 |
| 更新 harness 与历史交叉引用 | 2, 3 |
| 增加校验并运行测试 | 4 |
