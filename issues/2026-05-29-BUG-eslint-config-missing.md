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
