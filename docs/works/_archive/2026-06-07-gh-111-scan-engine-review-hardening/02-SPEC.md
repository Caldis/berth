# 技术方案 (Design 产物)

## 设计原则
"缺失数据必须发声": 区分 缺文件(正常) 与 坏数据(错误); 坏数据进 `ctx.errors` → 边栏可见。覆盖纠正对齐官方目录。最小侵入, 不改 asset type / IPC 大契约 (除 partial 加可选 errorCount)。

## 各项方案 (回指 01-ANALYSIS)

### C1 output-styles
- `scanCapabilities`? 否 — output-mode 是 instruction, 在 `scanInstructions`。把 `scanDir(claudeDir/'output-modes',...)` 改为 `'output-styles'`; 并对每个 `projectDirsFromContext(ctx)` 加 `scanDir(projectDir/'.claude'/'output-styles','project','**/*.md',parseOutputMode)`。asset type 维持 `output-mode` (兼容)。
- 验收: 用户级 + 项目级 output-styles 目录下 `.md` 被扫为 output-mode 资产。

### C2 skills `**/SKILL.md` + 父目录名
- `scanInstructions` 两处 skills `scanDir(...,'**/*.md',parseSkill)` → `'**/SKILL.md'`。
- `parseSkill` name fallback: frontmatter.name ?? (basename==='SKILL' ? basename(dirname(file)) : basename(file,ext))。保守: 仅当文件名是 SKILL 时取父目录名, 不影响其它调用方。
- 验收: `foo/SKILL.md`+`foo/reference.md` → 仅 1 个 skill, name=`foo` (无 frontmatter 时)。

### O1 readSettingsJson 区分缺失/坏 JSON
- 签名改为 `readSettingsJson(filePath, onError?)`: 缺文件 → 返回 null 静默; 存在但 JSON.parse 抛 → `onError?.(err)` 后返回 null。调用方 (`scanCapabilities` settings 循环) 传 onError 推 `ctx.errors{path, type:'settings-json', message}`。
- 验收: 坏 settings.json → ctx.errors 含一条; 缺文件 → 无错误。

### O2 session 坏行/读失败可观测
- session parser: 累计 `malformedLineCount`; 写入 asset.meta。整文件 read/stat 失败 → 通过回调/返回让 scanState 推 ctx.errors。
- 验收: 含坏行的 jsonl → meta.malformedLineCount>0; 不可读文件 → ctx.errors 一条。

### O3 safeGlob 写 ctx.errors
- `safeGlob(pattern, cwd, ctx?)`: catch 时 `ctx?.errors.push({path:cwd, type:'glob', message})`。逐个调用点传 ctx (scanDir 已有 ctx)。
- 验收: glob 抛错 → ctx.errors 一条 (单测用 mock 触发)。

### O4 partial 带 errorCount
- `AssetScanPartial` 加 `errorCount?: number`; engine onPartial 传当前累计 errors.length; worker `partial` 透传; runtime applyPartial→payload; store applyAssetProgress 用 partial.errorCount 更新 `assetErrors` 计数视图 (轻量: 设一个 number, 不塞全量 errors)。最简: partial 带 errorCount, store 暂存到 assetErrors.length 的来源 — 用既有 assetErrors 数组无法只塞 count, 故 store 增 `scanningErrorCount` 或直接在 sidebar 读 status。**决定**: partial 仅加 `errorCount` 字段透传, sidebar 边栏 scanning 时显示 `nav.scanStatus.issues` 用该 count (不改 assetErrors 语义)。
- 验收: partial.errorCount 透传到 store; sidebar 扫描中显示问题数。

### R1 statSync TOCTOU 守护
- `scanner.ts:501` 的裸 `fs.statSync(fp).isFile()` 包进 try (或用 `fingerprintFile`/safeStat helper), 失败写 ctx.errors 后 `continue`。审计同文件其它裸 statSync (glob 后) 一并守护。
- 验收: glob 后文件被删 → 不抛, 单文件跳过 + ctx.errors 一条, 其它资产不丢。

### R2 watcher 不自忽略点目录根
- `ignored` 改为函数: 仅忽略路径段含 `node_modules` / `.git` (及明确噪声), 不忽略 `.claude/.codex/.agents`。保留对 watched 根的监听。
- 验收: `getAssetWatchPaths` 返回的根 (含 .claude) 不被 ignore 谓词命中; node_modules/.git 命中。

### R3 samePath 平台/locale 一致
- `samePath` 改为 win32 → `toLowerCase()` (非 locale), 其它平台精确比较 (与 `scanner.ts normalizePath` 一致)。抽共享 helper 或就地对齐。
- 验收: 非 win32 大小写不同路径 不相等; win32 相等。

### R4 runRefresh scanner 代际守护
- runRefresh 开头 `const scanner = this.scanner`; 后续 sources/candidates/projectDir 全用捕获的 `scanner`。完成提交前若 `this.scanner !== scanner` (期间被换), 放弃本次写 (保留 setProjectDir 已服务的快照)。
- 验收: 单测 — scanAll resolve 前 setProjectDir('/other'), 最终 snapshot 不混用旧 assets+新 dir。

### P1 partial 去 raw
- onPartial 的 assets 映射剥离 `raw` (`{...a, raw: undefined}` 或 omit)。最终 snapshot (done) 仍保留 raw。
- 验收: partial.assets 每项 `raw===undefined`; 最终 snapshot 有 raw。

## 测试矩阵
| 项 | 测试文件 | 断言 |
|---|---|---|
| C1 | tests/unit/scan-coverage.test.ts (新) | output-styles user+project 扫到 |
| C2 | 同上 | `**/SKILL.md` 只 1 skill + 父目录名 |
| O1 | 同上 | 坏 settings.json → ctx.errors |
| O2 | tests/unit/session-observability.test.ts (新) | malformedLineCount / 读失败 errors |
| O3 | scan-coverage | glob 错 → ctx.errors |
| R1 | scan-coverage | TOCTOU 删文件不抛 + errors |
| R3 | tests/unit/engine-scanner 或新 | 平台 samePath |
| R2 | tests/unit/asset-watcher.test.ts (新) | ignore 谓词 |
| R4 | tests/unit/agent-asset-runtime.test.ts | 代际守护 |
| O4/P1 | asset-worker-host / app-store | errorCount 透传 / partial 去 raw |

## 不做 (Tier-2 → issues)
P2/P3/P4/P5/R5 — 见 01-ANALYSIS, archive 时写 docs/issues。
