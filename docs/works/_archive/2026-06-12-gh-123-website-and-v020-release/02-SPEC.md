# 技术方案 (Design 产物)

> 2026-06-12。发布任务, 方案 = AC 的执行细化; 无架构决策。

## 数据契约
- 版本: root `package.json` version → `0.2.0`; `website/src/lib/site.ts` `APP_VERSION` → `'v0.2'`。
- 官网内容 (四语对称, 每语言同位置同语义):
  - features 行 27/100: "v0.1 是只读的/绝不修改" → "Berth 是只读的"不绑版本口径 (en/ja/ko 对应句式同改)。
  - features 行 43 (sessions 篇): "工具时间线"句 → 时间线重放口径: 事件流重放 (用户/助手/思考/工具/产物逐事件回放) + Canvas 三泳道时间轴 + 类型筛选/搜索/导出。
  - guides 行 24 (hooks 篇): "对照会话的工具时间线" → "对照会话重放中的工具事件"。
- Release notes 结构沿 v0.1.1 先例: Highlights (用户可见, 按域分组) / Assets (win setup + portable; mac 随后补) / 签名与平台声明 / Verification (本地门禁 + CI run 链接)。
- 不做: 新增官网长文、布局/组件改动、CLI 包发布、mac 签名修复。

## 任务分类与 debt
- feature / user-request; estimate 1/0/1 module/medium/[docs] medium — design 无变化。Project 已绑定。

## 模块结构 / 组件拆分
T1 内容+版本 → T2 推送+官网上线 → T3 win 打包冒烟 → T4 Release 发布。顺序执行 (T2 依赖 T1, T4 依赖 T2 的 tag 基线与 T3 资产)。

## 界面质量与交互验收
文案交付: 四语对称 (content.test 钉) + 术语与 App 现状一致 (重放/时间轴措辞对照 GH-116/120 实现); 上线后 zh/en 线上抽验。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 官网内容四语对称/结构 | website 既有测试 | website/src/content/content.test.ts | `pnpm --dir website test` (或包内 script) | — |
| 官网可构建 | build | — | `pnpm --dir website build` | 构建即验证 |
| 版本 bump 不破坏 App | 全仓门禁 | 既有全量 | `pnpm typecheck && pnpm test` | version 字段无行为面 |
| win 包可启动 | manual 冒烟 | — | dist/win-unpacked/berth.exe 启动 + 窗口出现 | 打包产物无自动化网 (v0.1.1 先例 manual) |
| Release/官网上线 | manual 核验 | — | gh release view + 线上 URL | 外发终态人工核验 |

## 验收标准映射
| SPEC 项 | AC |
|---|---|
| 版本两处 | AC-1 |
| 四语内容更新 | AC-2 |
| website 测试+build+deploy workflow | AC-3 |
| package:win + 冒烟 | AC-4 |
| tag+notes+资产 | AC-5 |
| 全仓门禁+CI+线上核验 | AC-6 |
