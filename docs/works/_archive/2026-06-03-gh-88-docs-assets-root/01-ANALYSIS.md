# 需求分析 (Explore 产物)

## 现状理解
- `docs/assets/logo-placeholder.svg` 当前被 `README.md` 顶部 logo 引用。
- `docs/index.html` 是旧 landing page; 仓库已有 `website/index.html` 与 `website/` SSG 站点。
- `.github/workflows/deploy-website.yml` 当前只在 `website/**` 或 workflow 自身变化时触发, 上传 `website/dist` 到 GitHub Pages。
- `website/scripts/postbuild.mjs` 只生成 `sitemap.xml`, `llms.txt`, `llms-full.txt`, 不复制根目录共享资产。

## 关联与依赖
- README 需要改为引用 `assets/logo-placeholder.svg`。
- 根目录共享资产若要被 GitHub Pages 发布, website build 需要把 `../assets` 复制进 `website/dist/assets`。
- Pages workflow path filter 需要监听 `assets/**`, 否则只改根目录资产不会触发官网部署。
- 归档 work 中提到的 `docs/index.html` 属历史记录, 不作为当前活动引用修改。

## 任务分类与 debt 校准
- type / maintenance.subtype: maintenance / docs
- source.kind / refs: user-request / GH-88
- debt estimate 修正: incurred 1, repaid 2, net -1
- scope / risk / areas / confidence: module / low / docs,tooling-ci / medium
- revision: 无

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 根目录存在 `assets/logo-placeholder.svg`; `docs/assets` 不再存在。
2. `docs/index.html` 被删除; `website/index.html` 保持官网入口。
3. README logo 引用改为 `assets/logo-placeholder.svg`。
4. website build 把根目录 `assets/` 发布到 `website/dist/assets/`。
5. GitHub Pages workflow 监听 `assets/**` 并继续上传 `website/dist`。
6. 活动引用中不再出现 `docs/assets`。

## 界面质量与交互验收
不适用。

## 未决问题
无。
