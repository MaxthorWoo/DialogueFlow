import { ShieldCheck, X } from 'lucide-react'
import { useMemo } from 'react'
import { validateIR } from '../../core/validator/engine'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { ValidationPanel } from './ValidationPanel'

// 底部浮动的校验结果窗（类似 IDE 的 Problems 面板，非常驻）

export function ValidationDrawer() {
  const ir = useProjectStore((s) => s.ir)
  const setShowValidation = useEditorStore((s) => s.setShowValidation)
  const issues = useMemo(() => validateIR(ir), [ir])
  const errorCount = issues.filter((i) => i.severity === 'error').length

  return (
    <div className="absolute left-3 bottom-3 z-30 w-[520px] max-w-[calc(100%-24px)] max-h-[42vh] flex flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700 bg-ink-800 shrink-0">
        <ShieldCheck size={13} className="text-brand" />
        <span className="text-xs font-semibold text-gray-200">校验</span>
        {errorCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">
            错误 {errorCount}
          </span>
        )}
        <button
          className="ml-auto text-gray-500 hover:text-white transition-colors"
          onClick={() => setShowValidation(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <ValidationPanel />
      </div>
    </div>
  )
}
