# Memory Source Id Lint Failure

## 类型

BUG

## 状态

Resolved

## 完成日期

2026-06-02

## 背景

在设置页本地来源任务的最终验证中, `pnpm lint` 曾失败, 失败点不在本任务修改范围内。后续提交已修复该类型写法, 当前 `pnpm lint` 已通过。

## 已验证事实

- 命令: `pnpm lint`
- 报错文件: `src/shared/types/memory.ts`
- 报错位置: 第 1 行
- 报错规则: `@typescript-eslint/ban-types`
- 当前类型写法已改为不触发 `ban-types` 的 branded string。

## 影响

已消除。`pnpm lint` 当前通过。

## 验收记录

- `pnpm lint`
