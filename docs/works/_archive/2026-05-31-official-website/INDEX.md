---
task: 2026-05-31-official-website
type: feature
jira:
phase: archive
created: 2026-05-31
artifacts:
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  notes: 04-DELIVERY.md
---

# Official Website (berth.caldis.me)

Berth 官网建设。React SSG 多语言静态站(零后端,GitHub Pages),三支柱知识库(带参考来源),SEO/AI 友好工件,已部署上线。

> 说明: 本任务未经 opsx-new 建活任务态, 直接在用户实时反馈下完成设计→实现→部署→上线; 归档记录为事后补建, 用于交接与追溯。

## 产物
- [x] 02-SPEC.md — 设计方案(架构/IA/视觉/i18n/SEO 决策)
- [x] 03-PLAN.md — 实现步骤与验收(回填)
- [x] 04-DELIVERY.md — 实际交付、踩坑与上线验证

## 上线状态
- URL: https://berth.caldis.me (HTTP 200, HTTPS enforced)
- 代码: master `2df756f` (官网首发 `37b7a0e` 之上叠加结构化数据 + actions 升级)
- 部署: GitHub Actions `deploy-website.yml` → GitHub Pages,两次 run 均 success
- DNS: Cloudflare CNAME `berth.caldis.me → caldis.github.io` (用户手动配置,已验证生效)

## 关联 friction
- docs/friction/20260531-explore-web-research-no-gui-browser-fallback.md
  (网络检索只用 WebSearch/WebFetch,禁止子 Agent 降级开 GUI 浏览器)

## GitHub Project
- 未建 project item(任务未走 new;官网为独立子工程,经用户授权直接完成并上线)
