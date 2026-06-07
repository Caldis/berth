#1 [正确性/并发][严重度 高][置信度 高] 项目切换会混写旧扫描结果 — src/main/engine/assets/runtime.ts:330 — `runRefresh` 扫描后又读当前 `this.scanner`，`setProjectDir` 可在等待期间替换 scanner，导致旧 assets 配新 sources/projectDir — 捕获本次 scanner/projectKey，完成前校验，不匹配就丢弃或重新扫。  
#2 [性能][严重度 中][置信度 高] worker partial 反复传全量资产 — src/main/engine/scanner.ts:91 — 每个 adapter 后发送累计 `assets`，且不少资产带 `raw`，structured clone 成本随资产量放大 — partial 改为增量、摘要，或至少去掉 `raw`。  
#3 [性能][严重度 高][置信度 高] session JSONL 全量读入内存 — src/main/adapters/claude-code/parsers.ts:708 — 大 transcript 每次 cache miss 都 `readFileSync` 后 `split` 全文件 — 改为流式逐行解析，或只读取可用于摘要的窗口。  
#4 [可观测性/正确性][严重度 高][置信度 高] session 解析失败被伪装成正常资产 — src/main/adapters/claude-code/parsers.ts:712 — 坏 JSON 行直接 `continue`，整文件读失败也空 catch，调用方拿不到错误 — 记录坏行计数/读失败到 meta 或抛给 scanner。  
#5 [可观测性][严重度 高][置信度 高] settings/config JSON 解析错误被静默吞掉 — src/main/adapters/claude-code/parsers.ts:1088 — `readSettingsJson` 返回 null，hooks/permissions/env/statusline 全部变成“没有配置” — 区分缺文件和坏 JSON，坏 JSON 要进入 ScanError。  
#6 [可观测性][严重度 中][置信度 高] Claude glob 失败无诊断 — src/main/adapters/claude-code/scanner.ts:57 — `safeGlob` catch 后返回空数组，权限/路径/符号链接问题无法定位 — 让 safeGlob 接收 ctx 并写入 `ctx.errors`。  
#7 [正确性/并发][严重度 中][置信度 高] glob 后 stat 存在 TOCTOU 崩溃点 — src/main/adapters/claude-code/scanner.ts:501 — 文件在 `safeGlob` 后被删或权限变化，`fs.statSync` 在 safeScan 外会中断扫描 — stat 放进 try，失败写 ScanError 后跳过。  
#8 [性能][严重度 中][置信度 高] session cache 每轮跨 worker 完整拷贝 — src/main/engine/assets/worker-host.ts:119 — `sessionCache` snapshot 作为 workerData 传入，完成后又完整传回，资产多时两次 structured clone — 用长驻 worker、主进程 cache 查询协议，或只传变更 fingerprint。  
#9 [正确性][严重度 中][置信度 高] cache key 未做路径归一化 — src/main/engine/assets/file-cache.ts:49 — Map 用原始 `filePath`，Windows 大小写/分隔符/realpath 差异会导致 cache miss 或重复条目 — 统一 normalize/realpath，Windows 下大小写折叠。  
#10 [平台差异][严重度 中][置信度 高] 路径比较无条件小写 — src/main/adapters/claude-code/parsers.ts:467 — `samePath` 在非 Windows 也把大小写不同路径视为同一路径，可能误匹配 disabled hook sidecar — 只在 win32 小写，其他平台用 resolved/realpath 精确比较。  

最该优先修：#1 项目切换竞态、#3 大 JSONL 全量读、#5 坏配置静默消失。  
