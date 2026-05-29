# 工程摩擦记录

## 发生阶段
implement (首次 `pnpm dev` 启动 berth)。

## 现象
非交互环境无 pnpm; 经 corepack 启用时默认拉取 pnpm 11.4.0。pnpm 11 不再读取
`package.json` 的 `pnpm.onlyBuiltDependencies`, 跳过 better-sqlite3 / electron / esbuild
的构建脚本 (原生模块不编译、Electron 二进制不下载); 且自动生成无效 `pnpm-workspace.yaml`
(缺 packages 字段), 导致后续所有 pnpm 命令报 `packages field missing or empty`,
`pnpm dev` 连续失败。

## 工程师介入动作
删除 rogue `pnpm-workspace.yaml`; `corepack prepare pnpm@9.15.4 --activate` 钉死版本;
重装后原生模块成功编译, 应用启动。

## 应沉淀的上下文或规则
本项目必须用 pnpm 9.x。corepack 默认版本会破坏构建。

## 建议的流程改进 (已落地)
package.json 增 `"packageManager": "pnpm@9.15.4"`; CI 用 pnpm/action-setup 钉死 9.15.4。
关联 issue: issues/2026-05-29-IMPROVEMENT-pnpm-version-pinning.md。
