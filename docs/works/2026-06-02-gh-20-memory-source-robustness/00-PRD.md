# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: https://github.com/Caldis/berth/issues/20

## 正文

MemorySource 适配层 (`src/main/memory/`) 的若干健壮性/性能改进, 属 `2026-05-30-memory-source-adapter-layer` 的后续, 均非阻断性:

1. **重复读取**: `listMemory` 对每个源先 `detect()` (读+解析 index.json) 再 `list()` (再读+解析一次)。可合并为一次读取。
2. **native 源 N+1**: `ClaudeNativeSource.list()` 为构建列表元数据读取了每条笔记全文再 `delete body`。原生 `MEMORY.md` 已是索引, 可优先解析索引拿元数据, 避免逐条读全文。
3. **index 失准无信号**: united-memory 的 `index.json` 可能声明比 `mem/` 实存更多条。列表展示了文件已不存在的条目, 点击 `read()` 优雅降级为空 body, 但 UI 无文件缺失提示。
4. **路径穿越加固**: `readMemory(globalId)` 跨 IPC 接收 id 并 `path.join` 到 mem 目录; 形如 `united-memory:../../foo` 可逃逸 `mem/`。本地只读应用风险低, 但应加 basename/前缀校验做纵深防御。
5. **native 时间缺失**: `parseNativeNote` 的 `createdAt/updatedAt` 恒为 null, 原生 frontmatter 的 `metadata.created/updated` 未提取, 导致原生笔记无法按时间排序/显示年龄。

## 本轮范围

第一小步只处理低耦合、可测试的安全与数据正确性问题:

- `UnitedMemorySource.read()` 对 local id 做 basename 校验, 禁止路径穿越。
- `ClaudeNativeSource.read()` 对 `<slug>/<filename.md>` 做段数、basename、`MEMORY.md` 排除和最终路径边界校验。
- `parseNativeNote()` 提取 `metadata.created/updated`。

重复读取、native list N+1、缺失文件 UI 提示留作后续独立任务, 避免一次改动牵涉缓存、列表契约和 renderer 表达。

