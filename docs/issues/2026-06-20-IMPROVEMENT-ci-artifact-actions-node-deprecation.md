# IMPROVEMENT: CI artifact actions Node 弃用警告 (release.yml)

状态: OPEN (低优, 非阻塞)

## 描述
v0.4.4 release run (`27872913540`) 成功, 但带 deprecation 注解: `actions/upload-artifact@v4` / `actions/download-artifact@v4` 在 Node.js 24 runner 上触发 Node 20 弃用警告 (informational, 未影响构建/发布)。

## 影响
- 当前: 仅警告, release 全绿, 全平台 assets + `latest*.yml` 正常产出。
- 未来: GitHub 最终下线旧 action 主版本时会变红, 届时阻塞发布。属预防性 CI 卫生。

## 建议
- 核 `.github/workflows/release.yml` (及其它 workflow) 的 `actions/*-artifact` 版本, 升到当前无弃用警告的 major; 顺带核 `actions/checkout` / `setup-node` 等是否同有弃用。
- 验收: 下一次 release run 的 annotations 无 artifact-action 弃用警告。

## 来源
v0.4.4 发布监控 (2026-06-20) 回读 release run annotations 时发现; 与本批主线 (issue/friction 收敛) 无关, 交叉引用记录, 不在本批修。

## 核实 (2026-06-20, 无干净本地修复 — 转监控)
- 核 `.github/workflows/release.yml`: `upload-artifact@v4` + `download-artifact@v4` 均已是**当前最大 major** (artifact actions 无 v5); 其余 `checkout@v5` / `setup-node@v5` / `pnpm/action-setup@v6` 均最新。
- 故该弃用是 **GitHub 平台级 Node runtime 弃用** (Node 20→24 迁移), 由 action 作者在 v4.x 内升级 Node 基座解决, `@v4` tag 会自动取到最新 v4.x —— **无 major 可升, 无干净本地改动**; 强行 pin 具体 commit/未发布 tag 反而有破坏发布风险且无法本机验证。
- 处置: **转监控** (won't-fix-now)。GitHub 真正强制下线 Node 20 时弃用变红才需动作 (届时 artifact actions v4.x 大概率已 Node24-ready, 仅需确认 `@v4` 已滚到该版)。本 issue 保留作未来回看锚点, 非本批可关闭项。
