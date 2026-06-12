# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户指令 (2026-06-12, 重构链 GH-119/121/122 归档后): "搞完这波之后 更新官网 发个新版" + "完成后推送"。
- GitHub Issue: https://github.com/Caldis/berth/issues/123

## 正文

用户原话: 搞完这波之后 更新官网 发个新版。

执行侧补充事实 (0.0-new 侦察, 2026-06-12):
- 当前 version 0.1.1; 既有 release: v0.1.0 (2026-05-27 Initial), v0.1.1 (2026-06-04, 资产为 mac arm64 zip+dmg+blockmap — 于 macOS 机打包)。
- 本机为 Windows: 可产 win 安装包 (`pnpm package:win`); mac 资产物理无法本机产, 需用户在 mac 机 `pnpm package:mac` 后 `gh release upload` 补传。
- v0.1.1..HEAD 跨度: GH-105 (HeroUI 整库迁移) ~ GH-122 (runtime 拆分), 含扫描引擎生产级升级 (GH-110)、全局 scope 模型 (GH-113)、Agent Teams (GH-114)、架构重构 (GH-115)、会话列表/详情重设计 + 时间线重放 (GH-116/120)、窗口安全加固 (GH-119)、引擎成包 @berth/scan-engine CLI (GH-121) 等。
- 官网: website/ React SSG, 四语言内容 (content/features|guides|understand × en/zh/ja/ko), push 后 .github/workflows/deploy-website.yml 自动构建上线 GitHub Pages。
