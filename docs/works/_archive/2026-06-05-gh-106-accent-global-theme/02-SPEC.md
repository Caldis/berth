# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。决策: **甲** (导航选中态也改 `--primary` 跟随 picker)。

## 数据契约

无 IPC / 数据模型变更。纯 renderer 主题层 (CSS token + React Context + Tailwind class)。

**Accent 枚举扩展** (`theme-provider.tsx`):
- `type Accent = 'neutral' | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'` (neutral 置首)
- `ACCENTS: Accent[] = ['neutral', 'blue', 'violet', 'emerald', 'amber', 'rose']`
- `defaultAccent = 'neutral'` (line 36); `ThemeContext` 默认 `accent: 'neutral'` (line 21)
- `isAccent()` 自动随 ACCENTS 扩展; localStorage 已存旧值 (blue 等) 仍合法, 保留 (AC6/AC7)

## 任务分类与 debt
- **type / subtype**: feature; 无 maintenance subtype。
- **source.kind / refs**: user-request; refs [GH-105]。
- **debt.estimate**: incurred 4 / repaid 2 / net 2 / scope module / risk medium / areas [ui-ux, architecture] / confidence medium (explore 已校准, design 确认一致, 不追加 revision)。
- **debt.final 预期**: net ≈2; repaid 来自偿还 GH-105 选中态误用 `--accent` 的语义错位。
- **Project 字段同步**: ensure 已同步 (item In Progress); archive 时 done 同步 final。
- debt pool total=4 (ok), 无需 override。

## 模块结构 / 组件拆分

遵守 ARCHITECTURE: renderer-only, 不碰 main/preload/IPC。

### A. 中性 accent token (globals.css, unlayered, AC1/AC2)
新增两块 unlayered 选择器 (与现有 `html[data-accent='violet']` 同层级, 紧随其后), 因 `--heroui-primary` 由 HeroUI plugin 在 `@layer base` 注入, 仅 unlayered 选择器能覆盖:

```css
/* 浅色: 中性黑 (复刻当前 --accent 浅色, 驱动到 --primary) */
html[data-accent='neutral'] {
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --ring: 240 5.9% 10%;
  --heroui-primary: 240 5.9% 10%;
  --heroui-primary-500: 240 5.9% 10%;
  --heroui-primary-foreground: 0 0% 98%;
  --heroui-focus: 240 5.9% 10%;
}
/* 深色: 中性白 (复刻当前 --accent 深色) */
html.dark[data-accent='neutral'] {
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --ring: 0 0% 98%;
  --heroui-primary: 0 0% 98%;
  --heroui-primary-500: 0 0% 98%;
  --heroui-primary-foreground: 240 5.9% 10%;
  --heroui-focus: 0 0% 98%;
}
```
neutral 是唯一需要浅/深分支的 accent (彩色浅深同色); `:root` 默认蓝保留为 `data-accent='blue'` 的回退, 不动。

### B. 选中态/启用态改 `--primary` (AC3, 甲)
将语义为"主色强调"但误用 `--accent` 的消费点改 `--primary` 家族:

| 文件:行 | 现状 | 改为 |
|---|---|---|
| sidebar.tsx:144 | `bg-accent text-accent-foreground` (导航选中) | `bg-primary text-primary-foreground` |
| search-dialog.tsx:346 | `bg-accent text-accent-foreground` (结果选中) | `bg-primary text-primary-foreground` |
| settings.tsx:68 | `bg-accent` (toggle 启用) | `bg-primary` |
| settings.tsx:173-174 | `border-accent bg-accent/10` + `hover:border-accent/50` (theme 选中) | `border-primary bg-primary/10` + `hover:border-primary/50` |
| settings.tsx:179 | `text-accent` (check) | `text-primary` |
| settings.tsx:208-209,214 | 同 173-174,179 (language) | 同上 |
| local-sources-section.tsx:126,188,256 | `border-accent/30 bg-accent/10` (列表选中) | `border-primary/30 bg-primary/10` |

### C. 保持中性 (不改, AC4)
- 18 处 `hover:bg-accent/5` (通用 hover 反馈)
- 7 处 `sidebar-accent*` (侧栏局部 hover)
- 结构 `border-border` / `bg-card` / `bg-muted` / `--foreground`

### D. picker swatch + i18n (AC1)
- `settings.tsx` accents 数组首位加 `{ id: 'neutral', label: 'Neutral', color: ... }`; swatch 用 `hsl(var(--foreground))` 自适应 (浅黑/深白), 确保深色下圆点可辨 (依托 `border-2`)。
- i18n `en/zh`: `settings.accent.neutral` = "Neutral" / "中性"。

### E. 默认值与首帧 (AC2/AC7)
- `theme-provider.tsx` 默认 accent 'neutral'。无 localStorage 用户首启即中性。
- 首帧闪烁: `data-accent` 由 useEffect (line 71) 设置, render 后生效, 首帧可能短暂回退 `:root` 蓝。若 Electron 启动可见闪烁, 将 line 71 `useEffect` 改 `useLayoutEffect` (paint 前同步); implement 时实测决定。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | picker 由 5 增至 6 swatch, `gap-2.5` 下仍宽松, 不换行 | 截图浅/深; 目测无拥挤 |
| 组件选择 / 设计系统一致性 | 沿用现有 swatch 结构 (h-9 圆 + h-5 内圆 + check); neutral 用 foreground 色 | 截图对比 5 彩色 swatch 一致 |
| 交互反馈 / 状态切换 | 切 accent 即时全局变色 (导航/toggle/选中/CTA); neutral 默认复刻当前观感 | 切 6 色逐一截图, 导航选中跟随 |
| loading / empty / error / disabled / focus | focus ring 随 accent (`--ring`); neutral focus 为中性; 其余态不涉及 | 键盘 focus swatch 截图 |
| 响应式 / 可访问性 / 键盘可达 | radio role + aria-checked + 箭头键 (已有); neutral aria-label 用 i18n | settings-accent.test 断言; 键盘截图 |
| 文案 / i18n / 数字和路径格式 | en/zh `settings.accent.neutral` | i18n 文件 diff; 切语言截图 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| neutral accent 默认 + data-accent 写入 + --primary 中性 | renderer | tests/renderer/theme-accent.test.tsx | pnpm test | — |
| picker 含 neutral swatch + 默认选中 + 点击/键盘切换 | renderer | tests/renderer/settings-accent.test.tsx | pnpm test | — |
| sidebar active 用 bg-primary (非 bg-accent) | renderer | tests/renderer/sidebar.test.tsx (新建或并入现有 layout 测试) | pnpm test | — |
| 选中态消费点改 primary (settings toggle/选中) | renderer | settings-accent.test.tsx 扩展 class 断言 | pnpm test | — |
| 浅/深 × 6 accent 视觉: 选中态全局跟随, hover/结构保持中性 | manual/screenshot | Electron 主进程坐标裁剪截图 | 见 4.0-verify | 视觉一致性需人眼/截图; 单测仅覆盖 class 断言, 颜色渲染需实测 |
| typecheck / lint / 全量 | harness | — | pnpm harness:prepush | — |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| A 中性 token | AC1, AC2, AC5 |
| B 选中态改 primary | AC3 |
| C 保持中性 | AC4 |
| D swatch + i18n | AC1 |
| E 默认值/首帧 | AC2, AC7 |
| 既有彩色不回归 | AC6 |
