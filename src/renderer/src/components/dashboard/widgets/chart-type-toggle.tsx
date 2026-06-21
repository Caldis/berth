import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'
import { SegmentedTabs } from '@/components/ui'

// GH-138 R2-B: 可复用图表形态切换控件 + 受控/非受控状态 hook。
// 渲染经 SegmentedTabs (全应用统一分段控件: 同心圆角 + 滑块动画 + a11y) 的图标项。
// 持久化: 网格内由 layout 提供 chartType + onChartTypeChange (受控持久化); 库内预览等场景
// 缺 onChartTypeChange 时退化为本地态 (非受控), 控件仍可用但不落盘。

export interface ChartFormOption<T extends string> {
  id: T
  icon: LucideIcon
  /** 已本地化的可读标签 (用作 aria-label + title)。 */
  label: string
}

/**
 * 受控优先、本地兜底的形态状态。
 * @param options 合法形态列表 (用于校验外部值)
 * @param fallback 默认形态
 * @param controlled 外部持久化值 (来自 layout.chartType); 非法/缺省时回落
 * @param onChange 外部持久化回调; 提供则受控 (落盘), 缺省则用本地 state
 */
export function useChartForm<T extends string>(
  options: readonly T[],
  fallback: T,
  controlled: string | undefined,
  onChange: ((value: string) => void) | undefined
): readonly [T, (value: T) => void] {
  const [local, setLocal] = useState<T>(fallback)
  const isValid = (v: string | undefined): v is T => v != null && (options as readonly string[]).includes(v)
  const value = isValid(controlled) ? controlled : isValid(local) ? local : fallback
  const setValue = useCallback(
    (next: T) => {
      if (onChange) onChange(next)
      else setLocal(next)
    },
    [onChange]
  )
  return [value, setValue] as const
}

export function ChartTypeToggle<T extends string>({
  options,
  value,
  onChange
}: {
  options: readonly ChartFormOption<T>[]
  value: T
  onChange: (value: T) => void
}): React.ReactElement {
  const { t } = useTranslation()
  return (
    <SegmentedTabs
      ariaLabel={t('overview.dashboard.chartForm.label')}
      items={options.map(({ id, icon: Icon, label }) => ({
        key: id,
        label: <Icon className="h-3.5 w-3.5" />,
        ariaLabel: label
      }))}
      selectedKey={value}
      onSelectionChange={onChange}
    />
  )
}
