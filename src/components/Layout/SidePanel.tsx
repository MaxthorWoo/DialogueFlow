import { useEditorStore } from '../../store/useEditorStore'
import { NodeInspector } from '../../features/inspector/NodeInspector'
import { EdgeInspector } from '../../features/inspector/EdgeInspector'
import { ValidationPanel } from '../../features/validator/ValidationPanel'

// 左侧功能面板 + 右侧属性面板（组合为一个侧栏组件）

export function SidePanel() {
  const leftPanel = useEditorStore((s) => s.leftPanel)
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const selectEdge = useEditorStore((s) => s.selectEdge)

  return (
    <div className="flex min-h-0">
      {/* 左侧功能面板 */}
      <aside
        className={`w-80 border-r border-ink-700 bg-ink-900 flex flex-col min-h-0 transition-all overflow-hidden ${
          leftPanel === 'none' ? 'w-0 border-r-0' : ''
        }`}
      >
        {leftPanel === 'import' && null}
        {leftPanel === 'validate' && <ValidationPanel />}
      </aside>

      {/* 右侧属性面板 */}
      <aside className="w-80 border-l border-ink-700 bg-ink-900 overflow-auto min-h-0 flex flex-col">
        <div className="flex border-b border-ink-700 text-xs">
          <button
            className={`flex-1 py-2 transition-colors ${
              !selectedEdgeId || selectedNodeId ? 'text-gray-200 bg-ink-800' : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => selectEdge(null)}
          >
            节点属性
          </button>
          <button
            className={`flex-1 py-2 transition-colors ${
              selectedEdgeId ? 'text-gray-200 bg-ink-800' : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => selectNode(null)}
          >
            连线属性
          </button>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {selectedEdgeId ? <EdgeInspector /> : <NodeInspector />}
        </div>
      </aside>
    </div>
  )
}
