# 描述
- `tests/renderer/hooks-lifecycle-view.test.tsx` 的 hook 健康面板用例存在非确定性 (flaky), 在**字节相同的代码**下 CI 时绿时红, 反复拖红共享分支 master。
- 失败断言: 用例内 `await within(sidebar).findByTestId('hook-health-panel')` 之后**紧跟同步** `within(healthPanel).getByRole('button', { name: /1 hook check needs attention/ })` (约 `:735`)。若汇总按钮在 panel 出现后再异步渲染, 同步 `getByRole` 会偶发拿不到 → 抛 `getElementError`。

# 重现步骤
- CI run 对比 (无任何提交改动该测试文件或其组件 `hooks-lifecycle-view.tsx`):
  - `eb19a3d` CI success (hooks-lifecycle 通过)。
  - `f16bc40` (= `eb19a3d` + 一个 memory-only 提交 + 一个 docs-only 归档提交) CI failure, 失败点 `hooks-lifecycle-view.test.tsx#735`。
  - `fb16c5c` CI failure, 同一文件。
- `git log -- tests/renderer/hooks-lifecycle-view.test.tsx` 显示最近改动 (`3d58858` / `df6d84d`) 均为 `eb19a3d` 的祖先 → 绿红之间该测试代码未变, 差异只能来自运行期非确定性。

# 预期结果
- hook 健康面板用例在相同代码下稳定通过, 不随机失败、不拖红共享 CI 闸门。

# 实际结果
- 用例偶发失败, 且近期出现连续失败 (高负载/时序下竞态更易触发), 阻塞所有 Agent 在 master 上获取"CI 全绿"确认。

# 解决方案
- 把同步 `getByRole(/1 hook check needs attention/)` 改为异步 `await within(healthPanel).findByRole(...)`, 或先 `await findByRole` 汇总按钮再断言其余, 消除 panel 渲染与按钮渲染之间的竞态。
- 审查同文件其余 `findBy*` 后紧跟 `getBy*` 的断言, 统一改为异步查询。
- 可加 `it`/`describe` 级重试或 `waitFor` 包裹存在异步副作用的断言。

# 备注
- 发现于 GH-100 记忆页后续迭代 (移除来源跳转边栏) 的推送/CI 验证过程; 该测试属 capabilities/hooks (GH-99 相关) 范围, 非本任务主线, 按 invariant 10 仅记录不越界修复。本任务改动 (`memory-view.tsx`) 与该测试文件隔离, vitest 文件级隔离, 互不影响。
- 相关 friction: `docs/friction/20260604-4.0-verify-shared-branch-ci-red-foreign-commit.md` (CI 红按文件归因)。
