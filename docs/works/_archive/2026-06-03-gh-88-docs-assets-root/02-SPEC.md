# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 文件位置:
  - from: `docs/assets/logo-placeholder.svg`
  - to: `assets/logo-placeholder.svg`
- README 引用:
  - from: `docs/assets/logo-placeholder.svg`
  - to: `assets/logo-placeholder.svg`
- Website build:
  - `website/scripts/postbuild.mjs` 在生成 SEO/AI 文件后复制 repo root `assets/` 到 `website/dist/assets/`。
- GitHub Pages workflow:
  - `deploy-website.yml` 的 `on.push.paths` 增加 `assets/**`。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / docs
- source.kind / refs: user-request / GH-88
- debt.estimate: incurred 1, repaid 2, net -1, module, low risk
- debt.final 预期: 与 estimate 一致
- revisions: 无
- Project 字段同步: `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-88-docs-assets-root`

## 模块结构 / 组件拆分
- `assets/`: 仓库共享静态资产。
- `docs/`: Markdown 文档、任务态、issues/friction/prd。
- `website/`: 官网源码和构建入口。
- `.github/workflows/deploy-website.yml`: Pages 部署触发条件与 artifact 上传。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 不适用 |
| 组件选择 / 设计系统一致性 | 不适用 | 不适用 |
| 交互反馈 / 状态切换 | 不适用 | 不适用 |
| loading / empty / error / disabled / focus | 不适用 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 不适用 |
| 文案 / i18n / 数字和路径格式 | README 路径引用变更 | `rg` 检查 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| website build 复制根目录 assets | build | `website/scripts/postbuild.mjs` | `pnpm --dir website build` |  |
| README / workflow / docs 引用 | shell / harness | n/a | `pnpm harness:check`; `rg -n "docs/assets|docs/index.html" README.md .github website scripts package.json docs --glob "!docs/works/**"` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| asset 文件移动与 README | 1, 3, 6 |
| docs/index 删除 | 2 |
| website postbuild 与 deployment workflow | 4, 5 |
