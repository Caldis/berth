# Improve Memory Source Robustness

## 类型

IMPROVEMENT

## 状态

Resolved

## 完成日期

2026-06-02

## GitHub

- Issue: https://github.com/Caldis/berth/issues/20
- Number: #20

## 背景

MemorySource 适配层存在重复读取、native list 逐条读正文、index 失准无提示、local id 路径穿越和 native 时间字段缺失等健壮性问题。

## 完成记录

- `UnitedMemorySource.read()` 现在拒绝路径穿越 local id, 同一 source 实例内 `detect()` 与 `list()` 复用已解析 index。
- united-memory list 会标记 index 中存在但文件缺失的条目为 `missing: true`。
- `ClaudeNativeSource.read()` 现在只接受 `<slug>/<filename.md>` 形态, 拒绝子目录、路径穿越、`MEMORY.md` 和非 `.md` 文件。
- Claude native `parseNativeNote()` 现在提取 `metadata.created/updated` 到 `createdAt/updatedAt`。
- Claude native list 优先使用 `MEMORY.md` 索引生成列表, 文件缺失时仍保留条目并标记 `missing: true`。
- `MemoryNote` 增加 `missing?: boolean`; MemoryView 展示缺失文件 tag 和展开说明, 并隐藏无效的 View Raw / Show in Explorer 操作。

## 验收记录

- 新增单测先失败, 覆盖 path traversal、native 时间、native index list、missing 标记和 united-memory index 缓存。
- `pnpm test -- tests/unit/memory-service.test.ts tests/unit/memory-claude-native.test.ts tests/renderer/memory-view.test.tsx` 通过, 3 个 test files / 26 tests passed。
- `pnpm typecheck:node` 通过。
- `pnpm typecheck:web` 通过。
- `pnpm harness:check` 通过。

## 归档

- 任务归档路径: `docs/works/_archive/2026-06-02-gh-20-memory-source-robustness/`
