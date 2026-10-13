import { WorkflowNodeRenderer, WorkflowPortRender, useNodeRender } from '@flowgram.ai/free-layout-editor'
import type { FlowNodeEntity } from '@flowgram.ai/free-layout-editor'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { NodeTypeDefinition, PortDefinition } from '../../core/ir/types'

// 通用叙事节点渲染器：所有节点类型共用一个组件，外观由 NodeTypeDefinition 决定

const DEFAULT_COLORS: Record<string, string> = {
  say: '#4A90D9', choice: '#E8A838', branch: '#9B59B6',
  action: '#27AE60', jump: '#7F8C8D', end: '#E74C3C',
}

function summarizeFields(fields: Record<string, unknown>, def?: NodeTypeDefinition): string {
  if (!def) return ''
  const lines: string[] = []
  for (const f of def.fields) {
    const v = fields[f.key]
    if (v === undefined || v === null || v === '') continue
    const text = typeof v === 'object' ? JSON.stringify(v) : String(v)
    lines.push(text.length > 60 ? text.slice(0, 60) + '…' : text)
  }
  return lines.join('\n')
}

/** 端口定位样式 */
function portStyle(portType: string, portId: string, index: number, total: number): React.CSSProperties {
  if (portType === 'input') {
    return { left: -5, top: '50%', transform: 'translateY(-50%)' }
  }
  if (total === 1) return { right: -5, top: '50%', transform: 'translateY(-50%)' }
  const ratio = (index + 1) / (total + 1)
  return { right: -5, top: `${ratio * 100}%`, transform: 'translateY(-50%)' }
}

export function NarrativeNode({ node }: { node: FlowNodeEntity }) {
  const { data, selected, startDrag, selectNode, ports, nodeRef, onFocus, onBlur } = useNodeRender()
  const nodeTypes = useProjectStore((s) => s.ir.nodeTypes)
  const selectNodeInStore = useEditorStore((s) => s.selectNode)

  const nodeType = nodeTypes.find((t) => t.type === node.flowNodeType)
  const color = nodeType?.color ?? DEFAULT_COLORS[node.flowNodeType as string] ?? '#4A90D9'
  const label = nodeType?.label ?? String(node.flowNodeType)
  const fields = (data?.fields ?? {}) as Record<string, unknown>

  const outputPorts = ports.filter((p) => p.type === 'output' || p.type === 'directed')
  let outputIndex = 0

  return (
    <WorkflowNodeRenderer
      node={node}
      style={{
        background: 'var(--nf-node-bg, #22262E)',
        borderRadius: 10,
        border: selected ? `2px solid ${color}` : '1px solid #3A404C',
        boxShadow: selected ? `0 0 0 3px ${color}33, 0 6px 16px rgba(0,0,0,0.35)` : '0 2px 8px rgba(0,0,0,0.25)',
        minWidth: 180,
        maxWidth: 260,
        cursor: 'grab',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      portStyle={{ width: 10, height: 10, borderRadius: '50%', background: '#9CA3AF', border: '2px solid #1A1D23', cursor: 'crosshair' }}
    >
      <div
        style={{ padding: '8px 12px' }}
        onMouseDown={(e) => startDrag(e)}
        onClick={(e) => {
          selectNode(e)
          selectNodeInStore(node.id)
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: color }}>{label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6B7280', fontFamily: 'monospace' }}>
            {node.id.length > 12 ? node.id.slice(0, 12) + '…' : node.id}
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            lineHeight: 1.5,
            color: '#E8EAED',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: 72,
            overflow: 'hidden',
          }}
        >
          {summarizeFields(fields, nodeType) || '（空节点）'}
        </div>
      </div>
      {ports.map((p) => {
        const isOutput = p.type === 'output' || p.type === 'directed'
        const style = portStyle(p.type as string, '', isOutput ? outputIndex++ : 0, Math.max(outputPorts.length, 1))
        return (
          <WorkflowPortRender
            key={p.id}
            entity={p}
            style={style}
            primaryColor={color}
          />
        )
      })}
    </WorkflowNodeRenderer>
  )
}
