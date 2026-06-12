# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (T2 依赖 T1 契约, T4 依赖全部)。

- [x] T1 契约 + 主进程装配 (AC-2/3/4) — DONE: 类型+5 通道+update:state 入表, updater.ts 依赖全注入中立件 (9 直测: 事件归一/偏好/错误/darwin 降级/dev config) + update-preferences (含损坏回退), handlers update 域经 lazy holder (registerAllHandlers 无参保持) + index.ts broadcast 接线 + 启动延迟 check, preload/mock 四方同批 (对账绿), builder publish 配置, electron-updater 入 deps (本机 .pnpm 70 断链 junction 阻 postinstall — 全量扫清根治, friction 已记); typecheck/lint/全量 1070 绿; latest.yml 实证随后台 package:win 出
  - 内容: shared/types/ipc.ts 增 UpdatePreferences/UpdateState + 5 invoke + update:state; src/main/update-preferences.ts (新); src/main/updater.ts (新, 依赖全注入中立件); ipc/handlers.ts registerUpdateHandlers; index.ts 接线 (electron-updater import + broadcast emit + 启动延迟 check); preload update 域; tests/setup.ts mock 同步; electron-builder.yml publish; package.json electron-updater 入 dependencies; 本机 package:win 实证 dist/latest.yml。
  - tests: updater-controller.test.ts (事件归一/mac 分支/偏好/错误) + update-preferences.test.ts + 对账两件绿 + 全量。
  - verify: typecheck/lint/test 绿; latest.yml 实证。
- [ ] T2 renderer 更新卡 (AC-5)
  - 内容: hooks/use-update.ts (订阅+动作); settings-content.tsx About 下更新卡 (7 状态/按钮禁用态/mac 前往下载页/autoDownload Switch); i18n settings.update.* en/zh。
  - tests: settings-update.test.tsx (phase→文案/按钮/limited 分支) + 全量。
  - verify: 界面验收条目 (状态全显/禁用态/i18n)。
- [ ] T3 release.yml + dev-app-update.yml (AC-1 静态 + AC-6 前置)
  - 内容: .github/workflows/release.yml 三阶段 (SPEC 契约); dev-app-update.yml。
  - tests: not needed - workflow 静态产物; 证据 = push 后 GitHub 解析无错 (Actions 页无语法报错) + 本地 YAML lint。
  - verify: AC-1 结构核对 (gate→matrix→publish 依赖链/齐验/完整性步骤)。
- [ ] T4 收口 (AC-6/7/8)
  - 内容: dev 实例真机 check 链路 (CDP 观测 update:state 状态机) + 更新卡截图走查 (≥3 态); 全量门禁 + prepush/push/ci:wait; v0.2.0 release 补传本机 latest.yml (旁支, 让存量版本可被 check 发现); AC-8 操作序写入本 PLAN 收尾 (下个 tag 即 CI 发布)。
  - tests: 门禁全量。
  - verify: AC1-8 逐条; debt.final 回填。

## 实弹发布操作序 (AC-8, T4 填证后生效)
1. 版本 bump + commit + push (CI 绿)。
2. `git tag vX.Y.Z && git push origin vX.Y.Z` → release.yml 自动: test gate → 三平台打包 → Release 创建 + 全资产 (含 latest*.yml)。
3. 已装应用 (win/linux) 在设置-更新里自动/手动发现新版; mac 用户经"前往下载页"。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
