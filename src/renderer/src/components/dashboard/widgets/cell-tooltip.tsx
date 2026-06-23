import { useCallback, useState, type MouseEvent, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

// GH-150: 热力图/punch-card 格子的即时悬浮提示 (替代原生 title 的延迟+难看)。
// 共享浮层 (单实例 + 事件更新位置/内容), 避免给每个格子挂独立 Tooltip 组件的开销;
// createPortal 到 body 规避卡片 overflow-hidden 裁剪; fixed 定位在格子正上方居中。

interface TipState {
  x: number
  y: number
  lines: string[]
}

export function useCellTooltip(): {
  show: (e: MouseEvent<HTMLElement>, lines: string[]) => void
  hide: () => void
  tooltip: ReactElement | null
} {
  const [tip, setTip] = useState<TipState | null>(null)

  const show = useCallback((e: MouseEvent<HTMLElement>, lines: string[]): void => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ x: r.left + r.width / 2, y: r.top, lines })
  }, [])
  const hide = useCallback((): void => setTip(null), [])

  const tooltip = tip
    ? createPortal(
        <div
          style={{ position: 'fixed', left: tip.x, top: tip.y - 8, transform: 'translate(-50%, -100%)' }}
          className="pointer-events-none z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg"
        >
          {tip.lines.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-medium' : 'text-background/70'}>
              {line}
            </div>
          ))}
        </div>,
        document.body
      )
    : null

  return { show, hide, tooltip }
}
