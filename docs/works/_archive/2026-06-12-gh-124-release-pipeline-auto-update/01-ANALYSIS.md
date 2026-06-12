# 需求分析 (Explore 产物)

> 2026-06-12。来源: 00-PRD.md。bobcorn 参考形态已在 PRD 快照; 本文为 berth 侧适配事实与定界。

## 现状理解

### 关键定界: macOS 未签名 × 自动更新 (官方 primary source 已核)
- electron-builder 官方 auto-update 文档明文: **"macOS application must be signed in order for auto updating to work"**; `latest.yml` / `latest-mac.yml` / `latest-linux.yml` 随打包生成并须随 release 发布。
- berth mac 为 `identity: null` 未签名 (electron-builder.yml:28, 签名 issue 2026-06-04 既有跟踪) → **定界: win/linux 全自动更新; mac 降级为"检查新版 + 引导前往 Releases 下载"** (checkForUpdates 仅拉 latest-mac.yml 比版本不触 Squirrel.Mac, 包 try-catch; download/install 在 mac 上禁用)。签名 issue 解决后升级 mac 全自动 (届时仅放开平台分支)。
- Windows: electron-updater 对未签名应用无此硬限制 (校验只在签名存在时执行), nsis 目标全功能。

### berth 侧现状与契约面
- `electron-builder.yml`: **publish 字段缺** (latest*.yml 生成依赖 publish provider 配置) → 增 `publish: {provider: github, owner: Caldis, repo: berth}`; win nsis+portable / mac dmg+zip / linux AppImage+deb 目标齐备; 加法白名单 files 不动。
- `ci.yml` (test gate 复制基准): pnpm/action-setup@v6 9.15.4 + setup-node@v5 node20 + frozen-lockfile + lint/typecheck/test/包三连/harness:check/build。**release gate 不含 e2e** — macOS teardown flaky 两日三中 (issue 在册) 会卡死发布, 常规 CI 已覆盖 e2e。
- IPC: 新通道必须四方同批 (IpcChannels/IpcEvents 表 + handlers + preload + tests/setup mock, ipc-contract/ipc-registration 对账强制)。
- electron 值 import 白名单 (index/dev-instance/devtools/ipc): updater 装配采用 log.ts/url-guard 同款"中立件 + 白名单文件接线"模式 — `src/main/updater.ts` 不 import electron 本体, BrowserWindow 推送经注入 send 回调 (index.ts 既有 progressListener broadcast 先例), `ipcMain.handle` 在 ipc/handlers.ts 加 update 域。`electron-updater` 包 import 不在白名单字面内 (它非 'electron'), 装配按中立件设计获得可直测性。
- 设置页落点: settings-content.tsx About 区已有版本展示 (`platformInfo.version` ← app.getVersion, 267-280 行) → 更新 UI 自然扩展于此。
- i18n: 新文案 en/zh 双语对称 (App 仅 en/zh)。

### bobcorn → berth 通道映射 (风格适配)
- bobcorn send 型 4 通道 (check-for-update/download-update/install-update/sync-update-preferences) + 6 事件通道 → berth invoke 风格: `update:check` / `update:download` / `update:install` / `update:get-preferences` / `update:set-preferences`; 推送聚合为**单事件通道 `update:state`** (payload: phase ∈ idle|checking|available|not-available|downloading|downloaded|error + version/notes/percent/error/platformLimited) — 少通道更贴 berth 单一真源表与对账维护面。
- 偏好: 独立小模块 (autoDownload: boolean; allowPrerelease 渠道暂不做 — berth 无 beta 流程, Simplicity), 持久化 userData JSON (bobcorn update-preferences 同模式)。
- dev 验证: `forceDevUpdateConfig` + `dev-app-update.yml` (bobcorn 同款) — 不打真 Release 即可真机验证 check 链路。

### release.yml (bobcorn 三阶段 → berth 适配)
- 触发 tag `v*`; Phase1 test gate (ubuntu, ci.yml 套件减 e2e); Phase2 matrix win/mac/linux `electron-builder --publish never` (fail-fast: false, 产物存在性校验, upload-artifact; mac 无 CSC secrets 未签名); Phase3 publish (artifact 三平台齐验 → changelog 萃取 feat/fix/其余 + fallback → 清残留 draft → `gh release create` → 资产上传含 **latest*.yml + blockmap** → release 完整性校验)。
- berth 资产名: berth-{v}-setup.exe / "Berth {v}.exe" (portable) / berth-{v}.dmg / Berth-{v}-arm64-mac.zip / AppImage / deb; macos-latest runner 为 arm64, 与 v0.1.1/v0.2.0 资产先例一致。

## 关联与依赖
- GH-119 加固不回退: updater 主进程侧下载, 不触 sandbox/permission/导航守卫; mac"前往下载页"外链是 https 经 url-guard 放行。
- GH-123 刚手工发 v0.2.0: workflow 上线后下个 tag 即 CI 发布; 既有 v0.2.0 release 的 latest*.yml 缺失 (手工发布未传) — **dev check 链路验证可用 dev-app-update.yml 指向 repo, 或在 v0.2.0 release 补传本机已产的 dist/latest.yml** (explore 时本机 dist 有 blockmap, latest.yml 生成依赖 publish 配置 — AC-2 实证后判断)。
- blast radius: .github/workflows/release.yml (新) · electron-builder.yml (+publish) · package.json (+electron-updater) · src/main/updater.ts (新) + index.ts 接线 + ipc/handlers.ts update 域 · shared/types/ipc.ts 表 · preload · settings-content.tsx + i18n en/zh · tests (对账 + updater 单测 + setup mock)。

## 任务分类与 debt 校准
- type: feature / user-request 维持; estimate 4/1/3 cross-process/high/[tooling-ci] 维持; **confidence low→medium** (mac 限制官方定界 + 通道映射 + 装配模式全落定)。revision 记 INDEX。

## 验收标准
1. **AC-1 release.yml**: tag v* 触发三阶段; test gate 绿才进 matrix; 三平台产物齐验后才 publish; release 含全平台资产 + latest.yml/latest-mac.yml/latest-linux.yml + blockmap; 完整性校验步骤通过。
2. **AC-2 publish 配置**: electron-builder.yml publish github; 本机 `pnpm package:win` 产 dist/latest.yml (yml 生成实证)。
3. **AC-3 updater 主进程**: src/main/updater.ts 中立件 (零 electron import, 可直测); win/linux 全自动 (autoDownload 按偏好, autoInstallOnAppQuit); **mac 平台分支: check 可用 + download/install 拒绝并标记 platformLimited** (单测钉死); 错误不裸吞 (log + state 推送)。
4. **AC-4 IPC 四方同批**: 5 invoke 通道 + update:state 事件入表; ipc-contract/ipc-registration 对账绿; setup mock 同步。
5. **AC-5 renderer**: settings About 区更新卡 — 当前版本/检查按钮/状态/进度/重启安装/autoDownload 开关; mac 显示"前往下载页"; en/zh 对称。
6. **AC-6 dev 链路真机**: dev-app-update.yml + forceDevUpdateConfig 下 dev 实例 check 链路真跑, update:state 状态机可观测。
7. **AC-7 门禁**: typecheck/lint/test 全量 + 对账 + CI 绿; release.yml 推送后 workflow 解析无错。
8. **AC-8 实弹路径明确**: 文档化"下个 tag 即 CI 发布"操作序 (verify 不强制实弹发版; 以 workflow 静态完备 + dev check 链路真跑为证)。

## 界面质量与交互验收
设置 About 区更新卡: 沿 About 行风格 (HeroUI 控件); 状态全覆盖 (idle/checking/available/downloading %/downloaded/error/mac-limited); 按钮禁用态 (checking/downloading 中); i18n en/zh; verify 真机截图走查。

## 未决问题
- 无阻塞项。Q1 推送式 update:state (progressListener 先例) 已定; Q2 autoDownload 默认 false (保守知情) 已定, verify 后可按用户反馈调。

## 旁支发现
- v0.2.0 release 缺 latest*.yml (手工发布) — 本任务 AC-2 落地后顺手补传本机 win 的 latest.yml 可让存量 v0.2.0 即刻可被 check 发现 (录入 PLAN 收尾项, 非阻塞)。
