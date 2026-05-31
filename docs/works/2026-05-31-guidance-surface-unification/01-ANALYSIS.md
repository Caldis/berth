# 需求分析 (Explore 产物)

## 现状理解

待补: 清点 renderer 页面、共享组件、i18n 文案中与功能提示、指引、empty state、help callout 相关的真实渲染路径。

## 关联与依赖

待补:

- 页面层: sessions、instructions/memories、capabilities/hooks、status line、usage、overview、settings 等功能页。
- 共享层: 现有提示卡片、空状态、section header、description/helper text 是否已有可复用组件。
- 文案层: `src/renderer/src/i18n/locales/en.json` 与 `zh.json`。

## 验收标准

1. 列出各主要功能页面是否有提示/指引、重复提示、缺失提示和重复文案。
2. 给出统一提示区分类: 页面级说明、功能级引导、空状态引导、状态/警告提示。
3. 给出首屏密度和渐进披露规则, 避免每页堆多个说明块。
4. 明确哪些页面需要新增提示, 哪些页面需要合并或删除重复提示。
5. 设计方案必须支持中英文 i18n, 并能用组件测试或页面测试验证。

## 未决问题

待现状清点后确认。
