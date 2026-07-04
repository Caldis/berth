# REJECTED: 扫描 helper 看门狗超时窗口做成 GUI 可配置设置

- 裁决日期: 2026-07-04 (GH-151 design Q3)
- 概念别名: watchdog timeout 设置项 / 无响应阈值可调 / inactivity timeout 暴露给用户

## 提案

helper 无消息看门狗 (GH-151 P0-3, 默认 120s) 的窗口值暴露为扫描设置面板的可配置项。

## 耐久拒绝理由 (真权衡)

该值是内部健壮性参数, 用户没有合理依据去调它 — 暴露只会制造又一个"安慰剂设置" (scanConcurrency/minFreeDiskMb/contentHash 全仓零消费仍 GUI 可编辑的反模式, GH-152 T3 刚清理过一批, 标注 supported:false)。正确形态: 内部常量 + 构造注入供测试; 若未来真有慢环境误杀案例, 先调默认值或按 progress 心跳自适应, 而不是甩给用户一个数字输入框。

## 何时可重开

出现真实用户环境的看门狗误杀报告且无法用自适应心跳解决时。

## 出处

docs/works/_archive/2026-07-04-gh-151-scan-engine-audit-fixes/01-ANALYSIS.md Q3 / 02-SPEC 裁决。
