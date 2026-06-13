# 需求分析 (Explore 产物)

## 现状理解

### 上一项工作的状态
- 扫描引擎任务已归档: `docs/works/_archive/2026-06-13-gh-131-scan-engine-indexer-settings-plugins/INDEX.md` 为 `phase: archive`, GitHub Project 状态为 `Done`。
- 归档提交 `bd580c5f docs: archive scan engine settings task` 已推送, CI `27464181130` 在 macOS / Ubuntu / Windows 全部通过。
- 当前工作区仍有两个外部未暂存改动: `.agents/workflow/5.2-issues.md` 和 `AGENTS.md`; 本任务不碰它们。

### 官网技术形态
- 官网是独立包 `website/`, 使用 React 19 + `vite-react-ssg` + Tailwind 3。主应用 Electron renderer 不是本任务直接修改对象。
- 路由在 `website/src/routes.tsx`: `/` 重定向到语言首页, 四个语言前缀为 `zh/en/ja/ko`, 每个语言下有 `features`, `knowledge`, `about`, `privacy`, `changelog`, 以及知识库文章路由 `knowledge/{pillar}/{slug}`。
- 页面文本分两类:
  - 页面壳和首页主体文案在 `website/src/i18n/locales/{zh,en,ja,ko}.json`。
  - 知识库长文在 `website/src/content/{understand,features,guides}.{lang}.ts`, 由 `getArticles(lang, pillar?)` 聚合。
- SEO 和机器可读内容由 `Seo`, `JsonLd`, `schema.ts`, `website/scripts/postbuild.mjs` 生成。build 后会输出 sitemap、`llms.txt`、`llms-full.txt` 和 68 个 sitemap URL。

### 实测基线
- `pnpm --dir website test`: 2 个测试文件, 12 个测试通过。
- `pnpm --dir website typecheck`: 通过。
- `pnpm --dir website build`: 通过, 生成 69 个静态页面, `sitemap.xml` 68 URLs, `llms-full.txt` 约 123 KB。
- 本地 preview: `http://127.0.0.1:4173`。用 Edge 通道 Playwright 抽查:
  - sitemap 中 68 个 URL 全部返回 200。
  - `/en`, `/zh`, `/ja`, `/ko`, `/en/features`, `/en/knowledge`, `/en/knowledge/features/asset-model`, `/en/about`, `/en/privacy`, `/en/changelog` 均能渲染。
  - `/en/no-such-page` 实际显示英文首页, 不是 404 页面。`NotFound.tsx` 存在, 但静态 preview fallback 没正确进入该页面。

### 官网内容缺口
- 首页、FAQ、meta、About 和 Changelog 仍把支持范围写成 Claude Code / Codex, 或写成“后续支持更多 Agent”。这和当前实现不一致: 扫描引擎已经有 Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent 的 adapter v1。
- `Changelog` 只有 v0.2 一条, 且 notes 仍写“面向 Claude Code 的只读资产可视化”。它没有表达 v0.2 后的扫描引擎设置入口、adapter API、独立包、CLI、SQLite SWR、worker 扫描和多 agent adapter。
- `Features` 页面正文只有约 990 字符, 基本是首页功能卡片复用。缺少扫描引擎、插件适配、Settings 控制面、source coverage、安全边界、索引与搜索这些产品事实。
- `About` 约 422 字符、`Privacy` 约 345 字符、`Changelog` 约 236 字符。它们是有效页面, 但过浅, 用户会感觉入口空。
- `KnowledgeHub.tsx` 仍保留 `Articles coming soon` fallback; 当前不显示, 因为三类文章都有内容, 但这段 fallback 和 `pages.knowledgeIntro` 的“文章陆续上线”口径已经过时。
- 首页知识库三张卡片全部链接到 `/knowledge`, 没有跳到对应板块或代表文章。用户从首页点“Features / Guides”仍落在同一个 hub 顶部。
- `AssetPanel` 是静态演示, 仍显示 `berth · ~/.claude`, `25 assets`, 以及 Claude-era 示例。它没有展示多 agent、scan engine、source coverage 或 adapter registry。
- `NotFound.tsx` 没接 i18n, 且静态 unknown path 实测没有显示它。

### 当前产品事实面
- `@berth/scan-engine` 是独立包, package export 包含 `.` 和 `./adapter-api`, CLI bin 为 `berth-scan`。
- adapter registry 当前构造 Claude Code、Codex, 以及六个真实 adapter v1: Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent。
- adapter API 暴露 `AgentAdapterDefinition`, `AgentAdapterSourcePolicy`, source stability, sensitivity, version probe, permissions, references 等接口。
- 扫描引擎 Settings 信息来自 runtime `getEngineInfo()`: engine name/package/version, status, indexed assets/files/errors/source groups/source rows, capabilities, scheduler state, controls。
- Settings 控制面已支持手动刷新、watcher debounce、watcher min interval、scheduled refresh、queued refresh、pause 状态展示; 当前 pause/cancel 不支持, editable settings 会写入本机 `scan-engine-settings.json`。
- runtime 能力包括 one-shot worker、single-flight queued project scope、scan-on-miss、SQLite SWR cache、incremental file changes。扫描仍保持只读; credential/token 类 source 只做存在性或 metadata 处理。

## 关联与依赖
- 官网内容需要从主应用事实读取, 但不应让官网 import 主应用源码。内容应继续放在 `website/src/i18n` 和 `website/src/content`, 测试用网站包自己的模型检查。
- `postbuild.mjs` 从 prerender HTML 生成 sitemap 和 llms 文件; 新增或改名页面、文章、SEO 文案后必须跑 build 验证机器可读输出。
- 多语言内容存在两套对称性:
  - `content.test.ts` 已确保知识库文章四语 slug parity。
  - i18n JSON 没有同等强测试, 需要补或扩测试, 否则很容易像 GH-123 那样漏扫 `.json`。
- `.github/workflows/deploy-website.yml` 监听 `website/**`, 代码推送后会触发官网部署;收口前要看 deploy workflow。
- README 仍有 v0.1/Claude-only/roadmap 旧内容。它不是本任务官网源码, 但官网多处 GitHub 链接会把用户带到 README。若本任务时间允许, 可另记 issue; 不在官网主线里顺手改。

## 任务分类与 debt 校准
- type: feature。
- source.kind: user-request; refs: GH-133。
- debt estimate 修正: 从 `5/2/net 3/cross-process/low confidence` 调整为 `4/5/net -1/module/medium confidence`。
- scope / risk / areas / confidence: 主要是 `website/` 模块, 风险 medium, areas 为 ui-ux / docs / testability。
- revision: 已写入 INDEX。理由是完整扫描后确认不需要改 Electron 主进程或扫描引擎, 但会补齐官网内容和静态路由质量。

## 验收标准
1. 官网所有主要入口都有实质内容: Home、Features、Knowledge、About、Privacy、Changelog、404, 不再出现“coming soon”类过时口径。
2. 官网文案准确表达当前产品: 本地优先、只读、无遥测; 支持 Claude Code、Codex、Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent 的扫描/adapter v1; 不把未实现的编辑、启动/停止 MCP、官方账单能力说成已实现。
3. Features 页面新增扫描引擎与 adapter/plugin 信息: engine package/CLI/adapter-api、source coverage、Settings 控制面、索引文件数/状态、scheduler/worker/cache 能力、安全策略。
4. Knowledge hub 和首页知识库卡片能指向具体板块或代表文章; hub 不再保留“文章待上线”的用户可见口径。
5. Changelog 至少补充 v0.2 之后的扫描引擎和多 agent adapter 变化, 四语对称。
6. Privacy 补清本地读取范围、SQLite 本机索引、settings 持久化、credential/token 处理方式、无遥测边界。
7. 404 在静态 preview 下对未知路径可见, 至少英文 unknown path 不再显示首页。
8. 多语言保持结构一致: zh/en/ja/ko i18n JSON key parity, 知识库 article parity, 新增内容不只改英文。
9. SEO/机器可读输出不漂移: build 后 sitemap、llms.txt、llms-full.txt 包含新内容, route 数和页面标题可解释。
10. 验证通过: `pnpm --dir website test`, `pnpm --dir website typecheck`, `pnpm --dir website build`, 目标 preview 抽查, `pnpm harness:check --work ...`; verify/archive 前跑全仓必要门禁和远端 CI/deploy。

## 界面质量与交互验收
- 现有设计系统: warm off-white + ink + harbor/amber accent, Tailwind utilities, `btn-*`, `card`, `eyebrow`, rounded 24px/32px 视觉语言。整体是静态营销/知识站, 不使用主应用 HeroUI。
- 页面密度: 首页信息量尚可; Features/About/Privacy/Changelog 明显偏薄。知识库文章有内容, 但首页和 hub 没把用户导到具体文章。
- 主要路径: 用户从首页下载、看 GitHub、进入 Features、进入 Knowledge、阅读文章、读隐私、看更新日志。当前 Features/Changelog 不足以承接“现在到底能做什么”。
- 可见状态: 没有复杂 loading/error; 静态站主要需要 404、focus、mobile nav、link hover、anchor target 和外链安全。
- 响应式: 当前抽查桌面可用;后续要用 preview 检查移动宽度下 nav、长文、功能卡片是否溢出。
- 可访问性: nav button 有 aria-label, 图片 logo `alt=""` 且 `aria-hidden`, 基本可接受; 新增内容要保持语义 section/article/nav, 不用纯 div 堆文字。
- 视觉风险: 不应大改品牌视觉。当前任务以内容填充和少量信息结构改造为主, 避免把官网重写成另一套 UI。

## 未决问题
无必须向用户澄清的问题。用户已授权完整扫描官网并开始改造; 本任务按官网内容和入口完整性处理。
