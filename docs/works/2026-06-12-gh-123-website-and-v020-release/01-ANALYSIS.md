# 需求分析 (Explore 产物)

> 2026-06-12。来源: 00-PRD.md (用户指令)。发布任务事实面小, explore 一轮盘清。

## 现状理解

### 版本与发布现状
- root package.json `version: 0.1.1`; tag v0.1.0 / v0.1.1; Release v0.1.1 (2026-06-04) 资产为 mac arm64 (dmg+zip+blockmap, 未签名 — 签名 issue 已有跟踪), notes 自述 "Windows package is not included (无 win 打包 workflow)"。
- v0.1.1..HEAD 跨度 GH-105~122: HeroUI v2 整库设计系统 (105/108/109)、扫描引擎生产级升级 + 插件关联 (110/112)、对抗审查加固 (111)、全局 scope 模型 + 增量索引 + SQLite 冷启动 (113)、Agent Teams 视图 (114)、架构重构 (115)、会话列表/详情重设计 + 时间线重放 (116/120)、e2e 隔离 (117)、renderer 错误通道 (118)、窗口安全加固 (119)、引擎成包 @berth/scan-engine CLI (121)、runtime 拆协作者 (122)、app icon 接线与 orange 强调色。
- electron-builder win 目标已配: nsis + portable (`berth-${version}-setup.exe` 等); 本机 Windows 可产; mac 资产物理上需用户 mac 机后补 (v0.1.1 先例)。

### 官网更新面 (全站扫描收口)
- **版本单源**: `website/src/lib/site.ts:4` `APP_VERSION = 'v0.1'` (全站展示)。
- **内容事实漂移** (GH-116 重放替换工具时间线后过时): features ×4 语言各 3 处 (行 27 "v0.1 是只读的" / 行 43 sessions 篇"工具时间线"描述 / 行 100 "v0.1 绝不修改"); guides ×4 语言各 1 处 (行 24 hooks 篇引用"会话的工具时间线")。
- 下载链接 `RELEASES_URL` 指 releases 列表页, **零改动**。
- 部署: push 后 `.github/workflows/deploy-website.yml` (监听 website/**, assets/**) 自动构建上线。
- website 自有门禁: content.test.ts (四语对称性?) + vite build。

## 关联与依赖
- App 内版本展示走 `app.getVersion()` (platform:info) → root version bump 自动生效, 零代码改动。
- CLI 包 version 0.1.0 独立未公开发布, 不动。
- Release 创建与官网上线为**外发动作** — 用户指令"更新官网 发个新版"即授权; 版本号 0.2.0 由变更量级自决 (大量 feature + 架构重构, minor bump)。

## 任务分类与 debt 校准
- type: feature / source: user-request — 维持; debt estimate 1/0/1 module/medium/[docs] 维持; confidence low→medium (更新面全站扫描收口)。revision 已记 INDEX。

## 验收标准
1. **AC-1 版本 bump**: root package.json 0.2.0; site.ts APP_VERSION 'v0.2'; App About 经 getVersion 自动。
2. **AC-2 官网内容对齐**: 四语言 features ×3 处 + guides ×1 处更新 — 版本钉死措辞改为不绑版本的"Berth 是只读的"口径 (长期免维护), sessions/hooks 篇"工具时间线"改为时间线重放口径并补 v0.2 能力 (重放/筛选/导出/Canvas 时间轴); 四语对称。
3. **AC-3 官网门禁**: website 测试 + build 绿; push 后 deploy-website workflow success (官网上线)。
4. **AC-4 win 安装包**: `pnpm package:win` 产 nsis setup + portable; win-unpacked 本机启动冒烟。
5. **AC-5 GitHub Release v0.2.0**: tag + Highlights notes (v0.1.1..HEAD 用户可见变更) + win 资产上传 + mac 后补与未签名声明 (沿 v0.1.1 先例)。
6. **AC-6 门禁**: 全仓 typecheck/lint/test + CI 绿; release 页与官网线上核验。

## 界面质量与交互验收
官网为静态内容站: 文案为本任务交付物 (四语对称 + 术语与产品现状一致); 不动布局/组件。发布后线上抽验 zh/en 两语言渲染。

## 未决问题
无 — 形态决策 (0.2.0 / win 资产 + mac 后补 / 不绑版本措辞) 均有事实依据自决, 已在 AC 落定。

## 旁支发现
- v0.1.1 notes 引用的 mac 签名 issue (2026-06-04-IMPROVEMENT-macos-release-signing-config) 仍 active, 本次 notes 沿用声明, 不展开修。
