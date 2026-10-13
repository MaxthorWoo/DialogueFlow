import { useState } from 'react'
import { usePlaygroundTools } from '@flowgram.ai/free-layout-editor'
import { ZoomIn, ZoomOut, Maximize, LayoutGrid, Plus } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { genId } from '../../core/ir/factory'

// 画布浮动工具栏：缩放/适应/自动布局/添加节点

export function CanvasToolbar() {
  const tools = usePlaygroundTools()
  const nodeTypes = useProjectStore((s) => s.ir.nodeTypes)
  const addNode = useProjectStore((s) => s.addNode)
  const nodes = useProjectStore((s) => s.ir.nodes)
  const [adding, setAdding] = useState(false)

  const handleAdd = (type: string) => {
    setAdding(false)
    const maxPos = nodes.reduce(
      (acc, n) => ({ x: Math.max(acc.x, n.position?.x ?? 0), y: Math.max(acc.y, n.position?.y ?? 0) }),
      { x: 120, y: 120 },
    )
    addNode({
      id: genId('n'),
      type,
      fields: {},
      position: { x: maxPos.x, y: maxPos.y },
    })
  }

  const btn =
    'flex items-center justify-center w-8 h-8 rounded-md bg-ink-800 hover:bg-ink-700 text-gray-300 hover:text-white transition-colors'

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-ink-900/90 border border-ink-700 shadow-lg backdrop-blur z-10">
      <button className={btn} title="放大" onClick={() => tools.zoomin()}>
        <ZoomIn size={15} />
      </button>
      <button className={btn} title="缩小" onClick={() => tools.zoomout()}>
        <ZoomOut size={15} />
      </button>
      <button className={btn} title="适应视图" onClick={() => tools.fitView()}>
        <Maximize size={15} />
      </button>
      <div className="w-px h-5 bg-ink-700 mx-1" />
      <button
        className={btn}
        title="自动布局"
        onClick={() => {
          tools.autoLayout({} as never).then(() => tools.fitView())
        }}
      >
        <LayoutGrid size={15} />
      </button>
      <div className="w-px h-5 bg-ink-700 mx-1" />
      <div className="relative">
        <button className={btn} title="添加节点" onClick={() => setAdding(!adding)}>
          <Plus size={15} />
        </button>
        {adding && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 min-w-32 rounded-lg bg-ink-900 border border-ink-700 shadow-xl py-1 animate-fade-in">
            {nodeTypes.map((t) => (
              <button
                key={t.type}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-ink-700 hover:text-white transition-colors"
                style={{ borderLeft: `3px solid ${t.color ?? '#4A90D9'}` }}
                onClick={() => handleAdd(t.type)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
