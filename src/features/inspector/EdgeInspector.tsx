import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { ConditionField } from './fields/ConditionField'
import { EffectField } from './fields/EffectField'

// 边属性面板：编辑选中边的标签/排序/条件/效果

const inputCls =
  'w-full px-2 py-1.5 rounded-md bg-ink-800 border border-ink-700 text-sm text-gray-200 focus:outline-none focus:border-brand transition-colors'

export function EdgeInspector() {
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const ir = useProjectStore((s) => s.ir)
  const setIR = useProjectStore((s) => s.setIR)

  const edge = ir.edges.find((e) => e.id === selectedEdgeId)
  if (!edge) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center pt-10">
        在左侧校验列表或画布中选择连线以编辑
      </div>
    )
  }

  const patch = (updates: Partial<typeof edge>) => {
    setIR({
      ...ir,
      edges: ir.edges.map((e) => (e.id === edge.id ? { ...e, ...updates } : e)),
    })
  }

  const fromNode = ir.nodes.find((n) => n.id === edge.from)
  const toNode = ir.nodes.find((n) => n.id === edge.to)
  const variables = ir.variables.map((v) => v.name)

  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-200">连线属性</h3>
      <div className="text-xs text-gray-400 space-y-1">
        <div>
          源：
          <button className="text-brand hover:underline" onClick={() => selectNode(edge.from)}>
            {edge.from}
            {fromNode ? `（${ir.nodeTypes.find((t) => t.type === fromNode.type)?.label ?? fromNode.type}）` : ''}
          </button>
        </div>
        <div>
          目标：
          <button className="text-brand hover:underline" onClick={() => selectNode(edge.to)}>
            {edge.to}
            {toNode ? `（${ir.nodeTypes.find((t) => t.type === toNode.type)?.label ?? toNode.type}）` : ''}
          </button>
        </div>
        <div className="font-mono text-gray-600">端口 {edge.fromPort} · 类型 {edge.type}</div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">标签（选项文本）</label>
        <input
          className={inputCls}
          value={edge.label ?? ''}
          onChange={(e) => patch({ label: e.target.value || undefined })}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">排序（同端口内）</label>
        <input
          type="number"
          className={inputCls}
          value={edge.order ?? ''}
          onChange={(e) => patch({ order: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </div>

      <div className="border-t border-ink-700 pt-3">
        <label className="block text-xs text-gray-400 mb-1.5">条件</label>
        <ConditionField
          value={edge.condition}
          variables={variables}
          onChange={(v) => patch({ condition: v })}
        />
      </div>

      <div className="border-t border-ink-700 pt-3">
        <label className="block text-xs text-gray-400 mb-1.5">效果</label>
        <EffectField value={edge.effects} onChange={(v) => patch({ effects: v })} />
      </div>

      <button
        className="w-full px-2 py-1.5 rounded-md text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
        onClick={() => {
          setIR({ ...ir, edges: ir.edges.filter((e) => e.id !== edge.id) })
          useEditorStore.getState().selectEdge(null)
        }}
      >
        删除连线
      </button>
    </div>
  )
}
