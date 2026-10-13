import type { NarrativeIR, IRNode, IREdge } from '../../core/ir/types'
import { genId } from '../../core/ir/factory'

// IR ↔ FlowGram 双向适配器（FlowGram 集成仅限本目录使用）

export interface FlowGramNodeJSON {
  id: string
  type: string
  meta: { position: { x: number; y: number } }
  data: Record<string, unknown>
}

export interface FlowGramEdgeJSON {
  id: string
  sourceNodeID: string
  targetNodeID: string
  sourcePortID?: string
}

export interface FlowGramDocument {
  nodes: FlowGramNodeJSON[]
  edges: FlowGramEdgeJSON[]
}

/** IR → FlowGram 文档数据 */
export function irToFlowGram(ir: NarrativeIR): FlowGramDocument {
  return {
    nodes: ir.nodes.map((n, i) => ({
      id: n.id,
      type: n.type,
      meta: {
        position: n.position ?? {
          x: (i % 6) * 280,
          y: Math.floor(i / 6) * 180,
        },
      },
      data: { fields: n.fields },
    })),
    edges: ir.edges.map((e) => ({
      id: e.id,
      sourceNodeID: e.from,
      targetNodeID: e.to,
      sourcePortID: e.fromPort || undefined,
    })),
  }
}

/** FlowGram 文档数据 → IR（保留画布不感知的 meta/sourceRow 等信息） */
export function flowGramToIR(doc: FlowGramDocument, previousIR: NarrativeIR): NarrativeIR {
  const prevNodeMap = new Map(previousIR.nodes.map((n) => [n.id, n]))
  const prevEdgeMap = new Map(previousIR.edges.map((e) => [e.id, e]))
  const prevEdgeKeyMap = new Map(
    previousIR.edges.map((e) => [`${e.from}|${e.fromPort}|${e.to}`, e]),
  )

  const nodes = doc.nodes.map((n) => {
    const prev = prevNodeMap.get(n.id)
    const dataFields = (n.data?.fields ?? {}) as Record<string, unknown>
    const node: IRNode = {
      id: n.id,
      type: n.type,
      fields: dataFields,
      position: n.meta?.position ?? prev?.position,
      meta: prev?.meta,
    }
    return node
  })

  const edges = doc.edges.map((e) => {
    const fromPort = e.sourcePortID || 'out'
    const prev =
      prevEdgeMap.get(e.id) ??
      prevEdgeKeyMap.get(`${e.sourceNodeID}|${fromPort}|${e.targetNodeID}`)
    const edge: IREdge = {
      id: e.id || genId('e'),
      from: e.sourceNodeID,
      fromPort,
      to: e.targetNodeID,
      type: prev?.type ?? 'next',
      label: prev?.label,
      order: prev?.order,
      condition: prev?.condition,
      effects: prev?.effects,
      meta: prev?.meta,
    }
    return edge
  })

  return {
    ...previousIR,
    nodes,
    edges,
    meta: { ...previousIR.meta, updatedAt: new Date().toISOString() },
  }
}
