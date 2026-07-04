# IMPROVEMENT: 健康面板缺少手动"强制重查" (force:true) 入口

- 日期: 2026-07-04
- 状态: open
- 来源: GH-153 4.0-verify 实测发现 (综合审查 P2 批次三)

## 现象

`useHealthChecks.refresh({ force: true })` 的 force 语义已在 hook/缓存层修复并可用 (GH-153 T3: `CachedResource.forceRequest` 链后保序, 软刷在途时 force 必然出程), 但全 renderer 目前**没有任何 UI 调用点传 `force: true`**:

- 唯一手动触发是 health-entry 错误态的 onRetry, 传的是 `force: false` (`src/renderer/src/components/dashboard/health/health-entry.tsx:142`)。
- 即用户无法从界面主动发起"绕过缓存与软刷、强制全量重查健康状态"。审查报告设想的"重新检查"按钮实际不存在。

## 影响

低。onChanged 软刷已覆盖常规场景; 缺的是用户显式怀疑健康结果过期时的手动强刷入口 (例如修完配置后想立即确认)。

## 建议方向

- health 面板 (点开态) 增加"重新检查"动作, 调 `refresh({ force: true })`; 或
- 错误态 onRetry 升级为 force:true (语义上 retry 更接近强制重查)。

## 交叉引用

- GH-153 任务态: docs/works/2026-07-04-gh-153-audit-p2-renderer-perf-fixes/ (T3 已交付机制层; 本条为 UI 缺口, 不入该批验收范围)
- 机制测试: tests/renderer/cached-resource.test.ts / use-health-checks.test.tsx
