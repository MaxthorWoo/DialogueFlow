import { useState } from 'react'
import { X, Copy, Check, FileJson } from 'lucide-react'
import { exportToUnityJSON, defaultUnityExportOptions, type UnityExportOptions } from '../../core/exporter/unity'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { exportRuntimeJSON } from '../../lib/tauri'

// 导出对话框：Unity 运行时 JSON 预览与保存

export function ExportDialog() {
  const ir = useProjectStore((s) => s.ir)
  const setShowExport = useEditorStore((s) => s.setShowExport)
  const [options, setOptions] = useState<UnityExportOptions>(defaultUnityExportOptions)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const json = exportToUnityJSON(ir, options)

  const toggle = (key: keyof UnityExportOptions) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }))

  const handleSave = async () => {
    setError(null)
    const result = await exportRuntimeJSON(json, 'narrative-runtime.json')
    if (result.ok) setSaved(result.path ?? '已保存')
    else setError(result.error ?? '保存失败')
  }

  const optionRows: Array<{ key: keyof UnityExportOptions; label: string }> = [
    { key: 'stripEditorMeta', label: '剥离编辑期信息（sourceRow/comment）' },
    { key: 'stripPositions', label: '剥离节点坐标' },
    { key: 'prettyPrint', label: '格式化输出' },
    { key: 'includeNodeTypes', label: '包含 nodeTypes 定义' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-[720px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <FileJson size={16} className="text-nodeAction" /> 导出 Unity 运行时 JSON
          </h2>
          <button className="text-gray-500 hover:text-white" onClick={() => setShowExport(false)}>
            ✕
          </button>
        </div>
        <div className="p-4 border-b border-ink-700 grid grid-cols-2 gap-2">
          {optionRows.map((row) => (
            <label key={row.key} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#4A90D9]"
                checked={options[row.key]}
                onChange={() => toggle(row.key)}
              />
              {row.label}
            </label>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap bg-ink-950 rounded-lg p-3 border border-ink-700 max-h-96 overflow-auto">
            {json.slice(0, 8000)}
            {json.length > 8000 ? '\n…（截断预览）' : ''}
          </pre>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700">
          <div className="text-xs">
            {error && <span className="text-red-400">{error}</span>}
            {saved && !error && <span className="text-nodeAction">✓ {saved}</span>}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-ink-800 border border-ink-700 text-gray-300 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(json)
                setSaved('已复制到剪贴板')
              }}
            >
              <Copy size={14} /> 复制
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-nodeAction hover:brightness-110 text-white text-sm flex items-center gap-1.5 transition-all"
              onClick={handleSave}
            >
              <Check size={14} /> 保存到文件
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
