import { useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { validateIR } from '../../core/validator/engine'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'

// 校验结果面板：点击问题定位节点/边

export function ValidationPanel() {
  const ir = useProjectStore((s) => s.ir)
  const selectNode = useEditorStore((s) => s.selectNode)
  const selectEdge = useEditorStore((s) => s.selectEdge)
  const issues = useMemo(() => validateIR(ir), [ir])

  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  const infos = issues.filter((i) => i.severity === 'info')

  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
          错误 {errors.length}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
          警告 {warnings.length}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
          提示 {infos.length}
        </span>
      </div>
      {issues.length === 0 && (
        <div className="text-sm text-nodeAction text-center pt-8">✓ 校验通过，没有发现问题</div>
      )}
      {issues.map((issue, i) => (
        <button
          key={i}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-start gap-2 transition-colors hover:brightness-125 ${
            issue.severity === 'error'
              ? 'bg-red-500/10 text-red-400'
              : issue.severity === 'warning'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-blue-500/10 text-blue-400'
          }`}
          onClick={() => {
            if (issue.nodeId) selectNode(issue.nodeId)
            else if (issue.edgeId) selectEdge(issue.edgeId)
          }}
        >
          {issue.severity === 'error' ? (
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
          ) : issue.severity === 'warning' ? (
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          ) : (
            <Info size={13} className="mt-0.5 shrink-0" />
          )}
          <div>
            <div>{issue.message}</div>
            <div className="text-gray-500 font-mono mt-0.5">{issue.code}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
