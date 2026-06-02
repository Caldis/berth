# PRD 快照 (只读)

来源: https://github.com/Caldis/berth/issues/54

## 正文

## Problem
The app has moved toward a neutral monochrome visual system, but shared scope badges still use blue, green, and purple category colors for user/project/enterprise scopes. These are category labels rather than status or risk signals, so the color competes with the new visual direction.

## Expected
Scope badges should use a restrained neutral treatment across scopes. The label text still communicates the scope; status colors such as success/warning/error should remain unchanged.

## Acceptance
- Shared ScopeBadge no longer uses blue/green/purple/orange Tailwind category classes.
- Existing consumers keep the same sizing and layout.
- Renderer test covers the shared palette so future category colors do not drift back.
