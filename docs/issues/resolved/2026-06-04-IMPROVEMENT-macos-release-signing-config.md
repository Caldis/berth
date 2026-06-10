# 描述
- macOS release 打包配置引用 `build/entitlements.mac.plist`, 但仓库没有 `build/` 目录和 entitlement 文件。
- 2026-06-04 发布 `v0.1.1` 时, 默认 `pnpm package:mac` 进入签名阶段后失败。

# 重现步骤
- 在 macOS 环境执行 `PATH="$HOME/.nvm/versions/node/v24.3.0/bin:$PATH" pnpm package:mac`。
- electron-builder 读取 `electron-builder.yml` 中 `mac.entitlementsInherit: build/entitlements.mac.plist`。

# 预期结果
- 默认 macOS 打包命令可以生成可发布资产。
- 如果项目暂不做签名, 打包命令应明确禁用签名自动发现。
- 如果项目需要签名, 仓库应提供有效 entitlement 配置。

# 实际结果
- codesign 读取 `build/entitlements.mac.plist` 失败: `cannot read entitlement data`。
- 通过 `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm package:mac` 可以生成未签名的 dmg 和 zip。

# 解决方案
- 明确 macOS 发布策略: 未签名发布时将打包脚本固定为禁用签名自动发现; 签名发布时补齐 `build/entitlements.mac.plist` 和证书配置说明。

# 追记 (GH-115 T11 实证, 2026-06-10)
- 本机钥匙串存在签名身份时, electron-builder 自动发现并尝试签名, 撞上 `entitlementsInherit: build/entitlements.mac.plist` 指向的不存在文件 → `cannot read entitlement data`, 打包直接失败。inert 配置不只是"跳过", 在有身份的机器上是**阻断项**。
- 临时旁路: `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm package:mac`。
- 关联: GH-115 01-ANALYSIS R31 (fuses/ABI 守卫同批)。

# 终态 (2026-06-10, RESOLVED — 按本 issue 解决方案的未签名分支落地)
- `electron-builder.yml`: 删除悬空 `entitlementsInherit` (根因), `mac.identity: null` 把「禁用签名自动发现」从环境变量旁路固化进配置 — 等效 `CSC_IDENTITY_AUTO_DISCOVERY=false`, 有钥匙串身份的机器默认 `pnpm package:mac` 也产未签名 dmg/zip。
- 证据链: 2026-06-04 实测该旁路可产出发布资产; identity null 为 electron-builder 官方禁签语义; YAML 解析校验通过。下次 macOS 真机发布即全链验证 (Windows 本机无法跑 package:mac, 已在注释中写明转签名发布时的恢复步骤)。
- 后续若做签名发布 → 按 [[2026-06-04-IMPROVEMENT-macos-release-signing-config]] 注释指引补 entitlements + 证书, 属新需求另立案。
