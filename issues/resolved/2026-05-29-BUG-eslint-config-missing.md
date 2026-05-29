# 描述
- 项目缺少 ESLint flat config (eslint.config.js), `pnpm lint` 直接失败 (exit 2)。该问题在
  master 既已存在, 非 harness 引入。harness CI 暂不纳入 lint 步骤, 待配置补齐后再启用。

# 重现步骤
- `pnpm lint` (即 `eslint . --ext .ts,.tsx`)

# 预期结果
- ESLint 按配置扫描 .ts/.tsx 并通过或给出可处理的告警

# 实际结果
- ESLint 9 flat config 缺失, 报迁移错误并 exit 2; 无 eslint.config.js / .eslintrc.*

# 解决方案
- 待办: 新建 eslint.config.js, 复用已装的 @electron-toolkit/eslint-config-ts (flat config)
- 待办: 修复暴露出的现有代码 lint 错误后, 在 .github/workflows/ci.yml 重新加入 lint 步骤

---
# 完成 (2026-05-29)
- eslint.config.mjs (ESLint 9 flat): @eslint/js + @typescript-eslint(rules spread) + react/react-hooks(仅 renderer), 只校验 ts/tsx。
- devDep: eslint-plugin-react, eslint-plugin-react-hooks, globals。
- 修复 3 errors (@ts-ignore→@ts-expect-error+描述, 正则多余转义) + 5 warnings (test 未用 import)。
- package.json lint 去掉 eslint 9 已废弃 --ext。
- ci.yml 重新加入 pnpm lint 步骤。
- 验证: pnpm install --frozen-lockfile / lint / typecheck / test(45) / harness:check 全 exit 0。
