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
- 待查: 确认 helper 退出的精确触发条件; 让 parentPort 监听 ref 住 event loop, 或 host 对中途 exit 做 respawn + retry 而非直接 reject 整轮。
- 来源 / 关联: GH-140 冷启动慢主线 explore 时发现 (`docs/works/2026-06-18-gh-140-cold-start-blocking-load`)。冷启动首扫若同样中途 exit, 会触发失败 + 重试, 进一步加剧首屏等待。边界: 属 scan 可靠性旁支, 不在 GH-140 主线顺手修, 待排期或用户扩大范围。
