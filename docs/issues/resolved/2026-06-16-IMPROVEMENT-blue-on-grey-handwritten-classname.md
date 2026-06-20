# IMPROVEMENT: 蓝字灰底残留 — 手写 className 的 primary-on-flat

状态: OPEN (组件层已根治, 手写 className 层待治理)
关联: commit dcc0044 (组件层根治 + ESLint 护栏); GH-105 SPEC「蓝色仅用于 CTA/数据」

## 背景
用户反馈界面频繁出现「蓝字配灰色底」的 tag/button, 非常丑。subagent 深度调查确认根因:
HeroUI `variant="flat" × color="primary"` = `bg-primary/20`(20% 透明蓝, 视觉发灰) + `text-primary`(蓝字);
品牌 primary 是蓝 (`--primary: 212 100% 47%`)。封装把 `tone="primary"` 当普通信息色暴露 +
Button/Tabs 裸 re-export, 使该组合成为零阻力默认路径。

## 已根治 (commit dcc0044)
- **组件层 (Chip/Button/Tabs)**: Chip 封装删除 `tone='primary'` (TS 编译期堵死);
  3 处误用改语义色 (cost-source estimated→neutral / teams in_progress→warning / lead→neutral);
  teams 开 lead session 按钮去 `color=primary`。
- **ESLint 护栏**: 禁业务层直接 import HeroUI Chip/Button/Tabs (ui/** 放行);
  禁 `color=primary × variant=flat/light/faded` JSX 字面量组合。

## 残留 (本 issue 待办)
ESLint `no-restricted-syntax` 只能抓 JSX 属性字面量, **抓不到手写 className 字符串**。
subagent 列出的手写 `bg-primary/10 text-primary` (多为 filter/选中态高亮) 未被护栏覆盖:
- `src/renderer/src/components/memory/memory-view.tsx:415` (source filter pill 选中态)
- `src/renderer/src/pages/instructions.tsx:410` (scope filter pill 选中态)
- `src/renderer/src/pages/session-detail.tsx:667` (model tooltip 触发)
- `src/renderer/src/pages/session-detail.tsx:239` (tab 计数徽章选中态)
- `src/renderer/src/components/sessions/session-replay.tsx:410` (事件行选中底)
- 硬编码 `text-blue-500` (绕过主题 token): instructions.tsx:152 / session-detail.tsx:326 / overview.tsx:765

注: 上述多为**选中态高亮**, 用 accent 色是常见合理模式, 与「信息 tag 误用 primary」语义不同。
是否统一改为中性高亮属设计决策, 需视觉确认, 非无脑替换。

## 后续治理选项
1. 逐个评估选中态 pill: 保留 accent 高亮 vs 改中性 (border + bg-accent + text-foreground)。
2. (可选) Tailwind class lint (eslint-plugin-tailwindcss 或自定义) 禁 `bg-primary/[低透明] + text-primary` 组合;
   代价: 可能误伤合法的 accent 选中态 + 图表 fill, 需 allowlist。
3. 收编硬编码 `text-blue-500` → `text-primary` 或语义 token (5 分钟, 独立小项)。
