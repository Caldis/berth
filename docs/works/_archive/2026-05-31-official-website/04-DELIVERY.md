# 04-DELIVERY — 交付、踩坑与上线验证

## 交付物
- website/ 子工程(React + vite-react-ssg,纯静态,零后端)
- 4 语言(zh/en/ja/ko),路径前缀路由 + hreflang + canonical
- 三支柱知识库,11 篇 × 4 语言 = 44 篇文章页,每篇带参考来源(一手/中立源,厂商自述已标注)
- SEO/AI 工件: sitemap.xml、robots.txt、llms.txt、llms-full.txt、.well-known/agent.json、og/cover.png
- JSON-LD: SoftwareApplication / FAQPage / TechArticle / BreadcrumbList / CollectionPage
- 单元测试 12 项(内容模型完整性 + i18n 路由解析)
- GitHub Actions 部署工作流 .github/workflows/deploy-website.yml

## 关键技术踩坑(交接必读)
- **vite-react-ssg 需 React Router v6**: RR v7 移除/改名 react-router-dom/server,客户端构建假过、SSG 预渲染阶段才报 ERR_PACKAGE_PATH_NOT_EXPORTED。已钉 RR 6.x。
- **lucide v1 移除品牌图标**: 无 Github 图标导出,自带 GithubIcon 组件(SVG)。
- **TS6 弃用 baseUrl**: 用 paths 时省略 baseUrl(相对 tsconfig 解析);并加 vite-env.d.ts 声明 CSS 副作用导入。
- **持久 shell cwd 漂移**: git 操作 cd 到仓库根后,后续 pnpm build/preview 会跑错项目(根=Electron app,无 preview 脚本)。务必显式 cd website 或 pnpm -C website。
- **预览服务器**: 必须在 website/ 目录起 pnpm preview;探测用 127.0.0.1,不要把脆弱探测与关键操作放同一并行批次(失败会连带取消)。

## 多 Agent 共享工作区下的安全提交(重要)
- 本仓 no-worktree、多 Agent 并发改 master、共享 git index 且 master 被实时 rebase。
- 安全发布自己工作的方式: 用私有 index(GIT_INDEX_FILE)从 origin/master 起,只 git add 自己的路径(website/ + 工作流 + 自己的 friction),write-tree + commit-tree 接到 origin/master,普通(非强制)push = fast-forward。若远端先行则被拒,重建重试。全程不触碰共享 index 与他人工作区。
- 守卫: 每次提交前用 git diff --cached 核对 staged 仅含自己路径,泄漏即 abort。

## 上线验证(2026-06-01)
- DNS: Cloudflare CNAME berth.caldis.me → caldis.github.io(1.1.1.1 & 8.8.8.8 双确认,DNS only 灰云)
- 部署失败首因: 首次启用 Pages 的初始化 404(代码/构建均绿);经设自定义域 + gh run rerun 后成功
- 线上: https://berth.caldis.me 及 /en /zh/knowledge 全 200;sitemap/robots/llms.txt/llms-full.txt/agent.json/og 全 200;HTTPS 强制开启;浏览器实测中文首页渲染正确
- 部署 run: 26719689720(首发,success)、26738248461(结构化数据,success)

## 后续可选(未做,非本次范围)
- actions/deploy-pages 与 upload-pages-artifact 暂无 Node24 版本,Node20 弃用警告需等官方更新后再升(2026-06-16 前不影响)
- 知识库可继续扩篇;ja/ko 为基于 en 的翻译,后续可由母语者润色
