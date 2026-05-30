# 描述
MemorySource 适配层 (`src/main/memory/`) 的若干健壮性/性能改进, 属
`2026-05-30-memory-source-adapter-layer` 的后续, 均非阻断性:

1. **重复读取**: `listMemory` 对每个源先 `detect()` (读+解析 index.json) 再 `list()` (再读+解析一次)。
   可合并为一次读取 (detect 复用 list 结果或缓存)。
2. **native 源 N+1**: `ClaudeNativeSource.list()` 为构建列表元数据读取了每条笔记全文再 `delete body`。
   原生 MEMORY.md 已是索引, 可优先解析索引拿元数据, 避免逐条读全文。
3. **index 失准无信号**: united-memory 的 `index.json` 可能声明比 `mem/` 实存更多条 (本机 45 vs 38 有效)。
   列表展示了文件已不存在的条目, 点击 `read()` 优雅降级为空 body, 但 UI 无 "文件缺失" 提示。
   可在 list 阶段校验文件存在性并标记 missing, 或 read 返回缺失态供 UI 显示。
4. **路径穿越加固**: `readMemory(globalId)` 跨 IPC 接收 id 并 `path.join` 到 mem 目录;
   形如 `united-memory:../../foo` 可逃逸 `mem/`。本地只读应用风险低, 但应加 basename/前缀校验做纵深防御。
5. **native 时间缺失**: `parseNativeNote` 的 `createdAt/updatedAt` 恒为 null (原生 frontmatter 的
   `metadata.created/updated` 未提取), 导致原生笔记无法按时间排序/显示年龄。可从 metadata 提取。

# 重现步骤
- 阅读 `src/main/memory/index.ts`、`sources/united-memory.ts`、`sources/claude-native.ts` 即可见 1/2/4/5;
  3 可在本机 (index.json 45 vs mem/ 38) 复现: 列表条目点开后 body 为空且无提示。

# 预期结果
- 单次读取; native 列表不读全文; 缺失文件有提示; id 不可路径穿越; native 笔记有时间字段。

# 实际结果
- 双读; native list 读全文; 缺失条目静默空 body; 未校验 id 路径; native 时间恒 null。

# 解决方案
- 合并 detect/list 读取; native list 走索引优先; list 校验文件存在并标记 missing;
  readMemory 对 localId 做 basename/白名单校验; parseNativeNote 提取 metadata.created/updated。
