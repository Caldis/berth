# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

GitHub Issue: https://github.com/Caldis/berth/issues/59

## 正文

## Summary

Overview shows a prominent 7-day cost total, but it does not show whether the amount is actual, estimated, mixed, or unknown. Users can misread local estimates as provider billing.

## Evidence

- Screenshot: `C:\Users\mail\AppData\Local\Temp\berth-uiux-audit-overview.png`
- Current code: `src/renderer/src/pages/overview.tsx` renders the cost total without `CostSourceBadge` or scope notice.
- Usage page already shows `CostSourceBadge` and explains local scan / pricing catalog boundaries.

## Expected

Overview cost card should show the same cost source badge used by Usage and a short tooltip/title explaining the source scope.

## Verification

Add renderer coverage and verify the Overview screenshot in zh/dark mode.
