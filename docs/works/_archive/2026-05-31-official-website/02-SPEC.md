# 02-SPEC — 官网设计方案

## 目标
为 Berth 建独立官网,纯静态部署到 GitHub Pages(零后端),SEO 与 AI-agent 友好,多语言,含知识库。信息架构参照 D:\Code\bobcorn,视觉参照 https://handhold.io/(独立实现,不照搬)。

## 决策(经用户确认)
- 语言: 中 / 英 / 日 / 韩(zh/en/ja/ko)
- 视觉: 对照 handhold.io 实测设计令牌 —— 暖近白底(非纯白,经用户两轮调整)、编辑感衬线大标题(Newsreader)+ Inter 正文、纯黑(ink)按钮、扁平大圆角卡片、蓝→金渐变缎带(HeroWave)
- 部署: 自定义域 `berth.caldis.me`(根路径)
- 知识库: 三支柱 = 科普(认识 AI Agent) + 功能(Berth 功能详解) + 教程(实操指南)

## 技术架构
- React 19 + TypeScript + Vite
- vite-react-ssg 0.9.0 做静态预渲染(每条路由产出真实 HTML;SEO/AI 抓取拿到正文)
- React Router 6(SSG 依赖 react-router-dom/server;v7 会导致预渲染失败)
- Tailwind CSS,设计 token 走 CSS 变量层(改一处全站生效)
- i18n: i18next,每语言独立实例(SSG 单进程顺序预渲染多语言,单例会串语言)
- 路径前缀路由 /{lang}/...,hreflang + canonical + x-default
- 内容即数据: 知识库为结构化 TS(Article + Source),同一份源渲染网页 + 拼 llms.txt/llms-full.txt
- 目录隔离: 全部在 website/ 子工程(自带 package.json/锁文件),不碰主仓 src/ 与根 package.json

## SEO / AI 友好
- 每页独立 title/description/canonical/OG/Twitter
- JSON-LD: SoftwareApplication + FAQPage(首页)、TechArticle + BreadcrumbList(文章)、CollectionPage + ItemList(知识库中枢)
- postbuild 从预渲染 HTML 自动生成 sitemap.xml / llms.txt / llms-full.txt(内容不漂移)
- robots.txt、.well-known/agent.json、og/cover.png

## 信源策略(科普内容)
- 锚定产品所属生态的一手文档 + 中立科普: Anthropic(Claude Code/MCP/Agents)、Model Context Protocol、OpenAI(Codex/tool use)、AWS/IBM/Google/Microsoft
- 每篇文章底部列「参考来源」(可点击 URL + 可信度说明),厂商自述标注「厂商声明」
- 注: 初版误把单一厂商营销源当主轴,经用户纠正后已彻底清洗,改锚一手/中立源(见关联 friction 与 docs/friction/20260530-design-official-docs-before-volatile-product-assumptions.md)
