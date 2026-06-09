**A. 仍有缺陷**

1. `src/main/adapters/claude-code/parsers.ts:229-249`  
   `~/.claude.json` 的 project MCP 不能只用 `server name` 做 entityKey。同一个 `sourcePath` 里会有多个 `projects[projectPath].mcpServers[name]`，两个项目同名 server 会撞。应为 `projectPathKey + serverName`。

2. `src/main/adapters/claude-code/parsers.ts:87-184`、`:868-1004`  
   `skill/agent/command/output-mode/plan/todo/history/...` 这类单文件单资产，不要用 `name` 做身份。`name` 可能来自 frontmatter 或 basename，用户改标题会导致 id 变。entityKey 应固定为归一化相对路径；`name` 只做展示。

3. `src/main/engine/scanner.ts:336-369`  
   canonical merge 写库前做可以，但 `source_path` 不能沿用 primary asset 的 `path`。当前 merge 选 Claude 资产为 primary，只保留 primary 行；同物理文件被 Claude/Codex 用不同路径字符串扫到时，按 `source_path` 删除会不可靠。需要拆成：`source_key=dedupePathKey(real/source path)` 用于替换，`displayPaths/readByAgentIds` 用于 UI。

4. `src/main/adapters/claude-code/scanner.ts:263-279`、`src/main/adapters/claude-code/parsers.ts:389-427`  
   Hook sidecar 是隐藏依赖。`settings.json` 的 hook 资产会受 `.berth/hooks-state.json` 影响，但资产 `path/source` 仍指向原 settings。watcher 收到 sidecar 变更时，不能只按 sidecar path 替换；必须反查并重派生对应 settings source。

5. `src/main/engine/watcher.ts:42-44`、`:67-68`  
   watcher 事件目前只给 `assetId=basename(filePath)`。T0/T2 要做 source_path 原子替换时，事件必须携带归一化 `sourcePath/sourceKey`，否则 unlink/add/change 无法精确映射到一组资产。

6. `src/main/engine/assets/worker.ts:11-38`、`src/main/engine/assets/worker-host.ts:119-128`  
   现在整个 `AssetScanner` 在 worker 里跑，并把 session cache snapshot 来回传。若 SQLite writer 固定在 main，`AssetFileCache` 直接换 SQLite 后端并保持 API 不变，这条路径不成立；worker 同步 parser 不能直接读 main 里的 better-sqlite3。T1/T2 要先定义 main/worker 之间的 changeset 协议。

7. `src/main/engine/scanner.ts:94-101`  
   代码已经说明 raw 内容会放大 structured-clone 成本。SQLite main writer 可以，但 `asset_raw` 要限制范围：不要把大 transcript 或敏感内容写入 raw 表；文件型 raw 可按需从磁盘读，DB 只存摘要/metadata。

**B. 持久化垫脚石**

JSON snapshot 更省，但只能做“冷启先显示旧快照”的垫脚石，不要把它做成 `AssetFileCache` 的长期后端。建议形态是 `AssetSnapshot` 级别：启动读 userData JSON，后台 SWR 重扫，完成后覆盖 JSON。后续换 SQLite 时，这层 `loadSnapshot/saveSnapshot` 可替换，返工小。

SQLite 仍是正确的第一版“真持久化”，因为你真正要的是 per-source 原子替换、fingerprint、parser_version、错误保留和事务顺序。只是当前 T1 描述低估了 worker/main 边界：如果 T1 直接上 SQLite，别说“AssetFileCache API 不变”即可完成；要么 T1 只在 main 存最终 snapshot，要么先做 T2 的 changeset 协议。

**C. 并行与第一个 PR**

Pre-T0 必须先于 SQLite 主键、MiniSearch changeset、source_path 替换。没有稳定 id，后面的增量索引和 DB 替换都可能把“同一资产”当成删除+新增。

可并行的是：T0 watcher debounce、file-cache racy hash 可以和 Pre-T0 分支并行设计；但合并顺序应是 Pre-T0 先。MiniSearch changeset最好等 Pre-T0 后再做。

第一个 PR 我同意选 Pre-T0。范围要收紧为：Claude 所有 `makeId` 资产改确定式 id；`.claude.json` project MCP 加 `projectPathKey`；单文件资产用归一化路径，不用展示名；Codex 现有 `hashString(filePath)` 至少换成同一套 `dedupePathKey/stableHash`，避免留下另一半不稳定。

**D. 可再砍与各 Tier 易踩坑**

1. Pre-T0：别用 32-bit path hash 做长期 DB PK；`src/shared/asset-dedupe.ts:22-29` 当前 `stableAssetHash` 太弱。用更宽的稳定 hash，或把未 hash 的 normalized key 存库用于冲突检测。

2. T0：MiniSearch changeset 可后置。`src/main/engine/search.ts:35-47` 已有签名避免重复 rebuild；没有 DB changeset 前，强行用 `addAsset/removeAsset` 价值有限。

3. T0：`mtime >= indexed_at` 容易受文件系统时间精度影响。`src/main/engine/assets/file-cache.ts:82-97` 当前只看 path/size/mtime；改法应只在“mtime 接近上次索引时间且 size 未变”的窄窗口补 hash，不要全文件普遍 hash。

4. T1：先别做 `asset_raw` 大表。先存 `asset.payload_json`、fingerprint、parser_version、source status；raw 继续按需读文件。

5. T2：parse error 不能 `DELETE source_path` 后再发现失败。事务顺序应是先 parse 出 changeset，再写 `source_status=error`，旧 asset 行保留。

6. T2：full scan 与 watcher scan 要有单调 checkpoint。否则旧 full scan 后提交，可能覆盖 watcher 刚写入的新结果。

7. T3：per-type 完成度可以先砍成 per-root 状态。全局空态只需要知道相关 root 至少校验过一次；per-type 细分可由 source coverage 慢慢补。

8. T3：`src/main/project-scope-runtime.ts:34-45` 当前切项目会 setProjectDir + refresh + watcher restart。改成纯过滤时，要确保所有 server-side 入口都用同一个 scope predicate；搜索现在在 `src/main/engine/assets/runtime.ts:260-271` 已有这个模式。

