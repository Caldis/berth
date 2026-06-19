# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: docs/issues 2 项 (用户 2026-06-19 明确要求全部修 + 验证 + 发版) · GH-141

## 正文

### 问题 1: scan-helper 过早 exit code 0 (BUG)
来源: `docs/issues/2026-06-18-BUG-scan-helper-exits-code-0-mid-scan.md`
- scan-helper utilityProcess (`src/main/scan-helper.ts`) 设计 long-lived, 但运行日志频繁 `[asset-runtime] Error: Asset scan helper exited with code 0`; `src/main/helper-host.ts` 的 `onExit` reject 整轮 scan; DB scan-history 出现 `ok=0`。
- 假设 (待 explore 实机验证, **非结论**): utilityProcess event loop 未被 `parentPort.on('message')` ref 住而空转退出 / 被回收 / graceful OOM。

### 问题 2: watcher 对 session 全量重扫 (IMPROVEMENT)
来源: `docs/issues/2026-06-18-IMPROVEMENT-watcher-full-rescan-on-session-write.md`
- `applyWatchEvent` (`packages/berth-scan-engine/src/engine/assets/watch-wiring.ts`): session `deriveAssetsForPath` 返回 null → `scheduleRefresh({reason:'watcher'})` 全库全量 scan。
- session 占 73% 资产 (968/1319); 每次会话写入触发全量重扫 (GH-140 实测 scan-history 49/50 为 watcher 全量, 3-6s/次, 偶发 22.9s)。

## 验收
1. helper 不再中途 exit, scan 不因此失败 (scan-history `ok=1`)。
2. session 文件变更走增量 (单 session re-parse + fold by sourceKey), 不触发全库全量 scan。
3. 真跑验证 (日志 / CDP / scan-history 观察) 无问题后发版 (patch bump)。

## 原文 (用户)
> 全部修, 验证, 无问题后提交发版
