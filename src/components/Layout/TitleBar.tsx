import { Minus, Square, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

// 自绘窗口标题栏：与工具栏同色系（Tauri decorations: false）
// 浏览器环境（无 Tauri）下不渲染

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const btnCls =
  'w-11 h-8 flex items-center justify-center text-gray-400 hover:bg-ink-700 hover:text-white transition-colors'

export function TitleBar() {
  if (!isTauri) return null

  const win = getCurrentWindow()

  return (
    <div className="h-8 shrink-0 flex items-stretch bg-ink-900 border-b border-ink-800 select-none">
      <div className="flex items-center gap-2 px-3 flex-1" data-tauri-drag-region>
        <div
          className="w-3.5 h-3.5 rounded bg-gradient-to-br from-brand to-[#2B6CB0]"
          data-tauri-drag-region
        />
        <span className="text-xs text-gray-400" data-tauri-drag-region>
          NarrativeFlow - 叙事数据编辑器
        </span>
      </div>
      <button
        className={btnCls}
        title="最小化"
        onClick={() => win.minimize()}
      >
        <Minus size={13} />
      </button>
      <button
        className={btnCls}
        title="最大化/还原"
        onClick={() => win.toggleMaximize()}
      >
        <Square size={11} />
      </button>
      <button
        className="w-11 h-8 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
        title="关闭"
        onClick={() => win.close()}
      >
        <X size={13} />
      </button>
    </div>
  )
}
