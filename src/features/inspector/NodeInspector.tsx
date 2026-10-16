import { useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { FieldRenderer } from './fields/FieldRenderer'
import { validateIR } from '../../core/validator/engine'

// 节点属性面板：动态展示节点实际拥有的字段（即导入时分配了角色的列）

const inputCls =
  'w-full px-2 py-1.5 rounded-md bg-ink-800 border border-ink-700 text-sm text-gray-200 focus:outline-none focus:border-brand transition-colors'

export function NodeInspector() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const ir = useProjectStore((s) => s.ir)
  const updateNodeField = useProjectStore((s) => s.updateNodeField)
  const removeNode = useProjectStore((s) => s.removeNode)
  const setStartNode = useProjectStore((s) => s.setStartNode)

  const node = ir.nodes.find((n) => n.id === selectedNodeId)
  const nodeType = ir.nodeTypes.find((t) => t.type === node?.type)

  if (!node || !nodeType) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center pt-10">
        选中画布中的节点以编辑属性
      </div>
    )
  }

  const variables = ir.variables.map((v) => v.name)
  const nodeOptions = ir.nodes.map((n) => {
    const t = ir.nodeTypes.find((td) => td.type === n.type)
    const text = n.fields?.['text'] ?? n.fields?.['speaker'] ?? ''
    return { id: n.id, label: `${n.id}（${t?.label ?? n.type}${text ? ' · ' + String(text).slice(0, 12) : ''}）` }
  })

  const issues = validateIR(ir).filter((i) => i.nodeId === node.id)

  // 动态字段：只展示节点实际拥有的字段（即导入时分配了角色的列）
  // 标签优先用类型定义的显示名；类型定义之外的列按值推断类型
  const fieldDefs = useMemo(() => {
    const nodeFields = (node.fields ?? {}) as Record<string, unknown>
    const defMap = new Map(nodeType.fields.map((f) => [f.key, f]))
    const orderedKeys = [
      ...nodeType.fields.map((f) => f.key).filter((k) => k in nodeFields),
      ...Object.keys(nodeFields).filter((k) => !defMap.has(k)),
    ]
    return orderedKeys.map((key) => {
      const def = defMap.get(key)
      if (def) return def
      const v = nodeFields[key]
      const type = typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'float' : typeof v === 'object' ? 'json' : 'string'
      return { key, label: key, type: type as import('../../core/ir/types').FieldType }
    })
  }, [node, nodeType])

  return (
    <div className="p-3 space-y-4 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: nodeType.color ?? '#4A90D9' }}
          />
          <h3 className="text-sm font-semibold text-gray-200">{nodeType.label}</h3>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-gray-400 mb-1">节点 ID</label>
          <input className={`${inputCls} font-mono text-xs`} value={node.id} readOnly />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            className={`flex-1 px-2 py-1.5 rounded-md text-xs border transition-colors ${
              ir.startNodeId === node.id
                ? 'bg-brand/20 border-brand text-brand'
                : 'bg-ink-800 border-ink-700 text-gray-300 hover:text-white'
            }`}
            onClick={() => setStartNode(node.id)}
          >
            {ir.startNodeId === node.id ? '★ 起始节点' : '设为起始节点'}
          </button>
          <button
            className="px-2 py-1.5 rounded-md text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            onClick={() => {
              removeNode(node.id)
              useEditorStore.getState().selectNode(null)
            }}
          >
            删除节点
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-ink-700 pt-3">
        {fieldDefs.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={node.fields?.[field.key]}
            variables={variables}
            nodeOptions={nodeOptions}
            onChange={(v) => updateNodeField(node.id, field.key, v)}
          />
        ))}
        {fieldDefs.length === 0 && (
          <div className="text-xs text-gray-600">该节点没有字段</div>
        )}
      </div>

      {issues.length > 0 && (
        <div className="border-t border-ink-700 pt-3 space-y-1">
          <h4 className="text-xs font-semibold text-gray-400">此节点的问题</h4>
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                issue.severity === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : issue.severity === 'warning'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-ink-700 pt-3">
        <label className="block text-xs text-gray-400 mb-1">注释</label>
        <textarea
          className={`${inputCls} min-h-12 text-xs`}
          value={node.meta?.comment ?? ''}
          onChange={(e) => {
            const comment = e.target.value || undefined
            useProjectStore.getState().setIR({
              ...ir,
              nodes: ir.nodes.map((n) =>
                n.id === node.id ? { ...n, meta: { ...n.meta, comment } } : n,
              ),
            })
          }}
        />
      </div>
    </div>
  )
}
