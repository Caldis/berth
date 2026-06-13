# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (类型改动向上游 ripple, 文件强耦合)。每项完成且目标测试绿后小步提交。

## Phase A — 运行时代码 + 开关 + 解除 platformLimited (本机可测)

- [x] **A1. 扩展 UpdatePreferences 数据契约 + 偏好持久化** [AC1,AC2,AC4,D5] — 提交 2bd0e99(增量)+本提交(删 platformLimited); update-preferences.test 5 用例绿
  - 改 `packages/berth-scan-engine/src/shared/types/ipc.ts`: `UpdatePreferences` 加 `autoCheck`、`allowPrerelease`; `UpdateState` 删 `platformLimited?` + 更新 JSDoc。
  - 改 `src/main/update-preferences.ts`: `DEFAULT_UPDATE_PREFERENCES = {autoCheck:true, autoDownload:false, allowPrerelease:false}`; `readUpdatePreferences` 改 per-field 布尔合并 (旧文件向后兼容), 损坏/非对象→全默认。
  - tests: 扩 `tests/unit/update-preferences.test.ts` — 三字段默认值; 旧 `{autoDownload:true}` → 三字段 (新字段默认); 损坏兜底。`pnpm test update-preferences` 绿。
  - verify: 不适用 (非 UI)。

- [x] **A2. updater 控制器: allowPrerelease 接线 + 移除 darwin 降级** [AC2,AC6,D2] — limited/withLimit/platform 已移除; updater-controller.test 7 用例绿 (含"所有平台真实 download/install")
  - 改 `src/main/updater.ts`: `UpdaterLike` 加 `allowPrerelease`; 构造设 `allowPrerelease`/`autoDownload` (去 `!limited`); 删 `limited`/`withLimit`/download&install 守卫; `applyPreferences` 设两字段。
  - tests: 改 `tests/unit/updater-controller.test.ts` — applyPreferences 设 autoDownload+allowPrerelease; 构造 honor prefs.allowPrerelease; 删 "darwin degradation" 用例, 新增 "darwin 走真实 download/install"; 事件归一化/error 用例保留。`pnpm test updater-controller` 绿。
  - verify: 不适用 (非 UI)。

- [x] **A3. index.ts 启动检查门控 autoCheck** [AC1,D3] — `if (updatePreferences.autoCheck)` 门控; tests:not needed (electron wiring), 偏好持久化已单测
  - 改 `src/main/index.ts:261`: `if (prefs.autoCheck) setTimeout(...)` (复用已读 prefs)。
  - tests: `not needed - electron 启动 wiring 不可单测`; 替代验证: A1 偏好持久化已单测 + 本机 dev 启动观察 (关闭后无启动检查事件)。
  - verify: 不适用 (非 UI 视觉)。

- [x] **A4. renderer hook + 设置 UI 两开关 + i18n** [AC3,AC6] — setPreference 合并; 三开关 (auto-check/auto-download/beta) + en/zh; platformLimited 分支/goToDownloads 已删; settings-update + settings-page 测试绿 (verify 阶段截图待用户确认)
  - 改 `src/renderer/src/hooks/use-update.ts`: 初始 prefs 全默认; `setAutoDownload`→`setPreference(patch)` 函数式合并持久化。
  - 改 `src/renderer/src/components/settings/update-section.tsx`: 加 `update-auto-check`、`update-beta` 两 Switch 行 (同构 autoDownload 行); 删 platformLimited 分支/`update-go-to-downloads`/`RELEASES_URL`/孤儿 import; 三开关用 setPreference。
  - 改 `src/renderer/src/i18n/locales/{en,zh}.json`: 加 `settings.update.autoCheck`/`beta`, 删 `goToDownloads`。
  - tests: 改 `tests/renderer/settings-update.test.tsx` — mock getPreferences 返回三字段; 断言三开关存在; 切换调用 setPreferences 且 payload 正确; available 恒显真实 download (删 platformLimited→link 用例)。`pnpm test settings-update` 绿。
  - verify: 界面质量 — 三开关同构密度/HeroUI 一致/aria-label; available 真实 download; verify 阶段截图请用户确认更新区块新布局。

- [x] **A5. Phase A 全量门禁** [AC4,AC8] — typecheck + lint + 1128 test 全绿 (含 ipc-contract 通道键集不变)
  - `pnpm lint && pnpm typecheck && pnpm test` (含 ipc-contract 通道键集不变); `pnpm --filter @berth/scan-engine typecheck/test` 若涉及。
  - tests: 全套绿即证据。
  - verify: 不适用。

## Phase B — 打包 + 发布流水线 (mac 签名, macOS runner 验收)

- [x] **B1. electron-builder.yml mac 签名 + 双架构** [AC5,D4] — 移除 identity:null; notarize:true; dmg/zip 各 [x64,arm64]; YAML 解析验证通过; tests:not needed (配置), B3 dry-run 全链验收
  - 移除 `mac.identity: null`; `notarize: false`→`true`; mac.target 改 dmg/zip 各 `arch: [x64, arm64]`; 重写策略注释 (签名 + 5 secrets 说明)。
  - tests: `not needed - YAML 配置, mac 打包本机不可跑`; 替代验证: YAML 解析 (harness:check / electron-builder 启动) + B3 dry-run 全链。
  - verify: 不适用 (配置)。

- [x] **B2. release.yml mac 签名 env + zip 校验 + changelog** [AC5,AC7] — 拆 mac/非 mac step (mac 注入 5 签名 env); publish + integrity 加 *-mac.zip 校验; changelog 改"signed & notarized"; YAML 解析验证通过; tests:not needed (CI), B3 dry-run 验收
  - build job 拆 mac/非 mac package step; mac step 注入 5 个签名 env (CSC_LINK/CSC_KEY_PASSWORD/APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD/APPLE_TEAM_ID)。
  - publish "Validate all platforms present" 加 mac `*-mac.zip` 校验; "Verify release integrity" 加 `\-mac\.zip$` 校验; changelog 尾注改签名描述。
  - tests: `not needed - CI workflow`; 替代验证: B3 dry-run。
  - verify: 不适用 (配置)。

## Phase C — 版本发布

- [x] **C1. 版本 bump 0.2.0 → 0.3.0** [AC7] — package.json version=0.3.0; grep 确认无其他硬编码 (测试 fixture 0.2.0 是 agent 插件无关; website APP_VERSION 属独立 deploy-website 链路, 交接提示); tests:not needed (版本号, dry-run 验收)。
  - 注: beta dry-run 从 master@0.3.0 打 v0.3.0-beta.1 (dry-run 验签名/三平台/完整性, 产物版本名无关); 通过后同提交打 v0.3.0。

- [ ] **C2. [需用户前置] 用户添加 5 个 Apple secrets 到 berth 仓库**
  - Agent 不可代办; 交接消息给步骤。push beta tag 前必须就绪。
  - tests: `gh secret list --repo Caldis/berth` 出现 5 个名字。
  - verify: 不适用。

- [ ] **C3. beta dry-run: tag v0.3.0-beta.1 验证签名+三平台全链** [AC5,AC7]
  - secrets 就绪后 push `v0.3.0-beta.1`; 旁路跟踪 release.yml; 确认 GitHub Release (prerelease) 含 win/mac(dmg+签名 zip 双架构)/linux 全资产 + latest*.yml 三件; mac zip 签名+公证。
  - tests: release integrity job 绿即证据 + 人工核对资产清单。
  - verify: 不适用 (发布链路)。

- [ ] **C4. 正式发布 v0.3.0** [AC7]
  - dry-run 通过后 push `v0.3.0` 正式 tag; 确认 Latest release 全平台资产齐备。
  - tests: release integrity job 绿 + 资产清单。
  - verify: 不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
