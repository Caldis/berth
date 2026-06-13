# 需求分析 (Explore 产物)

> GH-134。建立在 GH-124 自动更新流水线之上。本次三项: (A) 自动更新开关 (auto-check + beta 渠道); (B) macOS 签名 zip 发布 (参考 bobcorn); (C) 版本 bump 0.2.0→0.3.0 并发布。

## 现状理解

### A. 自动更新接线 (GH-124 已落地)
- **main 控制器** `src/main/updater.ts`: `createUpdaterController` 注入 `autoUpdater`(electron-updater)/platform/prefs/emit/log, electron-free 可测。
  - `limited = platform === 'darwin'` **无条件**把所有 macOS 视为 `platformLimited`: check 可用, download/install 被拒 (UI 跳转 releases 页)。注释明写 "Lift the branch once the signing issue is resolved" → **本任务 B 完成后须解除**。
  - `autoInstallOnAppQuit = true` (硬编码); `autoDownload = !limited && prefs.autoDownload`; dev 模式 `forceDevUpdateConfig=true`。
  - `applyPreferences(prefs)` 当前只重设 `autoDownload`。
- **偏好持久化** `src/main/update-preferences.ts`: JSON 存 userData; `DEFAULT_UPDATE_PREFERENCES = { autoDownload: false }`; 仅校验 `autoDownload` 布尔。
- **启动检查** `src/main/index.ts:261`: `setTimeout(() => updaterController.check(), 5000)` **无条件**触发 (= 当前的"自动检查"行为, 用户要的开关需让它可关)。控制器在 `index.ts:246-258` 构造, `readUpdatePreferences(userDataDir)` 传入。
- **IPC 契约** `packages/berth-scan-engine/src/shared/types/ipc.ts`:
  - 通道 (已存在, 无需新增): `update:check` / `update:download` / `update:install` / `update:get-preferences` / `update:set-preferences`; 事件 `update:state`。
  - `UpdatePreferences { autoDownload: boolean }` ← **扩展点**。
  - `UpdateState { phase; version?; notes?; percent?; error?; platformLimited? }`。
- **handlers** `src/main/ipc/handlers.ts:123-147` `registerUpdateHandlers`: set-preferences → `writeUpdatePreferences` + `controller.applyPreferences`。泛型透传, 加字段无需改 handler 签名。
- **preload** `src/preload/index.ts:87-96` `update.*`: 泛型 `IpcChannelArgs<'update:set-preferences'>[0]` 透传, 加字段自动覆盖。
- **renderer hook** `src/renderer/src/hooks/use-update.ts`: 暴露 state/preferences/check/download/install/setAutoDownload。
- **renderer UI** `src/renderer/src/components/settings/update-section.tsx`: Settings→About 卡片, 状态文案 + 动作按钮 + autoDownload Switch (HeroUI `Switch`)。
- **i18n** `src/renderer/src/i18n/locales/{en,zh}.json` `settings.update.*` (12 键)。

### B. 打包 / 发布流水线
- `electron-builder.yml`: `mac.identity: null` (固化禁用签名自动发现, 等效 `CSC_IDENTITY_AUTO_DISCOVERY=false`), `mac.notarize: false`, `mac.target: [dmg, zip]` (**无 arch 指定** → 跟随 runner 架构, macos-latest 现为 arm64 → 仅出 arm64)。`publish: {provider: github, owner: Caldis, repo: berth}`。
- `.github/workflows/release.yml` (tag `v*` 触发): test gate → win/mac/linux matrix `electron-builder --publish never` → publish job (全平台齐验 → changelog → gh release create + 上传)。
  - mac build step **未注入任何签名 env**; upload-artifact 与 release upload globs **已含 `*-mac.zip` + blockmap**; 但 build 校验 `expected: '*.dmg'`、publish 校验 + integrity 校验**只查 dmg/latest-mac.yml, 不查 zip**。
  - changelog 尾注硬编码 "Unsigned builds (win/mac); macOS auto-update requires signing and is link-only for now." → 签名后须改。
- **实际发布现状 (关键)**: `v0.2.0` release 实际**只有 Windows 资产** (`berth-0.2.0-setup.exe` / `.exe.blockmap` / `Berth.0.2.0.exe` portable / `latest.yml`), **无 mac/linux 资产**。release.yml 修改时间 (Jun 12 17:27) 晚于 v0.2.0 发布 (Jun 12 07:40) → **当前三平台 release.yml 从未真正端到端跑过一次完整发布**。即"增加 mac release" 的根因是: 既有 release 根本没 mac 产物, 且 mac 签名链路未接。

### C. bobcorn 参考形态 (D:/Code/bobcorn, 同作者)
- 签名/公证: `package.json` build `mac: { notarize: true, target: [dmg(x64,arm64), zip(x64,arm64)] }`, **无自定义 entitlements** (靠 electron-builder 默认 hardenedRuntime + 默认 entitlements)。
- CI 签名 env (release.yml mac step): `CSC_LINK=secrets.MAC_CERTS` (base64 .p12 Developer ID Application), `CSC_KEY_PASSWORD=secrets.MAC_CERTS_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`。mac 与非 mac 分两个 step (mac step 多带签名 env)。
- electron-builder 25 的 `notarize: true` 走内置 notarytool (用上述 APPLE_* env)。

## 外部 SDK 契约 (官方核实, 不变量 9)
- **macOS 必须签名才能自动更新** (Squirrel.Mac 要求); 更新器下载 **zip** (非 dmg), `latest-mac.yml` 指向 zip; **zip 必须签名+公证** 否则更新被拒。zip 是 mac 默认 target 之一, 缺则 latest-mac.yml 无法生成 → autoUpdater 报错。来源: electron.build/auto-update, electron docs。
- **`allowPrerelease`** (AppUpdater, **GitHub provider 专属**): "Whether to allow update to pre-release versions." 默认: app version 含 prerelease 段 (如 0.12.1-alpha.1) 则 true, 否则 false; 为 true 时 `allowDowngrade` 自动 true。→ **beta 渠道开关 = `allowPrerelease`**。
- **`channel`** setter: 覆盖配置中的 channel 并自动设 `allowDowngrade=true`。berth 用 GitHub prerelease 机制 (release.yml 已把 `v*-beta*`/`*-alpha*` 标 `--prerelease`), 故**无需**额外 beta.yml/alpha.yml channel 文件, 用 `allowPrerelease` 即可。
- **`autoDownload`** 默认 true (berth 覆盖为 pref 驱动); **`autoInstallOnAppQuit`** 默认 true (berth 显式 true); **`checkForUpdates()`** "Asks the server whether there is an update."
- 来源: https://www.electron.build/auto-update · https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/electron-updater/src/AppUpdater.ts · electron-builder issue #4988 (allowPrerelease + channels)。

## 关联与依赖
- A (开关) 与 B (签名) **解耦**: A 是纯代码 (main+renderer+types), 完全可本机测试, 不依赖 secrets; B 依赖 macOS runner + Apple 凭据, 本机 Windows 无法验证打包。
- B 完成 (签名链路通) 才能安全解除 updater 的 `platformLimited` 分支; 否则 mac 用户点 download 会失败。lift 必须与签名 release **同版本**发布。
- C (bump+发布) 是 A+B 的收口动作; tag `v0.3.0` 触发 release.yml。
- mac 0.2.0→0.3.0 **无法自动更新** (0.2.0 无 mac 资产); mac 自动更新实际从 0.3.0→0.3.1+ 起生效, 属预期。

## blast radius (符号边界)
- `UpdatePreferences` 类型引用点: `update-preferences.ts` (读写+默认值), `updater.ts` (`applyPreferences` 形参), `handlers.ts` (get/set 返回与入参), `use-update.ts` (hook 状态), `update-section.tsx` (UI), preload (泛型透传)。加字段需同步: 默认值、校验、`applyPreferences` 接线、hook setter、UI Switch、i18n。
- `platformLimited` 引用点: `updater.ts` (产出), `use-update.ts`/`update-section.tsx` (消费分支)。解除后这些分支逻辑保留 (作为 limited 仍可能为其他原因 true 的兜底) 但 darwin 不再无条件 limited。
- release.yml / electron-builder.yml: 隔离的 CI/打包配置, 不影响运行时代码。
- 非 UI 数据流改动, 不触碰 GH-119 sandbox/permission/导航守卫。

## 任务分类与 debt 校准
- type: feature; maintenance.subtype: 不适用。
- source.kind: user-request; refs: issue #134 / GH-124 archive / 2026-06-04 signing issue / bobcorn。
- debt estimate 修正: incurred 5 → 5 (维持), repaid 2 → 2 (解除 platformLimited 降级 + 补齐 mac release 缺口, 偿还既有 signing debt), net 3。
- scope: cross-process (维持); risk: high → **medium** (explore 后: A 部分清晰低风险纯代码; 残余高风险集中在 B 的 mac 签名, 且外部凭据阻塞已识别); areas: [tooling-ci] (维持); confidence: low → **medium**。
- revision: 见 INDEX `debt.revisions[]` (explore 校准 confidence/risk)。

## 验收标准 (逐条编号)
1. **自动检查开关**: `UpdatePreferences.autoCheck` 字段落地, 默认 `true` (保留现状); 关闭时 `index.ts` 启动不触发 `updaterController.check()`; 开启时维持 5s 后检查。偏好持久化 + 读取校验覆盖新字段。
2. **beta 渠道开关**: `UpdatePreferences.allowPrerelease` (或等价 `channel: 'stable'|'beta'`) 落地, 默认 `false` (稳定渠道); 开启时 `autoUpdater.allowPrerelease = true`, `applyPreferences` 接线; 关闭回 false。
3. **设置 UI**: `update-section.tsx` 新增"启动时自动检查"与"接收测试版(beta)"两个 Switch, 复用现有 HeroUI `Switch` 样式与密度; en/zh i18n 文案齐备; 有 `data-testid`。
4. **IPC 不破契约**: 通道键集不变 (仅扩展 `UpdatePreferences` payload); `tests/unit/ipc-contract.test.ts` 仍绿。
5. **macOS 签名 zip 发布**: `electron-builder.yml` mac 改为可签名 (移除 `identity: null` 由 CSC_LINK 自动发现身份 / `notarize: true`); `release.yml` mac build step 注入 bobcorn 同名 5 个签名 env (条件: secrets 存在); 产物含**签名+公证后的 `*-mac.zip` + `latest-mac.yml`**; release integrity 校验**新增 mac zip 存在性检查**。
6. **解除 platformLimited**: 签名链路通后 `updater.ts` 不再无条件把 darwin 设为 limited; changelog 尾注的 "unsigned/link-only" 文案相应更新。
7. **版本发布**: `package.json` version `0.2.0`→`0.3.0`; tag `v0.3.0` 触发 release.yml; 最终 GitHub Release 含 win(.exe)+mac(.dmg+.zip 签名)+linux(.AppImage/.deb) 全平台资产 + `latest*.yml` 三件。
8. **测试**: `update-preferences` / `updater-controller` / `settings-update` 三测试套件覆盖新字段与新开关行为; 全套 `pnpm test` + `pnpm lint` + `pnpm typecheck` 绿。

## 界面质量与交互验收
- **现有结构**: Settings → About 卡片内 `UpdateSection`, `mt-3 space-y-3 border-t pt-3`。两行布局: 第一行 (状态文案 + 右侧动作按钮), 第二行 (autoDownload 文案 + 右侧 Switch, `justify-between`)。
- **设计系统**: HeroUI `Button`(size sm, variant flat/color primary) + `Switch`(size sm)。图标 lucide `Download`/`RefreshCw`。文案 `text-xs text-muted-foreground`。
- **信息密度**: 紧凑卡片内嵌区块; 新增 2 个开关须延续 `justify-between` + `text-xs` 行模式, 不破坏密度。
- **用户路径**: 设置面板 → About → 更新区块 → 切换开关 (即时持久化, 无需保存按钮, 沿用 autoDownload 模式)。
- **可见状态**: 开关 selected/unselected; beta 开关开启后下次 check 可能出现 prerelease 版本 (状态文案复用 available)。
- **交互反馈**: Switch `onValueChange` 即时写偏好 (乐观更新本地 state, 与 setAutoDownload 一致)。
- **可访问性**: 每个 Switch 须有 `aria-label`; 沿用现有模式。
- **响应式**: 卡片宽度自适应, 文案 + 右侧控件两端对齐, 无新增风险。
- **i18n**: 新增键须 en + zh 同批; 文案语气与现有 `settings.update.*` 一致。
- **验收方式**: 开关行为属确定性可测 (testing-library 断言 Switch 状态 + setPreferences 调用); 视觉密度变化较小, verify 阶段截图请用户确认更新区块新布局。

## 未决问题 (留给 design 向人澄清)
1. **[阻塞前提] Apple 签名 secrets**: `gh secret list --repo Caldis/berth` 证实 berth 仓库**当前无任何 secret**。mac 签名需用户手动把 5 个 secret 加到 berth 仓库 (`MAC_CERTS` / `MAC_CERTS_PASSWORD` / `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`); secret 值 GitHub 永不回显, 无法从 bobcorn 拷贝, Agent 不可代办。→ 需向用户确认: 是否/何时添加? 在添加前发 0.3.0, mac 签名步骤应"secrets 缺失时优雅降级 (出未签名 zip, 不 hardfail)" 还是 "阻塞发布直到 secrets 就绪"?
2. **beta 开关语义**: 用 `allowPrerelease` 布尔 (简单, 匹配 release.yml 现有 prerelease 标记) 还是 `channel: stable|beta` 枚举 (更显式, 但需 channel yml 支持)? 倾向 `allowPrerelease`。
3. **mac 架构**: 跟 bobcorn 出 x64 + arm64 双架构 (2 zip + 2 dmg), 还是只出 arm64 (runner 默认) / universal? 倾向跟 bobcorn 双架构。
4. **0.3.0 是否走 beta 预发布**先验证签名链路 (`v0.3.0-beta.1`), 还是直接 `v0.3.0` 正式发布?
