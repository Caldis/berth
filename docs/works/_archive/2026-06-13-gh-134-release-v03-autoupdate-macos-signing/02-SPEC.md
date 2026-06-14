# 技术方案 (Design 产物)

> GH-134。决策已澄清 (2026-06-13): (1) **上 mac 签名**, 用户手动加 secrets (我提供步骤); (2) mac 出 **x64 + arm64 双架构**; (3) 发布走 **先 v0.3.0-beta.1 dry-run 再 v0.3.0**。每条回指 01-ANALYSIS 验收标准编号 [AC#]。

## 决策记录
- **D1 [AC2]**: beta 渠道用 `allowPrerelease: boolean` (GitHub provider 专属契约), 不引入 channel 枚举 / beta.yml。release.yml 已把 `v*-beta*` 标 `--prerelease`, allowPrerelease=true 即可让用户接收预发布。
- **D2 [AC6]**: **彻底移除 `platformLimited` 降级机制** (非仅停用 darwin 分支)。理由: 签名后 mac 是一等自动更新平台, "跳转 releases 页" 的降级 affordance 仅为未签名 mac 而存在, 现已消失; 保留字段+UI 分支会留下永不触发的死代码 (ultrareview 会判死)。这是 updater.ts 注释 "Lift the branch once the signing issue is resolved" 的真正落地。
- **D3 [AC1]**: autoCheck 默认 `true` (保留现状"启动自动检查"); 关闭仅跳过 index.ts 的启动期 check, 不影响手动 check 按钮。
- **D4 [AC5]**: mac 签名靠 electron-builder 默认 entitlements + hardenedRuntime (与 bobcorn 一致, **无自定义 entitlements.mac.plist**); `notarize: true` 走内置 notarytool。
- **D5**: 偏好读取做 **per-field 向后兼容合并** (旧 `{autoDownload}` 文件能平滑加载, 新字段取默认), 不再"整体 shape 不符就全默认"。

## 数据契约

### UpdatePreferences (packages/berth-scan-engine/src/shared/types/ipc.ts) [AC1,AC2,AC4]
```ts
export interface UpdatePreferences {
  autoCheck: boolean        // 启动时自动检查; 默认 true
  autoDownload: boolean     // 后台自动下载; 默认 false
  allowPrerelease: boolean  // beta 渠道 (GitHub prerelease); 默认 false
}
```
- 通道键集**不变** (`update:get/set-preferences` 复用), 仅扩展 payload → 四方对账测试不受影响 [AC4]。
- preload / handlers 泛型透传, 无需改签名。

### UpdateState (同文件) [AC6]
- **删除** `platformLimited?: boolean` 字段; 更新 JSDoc (移除 unsigned-macОС 降级描述)。
- 其余 phase/version/notes/percent/error 不变。

### DEFAULT_UPDATE_PREFERENCES (src/main/update-preferences.ts) [AC1,AC2]
```ts
export const DEFAULT_UPDATE_PREFERENCES = { autoCheck: true, autoDownload: false, allowPrerelease: false }
```
- `readUpdatePreferences`: 从默认值起, 对 JSON 中每个**布尔**字段做覆盖 (per-field merge); 缺失/非布尔字段保留默认。损坏/非对象 → 全默认 [D5]。

## 模块结构 / 组件拆分 (遵守 ARCHITECTURE 进程隔离)

### main: src/main/updater.ts [AC2,AC6]
- `UpdaterLike` 接口新增 `allowPrerelease: boolean`。
- 构造时: `autoUpdater.allowPrerelease = preferences.allowPrerelease`; `autoUpdater.autoDownload = preferences.autoDownload` (去掉 `!limited &&`)。
- **移除** `limited` / `withLimit` / download&install 的 limited 守卫; 所有平台走真实 download/install。
- `applyPreferences(prefs)`: 同时设 `autoDownload` 与 `allowPrerelease`。
- check/download/install 错误处理与事件归一化不变。

### main: src/main/index.ts [AC1]
- 启动检查改为门控: `if (prefs.autoCheck) setTimeout(() => void controller.check(), 5000)` (prefs 复用 line 250 已读的 `readUpdatePreferences(userDataDir)`)。

### renderer: src/renderer/src/hooks/use-update.ts [AC1,AC2,AC3]
- 初始 preferences 用全默认 `{ autoCheck:true, autoDownload:false, allowPrerelease:false }`。
- 用单一 `setPreference(patch: Partial<UpdatePreferences>)` 替换 `setAutoDownload`: 函数式 setState 合并 `{...prev, ...patch}` 后 `window.api.update.setPreferences(next)` (避免闭包过期, 保证三字段不互相覆盖)。

### renderer: src/renderer/src/components/settings/update-section.tsx [AC3,AC6]
- 新增两行 Switch (沿用 autoDownload 行: `justify-between` + `text-xs text-muted-foreground` + HeroUI `Switch size sm` + `aria-label` + `data-testid`): `update-auto-check`、`update-beta`。
- autoDownload 行保留; 三个开关共用 `setPreference`。
- **移除** platformLimited 分支与 `update-go-to-downloads` 按钮、`RELEASES_URL` 常量、未用 import (Download 图标若仅 go-to-downloads 用则评估保留, available 真实下载仍用 Download)。

### i18n: src/renderer/src/i18n/locales/{en,zh}.json [AC3]
- 新增 `settings.update.autoCheck`、`settings.update.beta`。
- **移除** `settings.update.goToDownloads` (孤儿)。
- en: autoCheck="Check for updates on launch", beta="Receive beta (pre-release) updates"; zh: "启动时检查更新"、"接收测试版(预发布)更新"。

### packaging: electron-builder.yml [AC5]
```yaml
mac:
  icon: assets/icon/app_icon.png
  notarize: true
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
```
- 移除 `identity: null` (由 CSC_LINK 自动发现 Developer ID 身份); `notarize: false`→`true`。
- 重写未签名策略注释为签名策略 + 所需 5 secrets 说明。

### CI: .github/workflows/release.yml [AC5,AC7]
- build job: 拆 mac / 非 mac 两个 package step (bobcorn 模式)。mac step 注入 `CSC_LINK=secrets.MAC_CERTS`、`CSC_KEY_PASSWORD=secrets.MAC_CERTS_PASSWORD`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`; 非 mac step 仅 `GITHUB_TOKEN`。
- publish "Validate all platforms present": 新增 `release-mac/*-mac.zip` 存在校验。
- "Verify release integrity": 新增 `\-mac\.zip$` 资产校验。
- changelog 尾注改为 "Windows builds are unsigned; macOS builds are signed & notarized." (win.sign 仍 false, 照实)。

### version: package.json [AC7]
- `0.2.0` → `0.3.0`。implement 末步执行; 先 grep 确认无其他硬编码 0.2.0 版本引用 (scan-engine 包版本独立, 不动)。

## 前置条件 (用户操作, 不可由 Agent 代办)
向 berth 仓库添加 5 个 secret (与 bobcorn 同名同源, 可复用同一 Developer ID 证书与 Apple 凭据):
1. `MAC_CERTS` = base64 of exported `Developer ID Application` .p12
2. `MAC_CERTS_PASSWORD` = .p12 导出密码
3. `APPLE_ID` = Apple 开发者账号邮箱
4. `APPLE_APP_SPECIFIC_PASSWORD` = appleid.apple.com 生成的 app-specific password
5. `APPLE_TEAM_ID` = 10 位 Team ID
→ 详细步骤在交接消息给出。必须在 push `v0.3.0-beta.1` tag **之前**完成, 否则 mac build 因 notarize 缺凭据失败 (dry-run 会暴露)。

## 任务分类与 debt
- type: feature; maintenance.subtype: 不适用。
- source.kind: user-request; refs: issue #134 / GH-124 / 2026-06-04 signing issue / bobcorn。
- debt.estimate: incurred 5 / repaid 2 / net 3, scope cross-process, risk medium, areas [tooling-ci], confidence medium (explore 已校准, 见 INDEX revisions)。design 不再变更估算。
- debt.final 预期: 偿还集中在解除 platformLimited 死分支 + 补齐 mac release 缺口; verify 后据实填。
- Project 字段同步: ensure 已置 In Progress; archive 时 done。

## 界面质量与交互验收
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 在现有 UpdateSection 内 autoDownload 行下方追加 2 行同构 Switch 行; 保持 `space-y-3` 紧凑密度 | renderer 测试断言三个 data-testid 存在; verify 截图请用户确认密度 |
| 组件选择 / 设计系统一致性 | 复用 HeroUI `Switch size sm` + `text-xs text-muted-foreground`, 与 autoDownload 完全一致 | 代码评审 + 截图 |
| 交互反馈 / 状态切换 | `onValueChange` → `setPreference` 乐观更新本地 state 即时持久化, 无保存按钮 (沿用现状) | renderer 测试断言 setPreferences 被调用且 payload 含正确字段 |
| loading / empty / error / disabled / focus | 开关无 loading/disabled 态 (即时); 移除 platformLimited 后 available 恒显真实 download 按钮 | renderer 测试覆盖 available→download (无 go-to-downloads) |
| 响应式 / 可访问性 / 键盘可达 | 每个 Switch 带 `aria-label`; 两端对齐自适应 | renderer 测试 getByTestId; aria-label 断言 |
| 文案 / i18n | en+zh 同批新增 autoCheck/beta, 移除 goToDownloads; 语气与 settings.update.* 一致 | 加载 i18n 后断言文案; harness:check |

## 测试策略 (测试矩阵)
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| UpdatePreferences 三字段默认值 + per-field 向后兼容合并 + 损坏兜底 | unit | tests/unit/update-preferences.test.ts | `pnpm test update-preferences` | — |
| 旧 `{autoDownload:true}` 文件加载为三字段 (autoCheck/allowPrerelease 取默认) | unit | 同上 | 同上 | — |
| controller 构造/applyPreferences 设置 autoDownload + allowPrerelease | unit | tests/unit/updater-controller.test.ts | `pnpm test updater-controller` | — |
| mac (darwin) 不再降级: download/install 真实调用 (替换原 platformLimited 用例) | unit | 同上 | 同上 | — |
| UpdateSection 渲染 autoCheck/beta/autoDownload 三开关 + 切换调用 setPreferences | renderer | tests/renderer/settings-update.test.tsx | `pnpm test settings-update` | — |
| available 恒显真实 download (移除 platformLimited→link 用例) | renderer | 同上 | 同上 | — |
| IPC 通道键集不变 | unit | tests/unit/ipc-contract.test.ts | `pnpm test ipc-contract` | — |
| index.ts autoCheck 启动门控 | manual | — | 本机 dev 启动观察 | electron 启动 wiring 不可单测; preference 持久化已单测覆盖, 行 gate 为一行条件 |
| electron-builder.yml / release.yml 签名+双架构+zip 校验 | manual/CI | — | v0.3.0-beta.1 dry-run | mac 签名打包本机 Windows 不可跑; 唯一真源是 macOS runner, dry-run 即验收 |
| 版本 bump | harness | — | `pnpm typecheck` + tag | 版本号改动由构建/发布链路验证 |

## 验收标准映射
| SPEC 项 | ANALYSIS 验收标准 |
|---|---|
| autoCheck 字段 + index.ts 门控 | AC1 |
| allowPrerelease 字段 + controller 接线 | AC2 |
| UpdateSection 两开关 + i18n | AC3 |
| 通道键集不变 | AC4 |
| electron-builder + release.yml 签名/双架构/zip | AC5 |
| 移除 platformLimited (lift) + changelog 文案 | AC6 |
| 0.3.0 bump + beta dry-run + 全平台资产 | AC7 |
| 三测试套件 + lint/typecheck 绿 | AC8 |

## 并行/顺序边界
- 运行时代码 (types→preferences→updater→index→hook→UI→i18n) **顺序**执行: 类型改动从契约向上游 ripple, 文件强耦合, 不并行。
- CI/打包配置 (electron-builder.yml、release.yml) 与运行时代码文件不重叠, 但逻辑上 lift 与签名同版本发布, 故在运行时代码完成后顺序进行。
- 版本 bump 为最后一步 (紧接 tag)。
- 全程单 session 顺序推进, 不拆 subagent 并行。
