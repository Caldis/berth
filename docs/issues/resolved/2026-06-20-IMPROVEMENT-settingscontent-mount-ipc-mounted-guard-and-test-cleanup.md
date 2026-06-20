# IMPROVEMENT: SettingsContent 挂载 IPC promise mounted 守卫根治 + 测试 cleanup 标准化

## 背景
GH-149 用 A1 (settings-sources.test.tsx 专属 unmount+flush, commit f1ebc30f) 止血了 settings-sources 的 "window is not defined" teardown flaky。但根因系统性, 以下治理项本次显式 defer:

## 1. SettingsContent 挂载 4 条 IPC promise chain 无 mounted 守卫 (prod 健壮性, 根治 C)
`settings-content.tsx:82` `platform.info().then(setPlatformInfo)` (无 cleanup) + `useAgentCapabilityPlugins` (use-ipc.ts:691, `CachedResource.request` 内部 `.then/.finally` 无守卫) + `useScanEngineInfo.loadInfo` (use-ipc.ts:341, await 后才判 mounted) + `useUpdate` (use-update.ts:27, `getPreferences().then(setPreferences)` 无守卫)。快速 mount/unmount (生产里也可能) 触发 setState on unmounted + teardown 后回调访问 window.api。
**根治**: 4 处加 mounted/cancelled 守卫 (effect return cleanup + 回调判 mounted)。**blast radius 大**: use-ipc/use-update 被 Dashboard/Sessions/Capabilities 共用, 需全 renderer 回归 — 故未混入 GH-149 最小修复。

## 2. 同模式潜在 flaky (settings-page/accent)
`settings-page.test.tsx` + `settings-accent.test.tsx` 渲染相同 `<SettingsContent>` + 同样 4 链, 当前绿仅因 `findBy` 多 drain 偶然掩盖 (settings-accent 纯同步 `getByRole` 用例同样脆弱)。C 根治后这两个也安全; 在 C 落地前若 CI 点名, 各自加 A1 式 unmount+flush。

## 3. 测试 cleanup 标准化 (setup.ts)
`tests/setup.ts` **无 afterEach cleanup** (testing-library 标准实践缺失), render 的组件从不 unmount。加全局 afterEach cleanup + flush 是正解 (覆盖所有同模式), **但约束**: 4 个 renderer 测试用 `useFakeTimers` (memory-view / use-focus-target / collapsible / hooks-lifecycle-view), **全局 afterEach 用 `setTimeout` flush 会撞 fake timer 挂起** → 必须用 `await act(async()=>{})` flush (gate `hasDomEnvironment`, 不用 setTimeout)。这是 GH-149 放弃全局方案 B 的原因。

## 来源
GH-149 (`docs/works/_archive/2026-06-20-gh-149-settings-sources-flaky-fix`) explore+design 显式 defer 的 C/B 治理项。A1 已止血当前 CI 红。

## 收口 (2026-06-20, RESOLVED — v0.4.3)
- **(C) prod 健壮性 DONE** (commit 48cf9eae): `platform.info` (settings-content.tsx) + `getPreferences` (use-update.ts) 两条原未守卫的 chain 加 cancelled 守卫; 另两条 (`useAgentCapabilityPlugins` use-ipc.ts cancelled flag / `useScanEngineInfo` mountedRef) 核实已有守卫, surgical 不重复。
- **(B) 测试 cleanup 标准化 DONE** (commit d327e6e1): tests/setup.ts 全局 afterEach 用 `await act(async()=>{})` flush 微任务 (gate `hasDomEnvironment`, 不用 setTimeout 故不撞 fake timer) — 即本 issue item 3 prescribed 的 fake-timer-safe 方案; RTL auto-cleanup 已处理 unmount。4 个 fake-timer 文件 + 全 1297 测试绿。
- item 2 (settings-page/accent 潜在 flaky) 由全局 (B) 覆盖。
- 结论: 关闭。
