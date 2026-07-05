import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  hide,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Padding,
  type Placement
} from '@floating-ui/react'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLProps,
  type ReactElement,
  type ReactNode
} from 'react'
import { cn } from '@/lib/utils'

type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
type FloatingAlign = 'start' | 'center' | 'end'
type FloatingRole = 'tooltip' | 'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'grid' | 'tree'
type FloatingInteraction = 'hover' | 'click'

interface FloatingPopoverProps {
  trigger: ReactElement
  children: ReactNode
  id?: string
  triggerTestId?: string
  contentTestId?: string
  triggerClassName?: string
  contentClassName?: string
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  alignOffset?: number
  collisionPadding?: Padding
  closeDelay?: number
  safePolygonBuffer?: number
  hoverBridge?: boolean
  role?: FloatingRole
  /** 'hover' (default) opens on hover/focus/click; 'click' opens on click only
   * and manages focus (return-to-trigger on close) for menu-like content. */
  interaction?: FloatingInteraction
  /** Controlled open state; when provided, onOpenChange must apply the change. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function floatingPlacement(side: FloatingSide, align: FloatingAlign): Placement {
  return align === 'center' ? side : `${side}-${align}`
}

function referenceHasLayout(
  reference: { getBoundingClientRect: () => { width: number; height: number } } | null
): boolean {
  if (!reference || typeof reference.getBoundingClientRect !== 'function') return false
  const rect = reference.getBoundingClientRect()
  return rect.width > 0 || rect.height > 0
}

const DEFAULT_CLOSE_DELAY_MS = 80
const DEFAULT_SAFE_POLYGON_BUFFER_PX = 8

// Electron 拖拽区 (-webkit-app-region: drag) 在 OS 层吞掉鼠标事件, useDismiss
// 的 outside-press 收不到标题栏上的点击, click 弹层会停留在原地。打开期间给根
// 元素挂标记 (CSS 见 globals.css), 把拖拽区临时降级为 no-drag; 计数器兼容多个
// 弹层重叠打开的情况。
let titlebarDragSuspensions = 0
function suspendTitlebarDrag(): () => void {
  titlebarDragSuspensions += 1
  document.documentElement.classList.add('suspend-titlebar-drag')
  return () => {
    titlebarDragSuspensions = Math.max(0, titlebarDragSuspensions - 1)
    if (titlebarDragSuspensions === 0) {
      document.documentElement.classList.remove('suspend-titlebar-drag')
    }
  }
}

export function FloatingPopover({
  trigger,
  children,
  id,
  triggerTestId,
  contentTestId,
  triggerClassName,
  contentClassName,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 16,
  closeDelay = DEFAULT_CLOSE_DELAY_MS,
  safePolygonBuffer: safePolygonBufferProp,
  hoverBridge: hoverBridgeEnabled = false,
  role,
  interaction = 'hover',
  open: controlledOpen,
  onOpenChange
}: FloatingPopoverProps): React.ReactElement {
  const generatedId = useId()
  const contentId = id ?? `floating-popover-${generatedId}`
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (controlledOpen === undefined) setUncontrolledOpen(next)
    },
    [controlledOpen, onOpenChange]
  )
  const [hoverBridgeStyle, setHoverBridgeStyle] = useState<CSSProperties | null>(null)
  const { refs, floatingStyles, context, middlewareData, isPositioned, placement } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: floatingPlacement(side, align),
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({ mainAxis: sideOffset, alignmentAxis: alignOffset }),
      flip({ padding: collisionPadding }),
      shift({ padding: collisionPadding }),
      hide({ padding: collisionPadding })
    ]
  })
  const safePolygonBuffer = safePolygonBufferProp ?? Math.max(DEFAULT_SAFE_POLYGON_BUFFER_PX, sideOffset)
  const hoverBridge = useMemo(
    () => safePolygon({ buffer: safePolygonBuffer, requireIntent: false }),
    [safePolygonBuffer]
  )
  const hover = useHover(context, {
    enabled: interaction === 'hover',
    mouseOnly: true,
    delay: { open: 0, close: closeDelay },
    handleClose: hoverBridge
  })
  const focus = useFocus(context, { enabled: interaction === 'hover' })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const floatingRole = useRole(context, { enabled: Boolean(role), role })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    floatingRole
  ])

  if (!isValidElement(trigger)) {
    throw new Error('FloatingPopover trigger must be a valid React element')
  }

  const triggerProps = trigger.props as { className?: string }
  const triggerWithAria = cloneElement(trigger, getReferenceProps({
    ...triggerProps,
    ref: refs.setReference,
    'data-testid': triggerTestId,
    'aria-describedby': open ? contentId : undefined,
    'aria-expanded': open,
    className: cn(triggerProps.className, triggerClassName)
  } as HTMLProps<Element>) as Partial<unknown>)
  // hide() 判定只有在 reference 真实可测量 (非零尺寸) 时才可信: 零尺寸意味着
  // 环境没有布局 (如 jsdom), 遮挡无从判断, 不应把浮层置为 visibility:hidden
  // (role 查询会将 hidden 子树整体排除)。真实浏览器中在视区外的 trigger 仍有
  // 非零尺寸, hide 行为不受影响。
  const referenceHidden =
    middlewareData.hide?.referenceHidden === true && referenceHasLayout(refs.reference.current)

  useLayoutEffect(() => {
    if (!open || interaction !== 'click') return undefined
    return suspendTitlebarDrag()
  }, [interaction, open])
  const updateHoverBridge = useCallback(() => {
    const reference = refs.reference.current
    const floating = refs.floating.current

    if (!hoverBridgeEnabled || !reference || !floating) {
      setHoverBridgeStyle(null)
      return
    }

    const referenceRect = reference.getBoundingClientRect()
    const floatingRect = floating.getBoundingClientRect()
    const bridgePadding = Math.max(safePolygonBuffer, sideOffset, 12)
    const left = Math.min(referenceRect.left, floatingRect.left) - floatingRect.left - bridgePadding
    const top = Math.min(referenceRect.top, floatingRect.top) - floatingRect.top - bridgePadding
    const right = Math.max(referenceRect.right, floatingRect.right) - floatingRect.left + bridgePadding
    const bottom = Math.max(referenceRect.bottom, floatingRect.top) - floatingRect.top + bridgePadding

    setHoverBridgeStyle({
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    })
  }, [hoverBridgeEnabled, refs.floating, refs.reference, safePolygonBuffer, sideOffset])

  useLayoutEffect(() => {
    if (!open || !isPositioned) {
      setHoverBridgeStyle(null)
      return undefined
    }

    let frame = window.requestAnimationFrame(updateHoverBridge)
    const scheduleUpdate = (): void => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateHoverBridge)
    }

    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [isPositioned, open, updateHoverBridge])

  const floatingContent = (
    <div
      ref={refs.setFloating}
      {...getFloatingProps({
        id: contentId,
        role,
        'data-testid': contentTestId,
        'data-placement': placement,
        style: {
          ...floatingStyles,
          visibility: referenceHidden ? 'hidden' : undefined,
          opacity: isPositioned ? undefined : 0,
          pointerEvents: isPositioned ? undefined : 'none'
        }
      } as HTMLProps<HTMLElement>)}
      id={contentId}
      role={role}
      data-testid={contentTestId}
      data-placement={placement}
      className="relative z-50 w-max max-w-[calc(100vw-2rem)] outline-none"
    >
      {hoverBridgeEnabled && hoverBridgeStyle && (
        <div
          aria-hidden="true"
          data-testid={contentTestId ? `${contentTestId}-hover-bridge` : undefined}
          className="titlebar-no-drag absolute z-0 bg-transparent"
          style={hoverBridgeStyle}
        />
      )}
      <div
        className={cn(
          'relative z-10 max-w-[calc(100vw-2rem)] outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150',
          contentClassName ?? 'rounded-md border border-border bg-popover text-popover-foreground shadow-lg'
        )}
      >
        {children}
      </div>
    </div>
  )

  return (
    <>
      {triggerWithAria}
      {open && (
        <FloatingPortal>
          {interaction === 'click' ? (
            // Menu-like content: trap-free focus scope that returns focus to the
            // trigger on dismiss (Escape / outside press).
            <FloatingFocusManager context={context} modal={false}>
              {floatingContent}
            </FloatingFocusManager>
          ) : (
            floatingContent
          )}
        </FloatingPortal>
      )}
    </>
  )
}
