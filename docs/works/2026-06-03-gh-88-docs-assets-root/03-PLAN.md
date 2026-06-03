# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 移动 docs 静态资产到根目录并删除旧 landing page。
  - tests: `rg -n "docs/assets|docs/index.html" README.md .github website scripts package.json docs --glob "!docs/works/**"`
  - evidence: 2026-06-03 `rg` 无匹配; `test -f assets/logo-placeholder.svg && test ! -e docs/assets && test ! -e docs/index.html` passed。
  - verify: `assets/logo-placeholder.svg` 存在; `docs/assets` 与 `docs/index.html` 不存在; 非 UI 任务, 界面验收不适用。
- [x] 任务 2: website build 与 GitHub Pages workflow 适配根目录 assets。
  - tests: `pnpm --dir website build`; `pnpm harness:check`
  - evidence: 2026-06-03 `pnpm --dir website build` passed; `cmp -s assets/logo-placeholder.svg website/dist/assets/logo-placeholder.svg` passed; `pnpm lint` passed; `pnpm harness:check` passed; `node scripts/harness-projects.mjs check --strict` passed。
  - verify: `website/dist/assets/logo-placeholder.svg` 由 root `assets/` 复制产生; `deploy-website.yml` 监听 `assets/**`; 非 UI 任务, 界面验收不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
