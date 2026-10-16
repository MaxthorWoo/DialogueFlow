import { Fragment } from 'react'
import { WorkflowNodeRenderer, useNodeRender } from '@flowgram.ai/free-layout-editor'
import type { FlowNodeEntity } from '@flowgram.ai/free-layout-editor'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { NodeTypeDefinition } from '../../core/ir/types'

// 通用叙事节点渲染器：所有节点类型共用一个组件，外观由 NodeTypeDefinition 决定
// 端口由 WorkflowNodeRenderer 内置渲染（每个端口一个点：默认灰、连接/悬停时为主题色）

const DEFAULT_COLORS: Record<string, string> = {
  say: '#4A90D9', choice: '#E8A838', branch: '#9B59B6',
  action: '#27AE60', jump: '#7F8C8D', end: '#E74C3C',
}

function textOf(v: unknown, max = 60): string {
  const text = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return text.length > max ? text.slice(0, max) + '…' : text
}

function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null || v === '' || v === false) return true
  if (Array.isArray(v) && v.length === 0) return true
  return false
}

/**
 * 字段行：标签（= 导入时的列名）+ 值
 * 展示节点实际拥有的全部字段，跳过空值与 false
 */
function fieldRows(fields: Record<string, unknown>, def?: NodeTypeDefinition) {
  const defMap = new Map((def?.fields ?? []).map((f) => [f.key, f]))
  const orderedKeys = [
    ...(def?.fields ?? []).map((f) => f.key).filter((k) => k in fields),
    ...Object.keys(fields).filter((k) => !defMap.has(k)),
  ]
  const rows: Array<{ label: string; value: string }> = []
  for (const key of orderedKeys) {
    const v = fields[key]
    if (isEmptyValue(v)) continue
    rows.push({ label: key, value: textOf(v, 80) })
  }
  return rows
}

export function NarrativeNode({ node }: { node: FlowNodeEntity }) {
  const { data, selected, startDrag, selectNode, onFocus, onBlur } = useNodeRender()
  const nodeTypes = useProjectStore((s) => s.ir.nodeTypes)
  const selectNodeInStore = useEditorStore((s) => s.selectNode)

  const nodeType = nodeTypes.find((t) => t.type === node.flowNodeType)
  const color = nodeType?.color ?? DEFAULT_COLORS[node.flowNodeType as string] ?? '#4A90D9'
  const label = nodeType?.label ?? String(node.flowNodeType)
  const fields = (data?.fields ?? {}) as Record<string, unknown>
  const rows = fieldRows(fields, nodeType)

  return (
    <WorkflowNodeRenderer
      node={node}
      style={{
        background: 'var(--nf-node-bg, #22262E)',
        borderRadius: 10,
        border: selected ? `2px solid ${color}` : '1px solid var(--nf-node-border, #3A404C)',
        boxShadow: selected
          ? `0 0 0 3px ${color}33, var(--nf-node-shadow-sel, 0 6px 16px rgba(0,0,0,0.35))`
          : 'var(--nf-node-shadow, 0 2px 8px rgba(0,0,0,0.25))',
        minWidth: 300,
        maxWidth: 420,
        cursor: 'grab',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease',
      }}
      portStyle={{ cursor: 'crosshair' }}
      portPrimaryColor={color}
      portSecondaryColor="#9CA3AF"
      portBackgroundColor="var(--nf-node-bg, #22262E)"
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
          <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: 'var(--nf-node-id, #6B7280)',
              fontFamily: 'monospace',
              maxWidth: '50%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            {node.id}
          </span>
        </div>
        {rows.length > 0 ? (
          <div
            style={{
              marginTop: 6,
              display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              columnGap: 10,
              rowGap: 3,
              maxHeight: 150,
              overflow: 'hidden',
              alignItems: 'start',
            }}
          >
            {rows.map((r, i) => (
              <Fragment key={i}>
                <span
                  style={{
                    color: 'var(--nf-node-id, #6B7280)',
                    fontSize: 11,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.label}
                </span>
                <span
                  style={{
                    color: 'var(--nf-node-text, #E8EAED)',
                    wordBreak: 'break-all',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {r.value}
                </span>
              </Fragment>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--nf-node-id, #6B7280)' }}>（空节点）</div>
        )}
      </div>
    </WorkflowNodeRenderer>
  )
}
