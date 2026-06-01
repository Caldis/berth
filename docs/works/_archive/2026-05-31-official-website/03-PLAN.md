# 03-PLAN — 实现步骤与验收

均已完成,门禁: typecheck ✅ / build ✅ / vitest ✅ / harness:check ✅。

1. 脚手架 website/ 子工程 → verify: pnpm build 产出每路由静态 HTML
2. i18n 4 语言 + 路由 + 布局/导航/页脚 → verify: /{lang} 路由均 200,语言切换保位
3. 视觉系统(Calm → 暖橙 → handhold 实测令牌,经反馈定稿)→ verify: 浏览器实测截图对照
4. 首页(Hero/价值/功能故事/知识库桥接/三支柱/FAQ/CTA)→ verify: 整页渲染
5. 知识库内容模型(Article + Source)+ 文章页 + 引用区块 → verify: 文章页含正文 + 参考来源
6. 三支柱 × zh/en 11 篇 → 翻译 ja/ko(4 语言 44 篇)→ verify: 44 篇预渲染,sitemap 90 URL
7. SEO/AI 工件(sitemap/robots/llms/agent.json/JSON-LD/OG)→ verify: 线上全 200
8. 单元测试(内容完整性 + i18n 路由解析,12 项)→ verify: vitest 12/12
9. 结构化数据补充(Breadcrumb + CollectionPage)+ actions 升级 → verify: HTML 含对应 JSON-LD
10. 部署(GitHub Actions → Pages)+ DNS + 自定义域 + 强制 HTTPS → verify: https://berth.caldis.me 200,浏览器实测
