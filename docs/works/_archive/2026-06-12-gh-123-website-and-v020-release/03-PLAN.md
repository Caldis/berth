# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行。

- [x] T1 版本 bump + 官网四语内容更新 — DONE: package.json 0.2.0 + APP_VERSION v0.2 + features ×4 语 ×3 处 (只读口径去版本钉死/sessions 篇重放口径) + guides ×4 语 ×1 处; 整串替换全命中零 MISS; website 12 测 + build + typecheck 绿, 全仓 typecheck + 1062 绿
  - 内容: package.json 0.2.0; site.ts APP_VERSION v0.2; features ×4 语言 ×3 处 (只读口径去版本钉死 + sessions 篇重放口径) + guides ×4 语言 ×1 处。
  - tests: website content 测试 + website build; 全仓 typecheck/test (版本 bump 回归)。
  - verify: 四语对称自查; 措辞对照 App 实现 (重放/时间轴)。
- [x] T2 推送 + 官网上线 — DONE: T1 推送 CI 绿; **deploy-website 自 06-07 红根修** (root pnpm-workspace 拦截 website 裸 install → --ignore-workspace, 本地实证+commit fd16c18d); explore 漏扫 .json 致 i18n locales 四语 v0.1 残留 ×6/语, 全量清零 (5eb5bee6, 含'聚焦 Claude Code'过时事实改双 agent); deploy ×2 success, 线上 /zh 直拉 v0.1=0 + 新口径命中
  - 内容: prepush + push; ci:wait; deploy-website workflow 成功确认; 线上 zh/en 抽验。
  - tests: 门禁命令 + workflow conclusion。
  - verify: AC-3。
- [x] T3 win 打包 + 冒烟 — DONE: nsis setup 91.9MB + portable 91.7MB + blockmap (未签名同先例); win-unpacked 隔离 user-data 启动冒烟 (窗口 Berth, exe 0.2.0.0, 精确 PID 停止)
  - 内容: `pnpm package:win`; dist 产物清单 (setup.exe/portable); win-unpacked/berth.exe 启动冒烟 (窗口出现 + 资产加载)。
  - tests: manual 冒烟 (理由见 SPEC)。
  - verify: AC-4。
- [x] T4 Release v0.2.0 发布 — DONE: tag v0.2.0@5eb5bee6 + Release (Highlights 八域/Assets win 三件/mac 后补+未签名声明/Verification); release list 确认 Latest
  - 内容: tag v0.2.0 (指向 T2 后 HEAD); gh release create — Highlights notes + win 资产上传 + mac 后补/未签名声明; release 页核验。
  - tests: manual 核验 (外发终态)。
  - verify: AC-5/6; debt.final 回填。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
