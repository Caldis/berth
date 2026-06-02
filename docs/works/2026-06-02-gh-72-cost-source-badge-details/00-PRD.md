# PRD 快照 (只读)

来源: GitHub Issue #72 - https://github.com/Caldis/berth/issues/72

## 正文

## Problem

Overview and Usage show compact cost source badges such as actual, estimated, mixed, and unknown. The label alone is too vague, especially on Overview where large local cost estimates can look like provider billing.

## Expected

Cost source badges should expose a concise explanation on hover and to assistive technology. The shared badge should clarify whether the displayed cost is provider-reported, locally estimated, mixed, or unknown, while preserving the compact layout.

## Scope

- Shared renderer cost source badge
- Overview cost card
- Usage summary/explanation surfaces
- i18n for English and Chinese
- Renderer tests for title/accessible explanation

## Verification

- Target renderer tests
- Web typecheck
- Harness checks
- Local UI screenshot/interaction check
- Pre-push local checks and GitHub Actions wait after push
