# 描述
scan-helper utilityProcess (`src/main/scan-helper.ts`) 设计为 long-lived (完成一次 scan 后存活, 等下一条 `scan` 消息复用 warm 进程), 但运行日志显示它频繁 `exit code 0` 中途退出, 触发 `src/main/helper-host.ts:119` 的 `onExit` → reject → `[asset-runtime] Error: Asset scan helper exited with code 0`。对应 scan-history 出现 `ok=0` 失败记录。code 0 = clean exit (非 crash), 与 "long-lived 应保持存活" 的设计相悖。

# 重现步骤
- 正常使用 berth (后台 watcher 持续触发全量 scan)。
- 观察 `~/Library/Application Support/berth/logs/main.log`。

# 预期结果
- long-lived helper 在 `post('done')` 后保持存活; host 收到 `done` 正常 resolve, 不出现进程退出与整轮 scan reject。

# 实际结果
- main.log 在 2026-06-16 ~ 2026-06-18 多次出现 `[asset-runtime] Error: Asset scan helper exited with code 0` (在收到 `done` 之前退出 → `onExit` reject 整轮 scan)。
- DB scan-history 最近一条 manual scan `ok=0` (5237ms 后失败)。
- helper 在 scan 完成前 clean-exit, 而非保持存活。根因待查: utilityProcess 的 event loop 是否被 `parentPort.on('message')` ref 住 / 被回收 / graceful OOM。

# 解决方案
**已修复** (GH-141, 2026-06-19, commit fcae252; 发版 0.4.2)。根因确证 (Electron 官方 #42978): utilityProcess child 在 **packaged 应用** script 完即退出 (dev 保持运行), `parentPort.on('message')` 不 ref event loop。修复: `scan-helper.ts` 加 `setInterval(()=>{}, 2_147_483_647)` keep-alive ref 住 event loop, helper 在 packaged 真正 long-lived; host `kill()` 仍正常终止。dev e2e 不回归 + 逻辑确证; packaged 发布后观察 main.log 不再 `exit code 0`。
- 归档: `docs/works/_archive/2026-06-19-gh-141-scan-engine-reliability-incremental`
- 来源: GH-140 冷启动慢 explore 时发现。
