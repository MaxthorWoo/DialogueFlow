import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

// 自定义下拉框：展开后鼠标悬停选项停留片刻，无需选中即可弹出该项的说明浮层

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  tip?: string
}

interface Props<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  className?: string
  /** 值不在选项中时显示的占位文字 */
  placeholder?: string
}

const TIP_DELAY = 450 // 悬停多久后弹出说明（毫秒）
const ITEM_H = 27
const MAX_POPUP_H = 320

export function SelectWithTips<T extends string>({ value, options, onChange, className = '', placeholder }: Props<T>) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const hoverTimer = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tip, setTip] = useState<{ title: string; text: string; left: number; top: number } | null>(null)

  const openPopup = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.max(r.width, 200)
    const estH = Math.min(options.length * ITEM_H + 8, MAX_POPUP_H)
    const openUp = r.bottom + estH > window.innerHeight && r.top - estH > 0
    setPos({ left: r.left, top: openUp ? r.top - estH - 4 : r.bottom + 4, width })
    setHovered(null)
    setTip(null)
    setOpen(true)
  }

  const close = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    setTip(null)
    setHovered(null)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element
      if (btnRef.current?.contains(t) || t.closest('[data-select-popup]')) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    // 打开期间：滚轮直接滚动下拉框内容（在框内走默认滚动，在框外则转发给下拉框），不关闭
    const onWheel = (e: WheelEvent) => {
      const popup = document.querySelector('[data-select-popup]')
      if (!popup) return
      if (popup.contains(e.target as Node)) return
      e.preventDefault()
      popup.scrollBy({ top: e.deltaY })
    }
    // 缩放窗口后浮层位置失效，直接收起
    const onResize = () => close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }, [])

  const enterItem = (opt: SelectOption<T>, el: HTMLElement) => {
    setHovered(opt.value)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setTip(null)
    const tipText = opt.tip
    if (!tipText) return
    const r = el.getBoundingClientRect()
    hoverTimer.current = window.setTimeout(() => {
      // 默认弹在右侧；靠右边缘时弹到左侧
      const W = 288
      let left = r.right + 8
      if (left + W > window.innerWidth - 8) left = r.left - W - 8
      const top = Math.min(Math.max(8, r.top - 8), window.innerHeight - 120)
      setTip({ title: opt.label, text: tipText, left, top })
    }, TIP_DELAY)
  }

  const leaveItem = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHovered(null)
    setTip(null)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`${className} flex items-center justify-between gap-1`}
        onClick={() => (open ? close() : openPopup())}
      >
        <span className="truncate">
          {options.find((o) => o.value === value)?.label ?? (value || placeholder)}
        </span>
        <ChevronDown size={12} className="text-gray-500 shrink-0" />
      </button>

      {open && pos && (
        createPortal(
          <div
            data-select-popup
            className="fixed z-[70] max-h-80 overflow-auto rounded-lg bg-ink-800 border border-ink-600 shadow-xl py-1"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                  opt.value === hovered
                    ? 'bg-ink-600 text-gray-100'
                    : opt.value === value
                      ? 'text-brand'
                      : 'text-gray-300'
                }`}
                onMouseEnter={(e) => enterItem(opt, e.currentTarget)}
                onMouseLeave={leaveItem}
                onClick={() => {
                  onChange(opt.value)
                  close()
                }}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <Check size={12} className="shrink-0" />}
              </div>
            ))}
          </div>,
          document.body,
        )
      )}

      {tip && (
        createPortal(
          <div
            className="fixed z-[80] w-72 px-3 py-2 rounded-lg bg-ink-950 border border-ink-600 shadow-xl pointer-events-none"
            style={{ left: tip.left, top: tip.top }}
          >
            <div className="text-xs font-semibold text-gray-100 mb-0.5">{tip.title}</div>
            <div className="text-[11px] leading-relaxed text-gray-400">{tip.text}</div>
          </div>,
          document.body,
        )
      )}
    </>
  )
}
