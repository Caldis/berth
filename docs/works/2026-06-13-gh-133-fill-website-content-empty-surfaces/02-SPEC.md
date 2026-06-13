# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不让官网直接 import 主应用或扫描引擎源码。官网内容继续由两套静态数据驱动:
  - `website/src/i18n/locales/{zh,en,ja,ko}.json`: 首页、Features、About、Privacy、Changelog、Footer/Nav 等页面壳文案。
  - `website/src/content/*.{lang}.ts`: 知识库长文。
- 在 i18n JSON 中补充结构化字段, 而不是把大段 JSX 写死在页面:
  - `features.engine`: 扫描引擎、索引、source coverage、Settings 控制面。
  - `features.adapters`: 支持的 agent/adapter 列表, 每项含名称、扫描范围、状态措辞。
  - `pages.about.sections`: 产品定位、当前支持范围、为什么做本地只读。
  - `pages.privacy.sections`: 本地读取范围、SQLite/index/settings 持久化、credential/token 处理、无遥测。
  - `pages.changelog.items`: v0.2 后新增 scan-engine 和 adapter 变更, 保留旧 v0.2 条目。
  - `notFound`: 保持四语 key, 404 页面读取当前语言。
- Knowledge hub 不再依赖 `COMING_SOON` 作为用户可见内容。若某 pillar 没有文章, 使用“当前没有文章”的中性空态, 但本任务目标是三类都存在并可点击。
- 首页三张知识库卡片改为链接到对应 hub 锚点或代表文章, 例如 understand/features/guides, 不全部落到 `/knowledge` 顶部。
- 404 修复以静态站可验证为准:
  - React route 仍保留 `*` fallback。
  - 构建后确保 `dist/404.html` 存在, 用于 GitHub Pages 静态 404。
  - `NotFound` 自身支持 `/:lang` 语境; unknown path 不再误显示首页。
- `postbuild.mjs` 的 `llms.txt` 简述同步更新, 不再只写 Claude Code/Codex。
- 关键产品事实:
  - 已支持扫描/adapter v1: Claude Code、Codex、Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent。
  - 扫描引擎为 `@berth/scan-engine`, 暴露 CLI `berth-scan` 和 `./adapter-api`。
  - Settings 可见信息包括版本、状态、indexed assets/files/errors、source groups/rows、scheduler、controls。
  - 当前支持 watcher debounce 和 watcher min interval 设置; pause/cancel 只展示为不支持。
  - 扫描只读; credentials/tokens 只做存在性或 metadata 展示, 不显示 secret 值。

## 任务分类与 debt
- type: feature。
- source.kind / refs: user-request, GH-133。
- debt.estimate: `incurred=4`, `repaid=5`, `net=-1`, `scope=module`, `risk=medium`, areas=`ui-ux/docs/testability`, confidence=`medium`。
- debt.final 预期: 若实现保持在 website 包且测试覆盖 i18n/route/content, 预计 `incurred=4`, `repaid=6`, `net=-2`。
- revisions: Explore 已记录一次 scope 从 cross-process 调整为 module。
- Project 字段同步: Design 不再改 debt; implement 完成后若 final 变化, 在 verify 前同步 Project。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `website/src/i18n/locales/*.json`: 主要内容填充点。先英文写准, 再同步 zh/ja/ko, 结构保持完全一致。
- `website/src/pages/Home.tsx`: 更新 hero/value/FAQ/knowledge card 的结构消费; 不重写视觉系统。
- `website/src/pages/Features.tsx`: 从简单四卡扩展成产品页, 增加 scan engine、adapter matrix、Settings 控制面和安全边界。
- `website/src/components/AssetPanel.tsx`: 更新静态产品示意, 表达多 agent + scan engine 状态, 不引入真实运行时依赖。
- `website/src/pages/{About,Privacy,Changelog}.tsx`: 从两段短文改为结构化 section/list, 仍从 i18n JSON 读取。
- `website/src/pages/KnowledgeHub.tsx`: 删除过时 “coming soon” 口径, 增加 section id/锚点或具体链接支持。
- `website/src/pages/NotFound.tsx` 和 `website/src/routes.tsx`: 让 404 具备语言语境; 必要时新增 language-aware fallback route。
- `website/scripts/postbuild.mjs`: 生成 `404.html`, 更新 llms 简述, 并确保 sitemap 排除 404。
- `website/src/i18n/*.test.ts` 或新增 `website/src/i18n/locales.test.ts`: 校验四语 key parity 和关键数组长度 parity。
- `website/src/content/content.test.ts`: 视新增文章或知识库规则扩展。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 首页不大改; Features 增加分区: feature summary -> scan engine -> adapters -> controls/safety; About/Privacy/Changelog 用 section/list 提升信息量。 | preview 抽查 `/en`, `/en/features`, `/en/about`, `/en/privacy`, `/en/changelog`; 主体字符数不再低于 Explore 基线。 |
| 组件选择 / 设计系统一致性 | 复用现有 `container-page`, `card`, `btn-*`, `eyebrow`, Tailwind palette。新增组件只在网站包内。 | 代码检查 + 桌面/移动截图或 Playwright 文本抽查; 不出现另一套视觉系统。 |
| 交互反馈 / 状态切换 | 保持现有 hover/focus; 首页 knowledge cards 链接到具体目标; mobile nav 不受影响。 | Playwright 检查 links href; 手动/脚本访问目标路由。 |
| loading / empty / error / disabled / focus | 静态站无 loading; empty 只保留非过时中性空态; 404 为明确 error state; focus 使用现有 button/link ring。 | `/en/no-such-page` 或 `404.html` 抽查; `rg` 确认 coming soon 口径消失。 |
| 响应式 / 可访问性 / 键盘可达 | 新增内容用语义 `section/article/nav/ul/li`; 长列表在移动宽度不溢出; 外链保留 `rel=noreferrer`。 | Playwright desktop/mobile viewport 抽查; typecheck。 |
| 文案 / i18n / 数字和路径格式 | 四语 key parity; 不写未实现承诺; 版本、agent 名、包名、路径 token 精确。 | i18n parity test + `rg` 搜 stale 词 + build 后 llms 内容抽查。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| i18n JSON key/数组结构四语一致 | unit | 新增或扩展 `website/src/i18n/*.test.ts` | `pnpm --dir website test` | - |
| 知识库文章 parity 仍一致 | unit | `website/src/content/content.test.ts` | `pnpm --dir website test` | - |
| Features/Home/About/Privacy/Changelog 内容结构可类型检查 | typecheck | TS/React 编译 | `pnpm --dir website typecheck` | - |
| 静态站可构建, sitemap/llms/404 生成 | build | `website/scripts/postbuild.mjs` | `pnpm --dir website build` | - |
| stale 内容消失, 支持范围更新 | grep/static | - | `rg "Claude Code and Codex|Articles coming soon|后续版本|v0.1" website/src website/public` | 自动化断言覆盖结构, grep 用于文案回归。 |
| 主要路由和 404 实际可访问 | preview/manual script | - | preview + Playwright/Edge 抽查 `/en`, `/en/features`, `/en/knowledge`, `/en/about`, `/en/privacy`, `/en/changelog`, `/en/no-such-page`, `/404.html` | 这是浏览器级验证, 不新增长期 e2e, 避免为静态站引入维护成本。 |
| harness 任务态合规 | harness | - | `pnpm harness:check --work docs/works/2026-06-13-gh-133-fill-website-content-empty-surfaces` | - |
| 收口回归 | full/local + CI | root scripts | `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, 推送后 CI/deploy | 全仓回归在 verify/archive 执行。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 结构化 i18n + 内容填充 | AC-1, AC-2, AC-5, AC-6, AC-8 |
| Features scan engine / adapter / controls 内容 | AC-2, AC-3 |
| Knowledge links 和 empty 口径 | AC-1, AC-4 |
| 404 静态修复 | AC-7 |
| SEO / llms / sitemap / postbuild | AC-9 |
| 测试矩阵和 preview 抽查 | AC-10 |
