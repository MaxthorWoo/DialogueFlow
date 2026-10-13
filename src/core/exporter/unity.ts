import type { NarrativeIR, NodeTypeDefinition } from '../ir/types'

// Unity 运行时 JSON 导出器

export interface UnityExportOptions {
  stripEditorMeta: boolean
  stripPositions: boolean
  prettyPrint: boolean
  includeNodeTypes: boolean
}

export const defaultUnityExportOptions: UnityExportOptions = {
  stripEditorMeta: true,
  stripPositions: true,
  prettyPrint: true,
  includeNodeTypes: true,
}

function buildNodeTypesMap(nodeTypes: NodeTypeDefinition[]) {
  const map: Record<string, unknown> = {}
  for (const t of nodeTypes) {
    const fields: Record<string, string> = {}
    for (const f of t.fields) fields[f.key] = f.type
    const ports: Record<string, unknown> = {}
    for (const p of t.ports) {
      ports[p.id] = {
        label: p.label,
        edgeType: p.edgeType ?? null,
        multiple: p.multiple ?? false,
      }
    }
    map[t.type] = { label: t.label, fields, ports }
  }
  return map
}

export function exportToUnityJSON(ir: NarrativeIR, options: UnityExportOptions): string {
  const output: Record<string, unknown> = {
    format: 'narrative-runtime',
    version: 1,
    startNodeId: ir.startNodeId || null,
    variables: ir.variables.map((v) => ({
      name: v.name,
      type: v.type,
      defaultValue: v.defaultValue,
      description: v.description ?? null,
    })),
    nodeTypes: options.includeNodeTypes ? buildNodeTypesMap(ir.nodeTypes) : undefined,
    nodes: ir.nodes.map((n) => {
      const node: Record<string, unknown> = {
        id: n.id,
        type: n.type,
        fields: n.fields,
      }
      if (!options.stripPositions && n.position) node.position = n.position
      if (!options.stripEditorMeta && n.meta && Object.keys(n.meta).length > 0) {
        node.meta = n.meta
      }
      return node
    }),
    edges: ir.edges.map((e) => ({
      id: e.id,
      from: e.from,
      fromPort: e.fromPort,
      to: e.to,
      type: e.type,
      label: e.label ?? null,
      order: e.order ?? null,
      condition: e.condition ?? null,
      effects: e.effects ?? null,
    })),
  }
  if (!options.includeNodeTypes) delete output.nodeTypes
  return options.prettyPrint ? JSON.stringify(output, null, 2) : JSON.stringify(output)
}
