import { forwardRef } from 'react'
import { Button as HeroUIButton, type ButtonProps } from '@heroui/react'

// GH-138: berth Button — HeroUI Button 默认关闭 ripple, 与全应用大量原生 <button> 的"无涟漪"
// 体感统一 (克制编辑感; 用户反馈 ripple 仅零星出现在 HeroUI Button 处, 属不一致)。
// 需要时可显式 disableRipple={false} opt-in。
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return <HeroUIButton ref={ref} disableRipple {...props} />
})

export type { ButtonProps }
