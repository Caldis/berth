**A. 最大风险 / 缺陷**

1. **“确定式 id 已就绪”这个前提不成立。**  
   `src/main/adapters/claude-code/parsers.ts:15-16` 仍用 `Date.now()+_nextId`，且 MCP、hook、skill、command、permission、statusline 等大量资产仍走 `makeId()`（如 `:211`, `:327`, `:533`, `:624`）。SQLite `asset.id` 做 PK、delta upsert、renderer 按 id 合并都依赖稳定 id；否则同一文件重扫会产生新行，旧行只能靠 `source_path` 兜底删除，选择态、raw refetch、MiniSearch 增量都会抖。

2. **I1 单管线的“path 替换资产”语义还不够严。**  
   单文件可派生 N 个资产：Claude `settings.json` → hooks/MCP/permission/env/statusline（`src/main/adapters/claude-code/parsers.ts:197-218`, `:290-355`, `:528-642`），Codex `config.toml`/`hooks.json` 同理（`src/main/adapters/codex/parsers.ts:36-47`, `:128-147`, `:207-245`）。变更时必须按 `source_path` 原子删除旧派生资产再插入新资产。AGENTS.md 更麻烦：两个 adapter 先产两行，再靠 `mergeSharedConventions()` 合并（`src/main/engine/scanner.ts:326-360`）。如果 per-path 管线直接写 DB，必须把“raw adapter row”和“canonical merged row”的边界定义清楚，否则共享文件会重复、漏删或丢 `readByAgentIds`。

3. **SQLite 写入线程和事务边界没设计实。**  
   `better-sqlite3` 是同步 API。放 main 会卡 Electron IPC/UI；放多个 worker 会遇到多连接单写者、busy timeout、WAL checkpoint 和写顺序问题。最低风险是：parse worker 只产 changeset，单一 index writer 串行写 DB；每个 path/batch 用一个事务完成 `file_fingerprint`、`DELETE asset WHERE source_path=?`、`asset/asset_raw upsert`、checkpoint bump；partial 必须在事务提交后发。

4. **全局视图会出现“虚假完整”。**  
   现有 `global` 谓词无条件返回 true（`src/shared/scope.ts:83-94`）。设计里的 SWR 冷启动如果直接返回 DB 全表，用户会把“还没扫到 / 扫失败 / 项目尚未发现”理解成“没有”。需要 per root / per type 的 `indexed|scanning|error|unknown` 状态；全局空态必须等相关 root 至少完成一次校验后才允许出现。

5. **delta partial + worker 取消被同时引入，状态机过重。**  
   当前 partial 是累积数组替换（`src/main/engine/scanner.ts:29-37`, `:99-103`; `src/main/engine/assets/runtime.ts:430-436`），简单但成本高。delta 需要 revision、remove、乱序处理、崩溃后重取快照。worker 取消也不能靠 `AbortController` 自动跨线程生效；当前 worker 每次 new（`src/main/engine/assets/worker-host.ts:54-58`），只会持续跑到结束。先做 checkpoint 轮询取消即可，SAB 不该进第一批。

**B. §8 六问**

1. `appendShallowConventions` 先保留为 `low-durability` fallback。全索引完成前不能删；但 global 必须标明哪些是 shallow，不能把 shallow 当完整结果。  
2. 先加固 chokidar + 启动 stat 校验。`@parcel/watcher getEventsSince` 增加原生依赖和 ABI 风险，等实测 chokidar 丢事件再考虑。  
3. 先用 postMessage/checkpoint 轮询。SAB 只适合已证明取消延迟影响体验的场景；现在资产量不值得。  
4. renderer 先保留全量替换。百到低千资产下，delta 是后置优化；内部可以先做 path changeset，UI 仍吃快照。  
5. durability 只能影响优先级和提示，不能用来跳过校验。标错后漏更新比多 stat 几个小文件严重。  
6. session 先别进 FTS5。先把 session 摘要持久化；全文搜索或 MiniSearch 实测卡住后，再单独引入 FTS5。

**C. 更简单方案**

先别做完整 Spotlight 级调度器。第一阶段只需要三件事：稳定 id、持久 file cache、path changeset。  
长驻 worker 池、AIMD、SAB、session byte-offset tail、FTS5、丰富 knob 都可后置。berth 当前资产量不大，复杂度主要不是吞吐，而是一致性：同一文件多资产、共享文件合并、scope 不触发扫描、全局未完成时不误导用户。

**D. 推荐顺序**

1. **新增 Pre-Tier 0：身份与 source 契约。**  
   先改掉 Claude `makeId(Date.now)`；定义 `sourcePath`/`entityKey`；补“同一文件扫描两次 id 不变”和“settings/config 一文件多资产可整体替换”的测试。坑：不要只修 AGENTS.md，MCP/hook/statusline 才是高风险。

2. **Tier 0：racy hash + watcher debounce。**  
   `sameFingerprint()` 现在只比 path/size/mtime（`src/main/engine/assets/file-cache.ts:96-98`）；watcher 现在每个事件立即发、assetId 只是 basename（`src/main/engine/watcher.ts:42-44`, `:67-68`）。坑：unlink 不能被 debounce 吞掉；session 大文件不要全量 hash。

3. **Tier 1：SQLite-backed file cache。**  
   先不改 UI，不引入 delta。坑：事务必须“删旧派生资产 + 写新派生资产 + fingerprint”同批提交；Windows 路径大小写要归一。

4. **Tier 2：deriveAssetsForPath + 单 writer。**  
   `scanAll()` 退化为枚举 path 后逐个 derive。坑：AGENTS.md canonical merge 要作为明确步骤；parse error 时不要让旧资产静默消失。

5. **Tier 3：全局后台扫描 + scope 纯过滤 + 完成度 UI。**  
   删 `setProjectDir` 重扫语义（现状在 `src/main/project-scope-runtime.ts:34-45`）。坑：项目发现依赖 session，冷启动第一轮不能声称 global 完整。

6. **Tier 4：delta partial / session tail / FTS5 / SAB / AIMD / knob。**  
   这些等真实规模数据证明需要后再做。坑：每个 delta 必须带 checkpoint/revision，renderer 可随时丢状态并从 DB 重建。

