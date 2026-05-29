# 描述
- corepack 默认拉取 pnpm 11, 无视 `pnpm.onlyBuiltDependencies`, 跳过原生构建脚本并生成无效
  pnpm-workspace.yaml, 破坏 berth 构建。本项目必须钉死 pnpm 9.x。

# 重现步骤
- 干净环境 (无全局 pnpm) 下 `corepack enable pnpm` 后 `pnpm install`
- 观察 better-sqlite3 / electron 构建脚本被跳过, 且生成 pnpm-workspace.yaml

# 预期结果
- 原生模块编译、Electron 二进制下载, `pnpm dev` 可启动

# 实际结果
- 原生模块未编译, 生成无效 workspace 文件, `pnpm dev` 报 `packages field missing or empty`

# 解决方案
- package.json 增 `"packageManager": "pnpm@9.15.4"`
- CI 用 `pnpm/action-setup@v4` 指定 9.15.4
- 关联摩擦: docs/friction/20260529-implement-pnpm-version-pinning.md
- 备注: README 的 "pnpm 9+" 措辞偏宽松, 实际须 9.x (后续可收紧文案)
