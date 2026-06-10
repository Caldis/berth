# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: 2026-06-03 用户请求

## 正文

用户确认采用以下结构:

```text
assets/
  logo-placeholder.svg

docs/
  ARCHITECTURE.md
  CONTRIBUTING.md
  user-manual.md
  prd/
  issues/
  friction/
  works/

website/
  index.html
  src/
  public/
```

要求:

- `docs/assets` 重构到根目录 `assets/`。
- `docs/index.html` 不再和文档放在一起; 旧 landing page 已由 `website/` 替代, 删除。
- 相关引用一并修改。
- 同步调整 GitHub 相关部署配置。
