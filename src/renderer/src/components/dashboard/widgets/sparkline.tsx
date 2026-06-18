// GH-138: 共享内联 sparkline (无依赖 SVG, 单色 primary) — 小尺寸每日走势折线。
// stats-band (token 近况) / spend (花费近况) 复用; data 少于 2 点返回 null (无可画趋势)。
export function Sparkline({ data }: { data: number[] }): React.ReactElement | null {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 64
  const h = 16
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-4 w-16" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
