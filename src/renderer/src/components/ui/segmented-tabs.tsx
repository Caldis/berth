import { Tabs, Tab } from '@heroui/react'
import type { ReactNode } from 'react'

// berth 规范分段控件 (segmented control): 薄封装 HeroUI Tabs 作纯选择器 (无内容面板)。
// 收敛全应用各自手写的 size / range / metric / chart-form 等 pill 切换为单一来源 —— 一处焊死:
//   · 同心圆角: tabList rounded-md = calc(var(--radius)-2px), 减 p-0.5(2px) = calc(var(--radius)-4px) = cursor rounded-sm
//   · 选中滑块滑动动画: HeroUI cursor slot (framer-motion 驱动), 切换时在选项间平滑滑动
//   · 键盘 / 可达性: React Aria roving tabindex + 方向键
// 不暴露改外观的 className 逃生舱给"内容"层; 仅 base 透传供布局对齐 (w-fit / self-end 等)。

export interface SegmentedItem<K extends string> {
  key: K
  /** 可见内容: 文字或图标。图标-only 项须配 ariaLabel 提供可达名称。 */
  label: ReactNode
  /** 图标-only 项的可达名称 (文字项可省略)。 */
  ariaLabel?: string
}

interface SegmentedTabsProps<K extends string> {
  items: readonly SegmentedItem<K>[]
  selectedKey: K
  onSelectionChange: (key: K) => void
  /** 控件整体可达名称 (HeroUI Tabs / React Aria 要求)。 */
  ariaLabel: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  /** 透传到 base slot, 仅用于外层布局对齐 (不改控件内部外观)。 */
  className?: string
}

const SEGMENTED_CLASSNAMES = {
  tabList: 'rounded-md bg-muted/50 p-0.5 gap-0.5',
  cursor: 'rounded-sm bg-background shadow-sm',
  tab: 'h-auto px-2 py-0.5',
  tabContent: 'text-[11px] font-medium text-muted-foreground group-data-[selected=true]:text-foreground'
}

export function SegmentedTabs<K extends string>({
  items,
  selectedKey,
  onSelectionChange,
  ariaLabel,
  size = 'sm',
  fullWidth = false,
  className
}: SegmentedTabsProps<K>): React.ReactElement {
  return (
    <Tabs
      aria-label={ariaLabel}
      size={size}
      fullWidth={fullWidth}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange(key as K)}
      classNames={{ ...SEGMENTED_CLASSNAMES, base: className }}
    >
      {items.map((item) => (
        <Tab key={item.key} aria-label={item.ariaLabel} title={item.label} />
      ))}
    </Tabs>
  )
}
