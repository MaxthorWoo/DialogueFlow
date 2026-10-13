import type { IRNode, IREdge, NarrativeIR, NodeTypeDefinition, VariableDefinition } from './types'

let idCounter = 0

/** 生成唯一 id（前缀 + 时间戳 + 自增） */
export function genId(prefix = 'n'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function createEmptyNodeTypes(): NodeTypeDefinition[] {
  return []
}

export function createEmptyIR(title = '未命名项目'): NarrativeIR {
  return {
    version: 1,
    meta: {
      title,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    startNodeId: '',
    variables: [],
    nodeTypes: createEmptyNodeTypes(),
    nodes: [],
    edges: [],
  }
}

export function createNode(
  type: string,
  fields: Record<string, unknown> = {},
  position?: { x: number; y: number },
): IRNode {
  return {
    id: genId('n'),
    type,
    fields,
    position,
  }
}

export function createEdge(
  from: string,
  fromPort: string,
  to: string,
  type: string,
  extra?: Partial<IREdge>,
): IREdge {
  return {
    id: genId('e'),
    from,
    fromPort,
    to,
    type,
    ...extra,
  }
}

export function createVariable(def: Partial<VariableDefinition> & { name: string }): VariableDefinition {
  return {
    type: 'int',
    defaultValue: 0,
    ...def,
  }
}

/** 查找节点类型定义 */
export function findNodeType(ir: NarrativeIR, type: string): NodeTypeDefinition | undefined {
  return ir.nodeTypes.find((t) => t.type === type)
}

/** 获取节点的指定端口定义 */
export function getPortDef(ir: NarrativeIR, nodeType: string, portId: string) {
  return findNodeType(ir, nodeType)?.ports.find((p) => p.id === portId)
}

/** 节点的出边（按 order 排序） */
export function outEdgesOf(ir: NarrativeIR, nodeId: string, portId?: string): IREdge[] {
  return ir.edges
    .filter((e) => e.from === nodeId && (portId === undefined || e.fromPort === portId))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** 收集 IR 中引用的变量名（条件与效果） */
export function collectVariableRefs(ir: NarrativeIR): Set<string> {
  const names = new Set<string>()
  const visitOperand = (o: unknown) => {
    if (o && typeof o === 'object' && (o as { type?: string }).type === 'var') {
      names.add((o as { name: string }).name)
    }
  }
  const visitCondition = (c: unknown) => {
    if (!c || typeof c !== 'object') return
    const cond = c as Record<string, unknown>
    if (cond.op === 'and' || cond.op === 'or') {
      for (const child of cond.children as unknown[]) visitCondition(child)
    } else if (cond.op === 'not') {
      visitCondition(cond.child)
    } else if (cond.op === 'has') {
      names.add(cond.variable as string)
    } else if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'].includes(cond.op as string)) {
      visitOperand(cond.left)
      if (cond.op === 'in' && Array.isArray(cond.right)) cond.right.forEach(visitOperand)
      else visitOperand(cond.right)
    }
  }
  const visitEffect = (e: unknown) => {
    if (!e || typeof e !== 'object') return
    const eff = e as Record<string, unknown>
    if (eff.op === 'trigger') return
    names.add(eff.variable as string)
    visitOperand(eff.value)
  }
  for (const node of ir.nodes) {
    if (node.fields?.condition) visitCondition(node.fields.condition)
    if (node.fields?.effects) (node.fields.effects as unknown[]).forEach(visitEffect)
  }
  for (const edge of ir.edges) {
    if (edge.condition) visitCondition(edge.condition)
    if (edge.effects) edge.effects.forEach(visitEffect)
  }
  return names
}

/** 更新 meta.updatedAt 的时间戳 */
export function touch(ir: NarrativeIR): NarrativeIR {
  ir.meta.updatedAt = nowISO()
  return ir
}
