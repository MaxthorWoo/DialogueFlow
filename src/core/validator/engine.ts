import type { NarrativeIR, ValidationIssue, ConditionAST, EffectAST, Operand } from '../ir/types'
import { collectVariableRefs } from '../ir/factory'

// 校验引擎（第一部分）：基础结构规则
export function validateStructure(ir: NarrativeIR): { issues: ValidationIssue[]; nodeIds: Set<string> } {
  const issues: ValidationIssue[] = []
  const push = (issue: ValidationIssue) => issues.push(issue)

  // DUPLICATE_NODE_ID
  const nodeCount = new Map<string, number>()
  for (const node of ir.nodes) nodeCount.set(node.id, (nodeCount.get(node.id) ?? 0) + 1)
  for (const [id, count] of nodeCount) {
    if (count > 1) {
      push({ severity: 'error', code: 'DUPLICATE_NODE_ID', message: `节点 ID "${id}" 重复出现 ${count} 次`, nodeId: id })
    }
  }
  // DUPLICATE_EDGE_ID
  const edgeCount = new Map<string, number>()
  for (const edge of ir.edges) edgeCount.set(edge.id, (edgeCount.get(edge.id) ?? 0) + 1)
  for (const [id, count] of edgeCount) {
    if (count > 1) {
      push({ severity: 'error', code: 'DUPLICATE_EDGE_ID', message: `边 ID "${id}" 重复出现 ${count} 次`, edgeId: id })
    }
  }
  // MISSING_EDGE_TARGET
  const nodeIds = new Set(ir.nodes.map((n) => n.id))
  for (const edge of ir.edges) {
    if (!nodeIds.has(edge.to)) {
      push({ severity: 'error', code: 'MISSING_EDGE_TARGET', message: `边 "${edge.id}" 的目标节点 "${edge.to}" 不存在`, edgeId: edge.id, nodeId: edge.from })
    }
    if (!nodeIds.has(edge.from)) {
      push({ severity: 'error', code: 'MISSING_EDGE_TARGET', message: `边 "${edge.id}" 的源节点 "${edge.from}" 不存在`, edgeId: edge.id })
    }
  }
  // MISSING_START_NODE
  if (!ir.startNodeId) {
    push({ severity: 'error', code: 'MISSING_START_NODE', message: '未设置起始节点' })
  } else if (!nodeIds.has(ir.startNodeId)) {
    push({ severity: 'error', code: 'MISSING_START_NODE', message: `起始节点 "${ir.startNodeId}" 不存在`, nodeId: ir.startNodeId })
  }
  return { issues, nodeIds }
}

// ============ 类型检查辅助 ============
function checkOperandType(
  operand: Operand,
  vars: Map<string, string>,
): boolean {
  if (operand.type !== 'var') return true
  return vars.has(operand.name)
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
    case 'asset':
    case 'ref':
      return typeof value === 'string'
    case 'int':
      return typeof value === 'number' && Number.isInteger(value)
    case 'float':
      return typeof value === 'number'
    case 'bool':
      return typeof value === 'boolean'
    case 'enum':
      return typeof value === 'string'
    case 'json':
      return value !== null && typeof value === 'object'
    case 'condition':
      return !!value && typeof value === 'object' && 'op' in (value as object)
    case 'effect':
      return Array.isArray(value)
    default:
      return true
  }
}

// ============ 完整校验入口 ============
export function validateIR(ir: NarrativeIR): ValidationIssue[] {
  const { issues, nodeIds } = validateStructure(ir)
  const push = (issue: ValidationIssue) => issues.push(issue)

  const varNames = new Map<string, string>()
  for (const v of ir.variables) varNames.set(v.name, v.type)

  // 入边/出边统计（ORPHAN_NODE / DEAD_END / CYCLE_DETECTED）
  const hasIn = new Set<string>()
  const hasOut = new Set<string>()
  for (const edge of ir.edges) {
    if (nodeIds.has(edge.to)) hasIn.add(edge.to)
    if (nodeIds.has(edge.from)) hasOut.add(edge.from)
  }

  // CYCLE_DETECTED（DFS，仅 info）
  const adj = new Map<string, string[]>()
  for (const edge of ir.edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, [])
    adj.get(edge.from)!.push(edge.to)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cycleReported = new Set<string>()
  const dfs = (id: string) => {
    if (visited.has(id) || cycleReported.size > 0) return
    if (visiting.has(id)) {
      cycleReported.add(id)
      push({ severity: 'info', code: 'CYCLE_DETECTED', message: `检测到循环引用（经过节点 "${id}"），请确认是有意为之`, nodeId: id })
      return
    }
    visiting.add(id)
    for (const next of adj.get(id) ?? []) dfs(next)
    visiting.delete(id)
    visited.add(id)
  }
  for (const node of ir.nodes) dfs(node.id)

  for (const node of ir.nodes) {
    const typeDef = ir.nodeTypes.find((t) => t.type === node.type)

    // ORPHAN_NODE
    if (!hasIn.has(node.id) && node.id !== ir.startNodeId) {
      push({ severity: 'warning', code: 'ORPHAN_NODE', message: `节点 "${node.id}" 无入边且不是起始节点`, nodeId: node.id })
    }
    // DEAD_END
    if (typeDef && typeDef.type !== 'end' && typeDef.ports.length > 0 && !hasOut.has(node.id)) {
      push({ severity: 'warning', code: 'DEAD_END', message: `节点 "${node.id}" 没有出边（非 end 类型）`, nodeId: node.id })
    }
    if (!typeDef) {
      push({ severity: 'warning', code: 'UNKNOWN_NODE_TYPE', message: `节点 "${node.id}" 的类型 "${node.type}" 未在 nodeTypes 中定义`, nodeId: node.id })
      continue
    }

    const fields = node.fields ?? {}
    const definedKeys = new Set<string>()
    for (const field of typeDef.fields) {
      definedKeys.add(field.key)
      const value = fields[field.key]
      // MISSING_REQUIRED_FIELD
      if (field.required && (value === undefined || value === null || value === '')) {
        push({ severity: 'error', code: 'MISSING_REQUIRED_FIELD', message: `节点 "${node.id}" 缺少必填字段 "${field.label ?? field.key}"`, nodeId: node.id, fieldKey: field.key })
        continue
      }
      if (value === undefined || value === null) continue
      // TYPE_MISMATCH
      if (!matchesType(value, field.type)) {
        push({ severity: 'error', code: 'TYPE_MISMATCH', message: `节点 "${node.id}" 字段 "${field.key}" 的值类型与定义 ${field.type} 不匹配`, nodeId: node.id, fieldKey: field.key })
      }
      // ENUM_VALUE_INVALID
      if (field.type === 'enum' && field.enumValues && typeof value === 'string' && !field.enumValues.includes(value)) {
        push({ severity: 'error', code: 'ENUM_VALUE_INVALID', message: `节点 "${node.id}" 字段 "${field.key}" 的值 "${value}" 不在枚举列表中`, nodeId: node.id, fieldKey: field.key })
      }
      // REF_TARGET_NOT_FOUND
      if (field.type === 'ref' && typeof value === 'string' && !nodeIds.has(value)) {
        push({ severity: 'error', code: 'REF_TARGET_NOT_FOUND', message: `节点 "${node.id}" 字段 "${field.key}" 引用的节点 "${value}" 不存在`, nodeId: node.id, fieldKey: field.key })
      }
    }
    // UNKNOWN_FIELD
    for (const key of Object.keys(fields)) {
      if (!definedKeys.has(key)) {
        push({ severity: 'warning', code: 'UNKNOWN_FIELD', message: `节点 "${node.id}" 存在未定义的字段 "${key}"`, nodeId: node.id, fieldKey: key })
      }
    }
  }

  // 边上的字段与 order 重复
  const portOrders = new Map<string, Set<number>>()
  for (const edge of ir.edges) {
    const key = `${edge.from}|${edge.fromPort}`
    if (edge.order !== undefined) {
      if (!portOrders.has(key)) portOrders.set(key, new Set())
      const set = portOrders.get(key)!
      if (set.has(edge.order)) {
        push({ severity: 'warning', code: 'DUPLICATE_CHOICE_ORDER', message: `节点 "${edge.from}" 端口 "${edge.fromPort}" 下存在重复的序号 ${edge.order}`, edgeId: edge.id, nodeId: edge.from })
      }
      set.add(edge.order)
    }
    // 边条件/效果中的变量引用
    const checkCond = (cond: ConditionAST | undefined) => {
      if (!cond) return
      if (cond.op === 'has') {
        if (!varNames.has(cond.variable)) push({ severity: 'error', code: 'UNDEFINED_VARIABLE', message: `边 "${edge.id}" 条件引用了未定义的变量 "${cond.variable}"`, edgeId: edge.id, nodeId: edge.from })
      } else if (cond.op === 'and' || cond.op === 'or') {
        cond.children.forEach(checkCond)
      } else if (cond.op === 'not') {
        checkCond(cond.child)
      } else if ('left' in cond) {
        const left = cond.left
        if (left.type === 'var' && !varNames.has(left.name)) {
          push({ severity: 'error', code: 'UNDEFINED_VARIABLE', message: `边 "${edge.id}" 条件引用了未定义的变量 "${left.name}"`, edgeId: edge.id, nodeId: edge.from })
        }
        const right = cond.right
        const rights = Array.isArray(right) ? right : [right]
        for (const r of rights) {
          if (r.type === 'var' && !varNames.has(r.name)) {
            push({ severity: 'error', code: 'UNDEFINED_VARIABLE', message: `边 "${edge.id}" 条件引用了未定义的变量 "${r.name}"`, edgeId: edge.id, nodeId: edge.from })
          }
        }
      }
    }
    const checkEffect = (effects: EffectAST[] | undefined) => {
      if (!effects) return
      for (const eff of effects) {
        if (eff.op === 'trigger') continue
        if (!varNames.has(eff.variable)) {
          push({ severity: 'error', code: 'UNDEFINED_VARIABLE', message: `边 "${edge.id}" 效果引用了未定义的变量 "${eff.variable}"`, edgeId: edge.id, nodeId: edge.from })
        }
      }
    }
    checkCond(edge.condition)
    checkEffect(edge.effects)
  }

  // 节点字段中的变量引用（condition/effect 类型字段）
  const referenced = collectVariableRefs(ir)
  for (const name of referenced) {
    if (!varNames.has(name)) {
      push({ severity: 'error', code: 'UNDEFINED_VARIABLE', message: `引用了未定义的变量 "${name}"（请在变量表中定义）` })
    }
  }

  return issues
}
