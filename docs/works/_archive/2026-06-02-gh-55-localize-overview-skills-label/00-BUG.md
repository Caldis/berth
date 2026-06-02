# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/55

## 正文

## Problem
In the Chinese UI, the Overview metric card still shows `Skills` while adjacent metric labels use Chinese text such as `会话` and `插件`. This creates an inconsistent first-screen localization surface.

## Expected
The Overview skills metric label should be localized in Chinese. This is a visible first-screen label and should not fall back to English.

## Evidence
Observed in a real agent-owned Electron screenshot on 2026-06-02: `C:\Users\mail\AppData\Local\Temp\berth-ui-audit-neutral-badges-overview.png`.

## Acceptance
- `overview.stats.skills` in zh uses Chinese text.
- Renderer test covers the Overview metric label in Chinese.
- Local checks and GitHub Actions pass before and after push.
