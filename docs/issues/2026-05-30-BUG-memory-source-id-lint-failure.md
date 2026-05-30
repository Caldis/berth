# Memory Source Id Lint Failure

## 类型

BUG

## 状态

Open

## 背景

在设置页本地来源任务的最终验证中, `pnpm lint` 失败, 失败点不在本任务修改范围内。

## 已验证事实

- 命令: `pnpm lint`
- 报错文件: `src/shared/types/memory.ts`
- 报错位置: 第 1 行
- 报错规则: `@typescript-eslint/ban-types`
- 当前类型写法: `string & {}`

## 影响

`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm harness:check` 已通过, 但全量 lint 仍无法通过。

## 建议

把 `MemorySourceId` 的开放字符串写法改成不触发 `ban-types` 的等价类型, 并补跑 `pnpm lint`。
