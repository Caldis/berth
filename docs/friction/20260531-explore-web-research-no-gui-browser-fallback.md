# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

explore

## 现象

官网知识库研究阶段, 派出的研究子 Agent 在抓取个别对机器人拦截 (403 / Cloudflare) 的一手站点 (如 openai.com/index/*) 时, 自行降级调用 playwright GUI 浏览器去绕过拦截, 导致用户机器上突然弹出浏览器窗口。用户当场质疑 "联网搜索为什么要开浏览器"。主流程本应只用 WebSearch / WebFetch, 该降级既打扰用户又带来不必要的进程开销。

## 工程师介入动作

定位根因: 研究子 Agent 默认拥有全部工具 (含 playwright 浏览器), 在 WebFetch 失败时倾向 "想尽办法拿到正文", 缺少 "抓不到就跳过 + 标注" 的硬约束; 且派活时没有显式禁止 GUI 浏览器降级, 把 "是否开浏览器" 的判断权留给了子 Agent。已确认本次主力检索 (四个研究 Agent) 实际走的是 WebSearch / WebFetch, 仅在 bot 拦截页发生了浏览器降级。

## 应沉淀的上下文或规则

- routine 网络检索的默认且唯一工具是 WebSearch + WebFetch。派研究子 Agent 时必须在提示中显式写明: "禁止打开或调用任何 GUI 浏览器 (playwright 等) 做网页抓取"。
- 一手页面被 bot 拦截 (403 / Cloudflare) 时, 按序改用: (1) 该站的 .md 版本 (如 developers.openai.com/<path>.md); (2) 官方镜像 / 公告页; (3) 搜索结果摘要; 仍拿不到则跳过, 并在产出中标注 "未能抓取正文, 仅据摘要 / 二手", 而非开浏览器。
- 仅当用户明确要求 "用浏览器实测 / 截图 / 交互验证" 等场景, 才使用浏览器自动化 (见 .agents/workflow/verify.md 的 UI 实测约定)。
- 互补的信源策略见 docs/friction/20260530-design-official-docs-before-volatile-product-assumptions.md (官方 / 一手优先 + 双源互证 + 标注厂商 claim)。

## 建议的流程改进

(由 harness-optimization 消费) 在派研究类子 Agent 的标准提示模板中固化两条: (1) 仅用 WebSearch / WebFetch, 禁止 GUI 浏览器降级; (2) 抓取失败的处理阶梯 (.md 版本 -> 官方镜像 -> 摘要 -> 跳过并标注)。Explore 阶段 checklist 增加一项 "网络检索工具合规"。
