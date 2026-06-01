# 需求分析 (Explore 产物)

## 现状理解

本任务涉及主进程 memory source 适配层和 MemoryView 的只读展示, 不涉及 Electron preload/IPC 契约新增。

相关链路:

- `src/main/memory/index.ts`: `listMemory()` 先 `detect()` 再 `list()`, `readMemory()` 按 `${sourceId}:${localId}` 路由。
- `src/main/memory/sources/united-memory.ts`: 从 `~/.united-memory/index.json` 列表, `read(localId)` 拼 `root/mem/<localId>.md` 读取详情。
- `src/main/memory/sources/claude-native.ts`: 从 `~/.claude/projects/<slug>/memory` 列表; 当前 list 会逐条读取正文再删 `body`。
- `src/shared/types/memory.ts`: `MemoryNote` 是 main/renderer 共享契约。
- `src/renderer/src/components/memory/memory-view.tsx`: 展示 memory 列表和展开详情, 当前没有文件缺失提示。

已验证问题:

1. `UnitedMemorySource.detect()` 和 `list()` 在同一 source 实例内重复读取同一个 `index.json`。
2. `ClaudeNativeSource.list()` 逐条读取 note 正文; 原生 `MEMORY.md` 已包含索引行, 可优先用索引生成列表。
3. united-memory index 中声明的文件可能不存在; 当前列表仍展示, 展开后无明确缺失提示。
4. `UnitedMemorySource.read(localId)` 和 `ClaudeNativeSource.read(localId)` 对跨 IPC 传入的 local id 缺少路径边界校验。
5. `parseNativeNote()` 没有提取 `metadata.created/updated`, 原生 memory 无法按时间排序。

## 关联与依赖

- `MemoryNote.path` 已是渲染层展示和打开 Explorer 的路径。增加 `missing?: boolean` 为向后兼容扩展, 不破坏旧数据。
- `MemoryView` 可用 `note.missing` 展示缺失提示, 并禁用查看原文/打开文件动作。
- native `MEMORY.md` 索引字段只有 title/file/hook, 不一定有 type/date。列表可用 `hook` 作为 summary; 详情仍通过 read 读取完整 frontmatter 和正文。
- `readMemory()` 保留冒号分割策略, 具体 local id 校验放到各 source 内, 因为不同 source 的 id 结构不同。

## 验收标准

1. `UnitedMemorySource.read('../x')`、`read('..\\x')`、`read('sub/x')` 均返回 null, 合法 id 仍可读取。
2. `ClaudeNativeSource.read()` 只接受 `<slug>/<filename.md>`; 路径穿越、子目录、`MEMORY.md`、非 markdown 文件均返回 null。
3. `parseNativeNote()` 从 `metadata.created/updated` 提取 `createdAt/updatedAt`, 支持字符串和 YAML Date。
4. `ClaudeNativeSource.list()` 优先使用 `MEMORY.md` 索引生成列表, 不因索引指向的 note 文件缺失而丢失列表条目。
5. united-memory 和 native 列表条目在文件缺失时带 `missing: true`; MemoryView 展示文件缺失提示并避免打开缺失路径。
6. 同一 `UnitedMemorySource` 实例内先 `detect()` 再 `list()` 不重复读取 `index.json`。
7. 目标 memory 单测、renderer memory 测试、node/web typecheck 和 harness 检查通过。

## 界面质量与交互验收

- 只新增缺失文件的内联状态提示, 不改变 MemoryView 卡片结构和默认信息密度。
- 缺失状态使用 warning 语义色, 但不扩大为整卡高亮; 默认列表仍可扫描。
- 展开缺失条目时, 展示简短说明, 不显示空白 body 区。
- 缺失文件不提供 View Raw / Show in Explorer, 避免用户点击无效动作。
- 不引入新的卡片套卡片, 不新增模态。
- 响应式不改动; 缺失提示必须可换行, 不挤压标题和 tag。

## 未决问题

无。范围可由代码和 issue 直接确定。

