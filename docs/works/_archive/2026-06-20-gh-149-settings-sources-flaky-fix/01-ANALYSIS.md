# 01-ANALYSIS — Explore 产物 (经代码核实)

## 机制
`settings-sources.test.tsx` 唯一断言 `findByText('Appearance')` 在**首个 microtask 满足** (i18n 同步), 测试随即结束 + jsdom teardown。但 `<SettingsContent>` 挂载启动 **4 条访问 `window.api` 的 pending promise, 无 mounted/cancelled 守卫或守卫滞后** → promise teardown 后 resolve → 回调读 `window.api` → window undefined → unhandled rejection。断言全过 (1297 绿), 仅 teardown 后泄漏。

## 4 条 mount-time IPC promise (settings-sources 无 ThemeProvider, useTheme no-op, matchMedia 不参与)
1. `settings-content.tsx:82-84` `platform.info().then(setPlatformInfo)` — 无 cleanup / 守卫。
2. `useAgentCapabilityPlugins` (use-ipc.ts:691) → `CachedResource.request` 内部 `.then(set).finally` (cached-resource.ts:58-62) **无守卫始终跑**。
3. `useScanEngineInfo.loadInfo` (use-ipc.ts:341) → `engineInfo()`, await 后才判 mounted。
4. `useUpdate` (use-update.ts:27) → `getPreferences().then(setPreferences)` 无守卫。

"8 个" = 4 链 × (fetcher promise + 派生 .then/.set/.finally 节点), 随每次 drain 进度浮动 (故偶发 8 而非固定)。

## mock 不缺失 (关键, 排除补 mock 路线)
`tests/setup.ts` mock 全: platform.info(:137) / agentPlugins.list(:172) / engineInfo(:158) / getPreferences(:275), **均 resolved 不 reject**。→ 不是 mock 缺失致 `.then(undefined)` 抛; **纯时序** (resolve 晚于 teardown, 回调读 window 报错)。补 mock 无效。

## 同模式连带风险 (重要发现)
`settings-page.test.tsx` + `settings-accent.test.tsx` 渲染**相同 `<SettingsContent>`** (外包 ThemeProvider), 同样这 4 链。当前绿仅因 `findBy` 多 drain 几轮偶然掩盖; settings-accent 纯同步 `getByRole` 用例同样脆弱 → **潜在 flaky 未被点名**。这是 **SettingsContent 挂载路径系统性 effect-cleanup 缺陷**, 非 settings-sources 偶然。
