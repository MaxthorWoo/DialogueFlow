import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

// 悬浮软提示：小图标 + 悬停弹出的说明框
// 浮层通过 portal 渲染到页面顶层，不会被 overflow 容器/弹窗裁剪

interface Props {
  title: string
  description: string
  /** 图标额外类名 */
  className?: string
}

const W = 256
const MAX_H = 200

export function InfoTip({ title, description, className = '' }: Props) {
  const iconRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const show = () => {
    const r = iconRef.current?.getBoundingClientRect()
    if (!r) return
    // 默认弹在图标下方居中；越界时向内收，底部放不下则弹到上方
    let left = r.left + r.width / 2 - W / 2
    left = Math.min(Math.max(8, left), window.innerWidth - W - 8)
    const below = r.bottom + 6
    const top = below + MAX_H > window.innerHeight - 8 ? Math.max(8, r.top - MAX_H - 6) : below
    setPos({ left, top })
  }

  return (
    <>
      <span
        ref={iconRef}
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
      >
        <Info size={12} className="text-gray-500 hover:text-brand cursor-help" />
      </span>

      {pos && (
        createPortal(
          <div
            className="fixed z-[80] w-64 px-3 py-2 rounded-lg bg-ink-950 border border-ink-600 shadow-xl pointer-events-none"
            style={{ left: pos.left, top: pos.top }}
            role="tooltip"
          >
            <div className="text-xs font-semibold text-gray-100 mb-0.5">{title}</div>
            <div className="text-[11px] leading-relaxed text-gray-400">{description}</div>
          </div>,
          document.body,
        )
      )}
    </>
  )
}
