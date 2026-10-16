import { useEffect, useRef, useState } from 'react'
import { useClientContext, PlaygroundConfigEntity } from '@flowgram.ai/free-layout-editor'
import { useProjectStore } from '../../store/useProjectStore'

// 画布小地图：节点缩略布局 + 当前视口框，可点击/拖动快速定位
// 坐标系说明：FlowGram 的 scrollX/Y 是"屏幕坐标"（screen = world * zoom - scroll），
// 因此视口的世界范围 = scroll / zoom，视口尺寸 = 画布尺寸 / zoom

const W = 176
const H = 120
const PAD = 60 // 内容边界外扩，避免节点贴着小地图边缘

export function CanvasMinimap() {
  const ctx = useClientContext()
  const nodeTypes = useProjectStore((s) => s.ir.nodeTypes)
  const [, setTick] = useState(0)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // 定时刷新（视口/节点位置变化）
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 250)
    return () => window.clearInterval(t)
  }, [])

  const getLayout = () => {
    const config = ctx.get<PlaygroundConfigEntity>(PlaygroundConfigEntity)
    const c = config.config
    const nodes = ctx.document.getAllNodes()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      const b = n.bounds
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }
    if (!Number.isFinite(minX)) {
      minX = 0
      minY = 0
      maxX = 800
      maxY = 600
    }
    // 内容边界只由节点决定（固定，不随视口变化），外扩留白
    minX -= PAD
    minY -= PAD
    maxX += PAD
    maxY += PAD
    const cw = Math.max(maxX - minX, 1)
    const ch = Math.max(maxY - minY, 1)
    const scale = Math.min(W / cw, H / ch)
    const ox = minX - (W - cw * scale) / 2
    const oy = minY - (H - ch * scale) / 2
    // 视口的世界范围（scroll 是屏幕坐标，需换算回世界坐标）
    const viewX = c.scrollX / c.zoom
    const viewY = c.scrollY / c.zoom
    const viewW = c.width / c.zoom
    const viewH = c.height / c.zoom
    return {
      config,
      nodes,
      scale,
      ox,
      oy,
      viewX,
      viewY,
      viewW,
      viewH,
      zoom: c.zoom,
      screenW: c.width,
      screenH: c.height,
    }
  }

  const toWorld = (cx: number, cy: number) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const l = getLayout()
    return { x: l.ox + (cx - rect.left) / l.scale, y: l.oy + (cy - rect.top) / l.scale }
  }

  const centerOn = (wx: number, wy: number) => {
    const l = getLayout()
    l.config.updateConfig({
      scrollX: wx * l.zoom - l.screenW / 2,
      scrollY: wy * l.zoom - l.screenH / 2,
    })
  }

  const { nodes, scale, ox, oy, viewX, viewY, viewW, viewH } = getLayout()
  const colorOf = (type: string) =>
    nodeTypes.find((t) => t.type === type)?.color ?? '#4A90D9'

  return (
    <div
      ref={mapRef}
      className="absolute right-4 bottom-4 z-10 rounded-lg bg-ink-900/90 border border-ink-700 shadow-lg backdrop-blur overflow-hidden cursor-pointer"
      style={{ width: W, height: H }}
      title="小地图：点击或拖动定位"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = toWorld(e.clientX, e.clientY)
        centerOn(p.x, p.y)
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        const p = toWorld(e.clientX, e.clientY)
        centerOn(p.x, p.y)
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
    >
      <svg width={W} height={H}>
        {nodes.map((n) => {
          const b = n.bounds
          return (
            <rect
              key={n.id}
              x={(b.x - ox) * scale}
              y={(b.y - oy) * scale}
              width={Math.max(2, b.width * scale)}
              height={Math.max(2, b.height * scale)}
              rx={1.5}
              fill={colorOf(n.flowNodeType as string)}
              opacity={0.75}
            />
          )
        })}
        <rect
          x={(viewX - ox) * scale}
          y={(viewY - oy) * scale}
          width={viewW * scale}
          height={viewH * scale}
          fill="rgba(74,144,217,0.12)"
          stroke="#4A90D9"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  )
}
