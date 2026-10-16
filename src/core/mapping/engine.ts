import type { IRNode, IREdge, NarrativeIR, VariableDefinition, FieldType } from '../ir/types'
import type { MappingInput, MappingError, MappingResult, ColumnMapping, SheetMapping } from './types'
import { genId } from '../ir/factory'
import { parseConditionExpression } from './expression'
import { parseEffectColumn } from './effects'

// 映射引擎：Excel 行对象 + MappingProfile → IR 的 nodes/edges/variables

// ============ 值转换 ============
export function convertValue(raw: unknown, type: FieldType | undefined): unknown {
  if (raw === null || raw === undefined) return undefined
  const s = typeof raw === 'string' ? raw.trim() : raw
  if (s === '') return undefined
  switch (type) {
    case 'int': {
      const n = Number(s)
      return Number.isFinite(n) ? Math.round(n) : undefined
    }
    case 'float': {
      const n = Number(s)
      return Number.isFinite(n) ? n : undefined
    }
    case 'bool':
      if (typeof s === 'boolean') return s
      return ['true', '是', '1', 'yes', 'y'].includes(String(s).toLowerCase())
    case 'enum':
      return typeof s === 'string' ? s : String(s)
    case 'json':
      if (typeof s !== 'string') return s
      try {
        return JSON.parse(s)
      } catch (e) {
        console.error('JSON 字段解析失败:', s, e)
        return undefined
      }
    case 'condition':
      if (typeof s !== 'string') return s
      if (s.trim().startsWith('{')) {
        try {
          return JSON.parse(s)
        } catch (e) {
          console.error('条件 JSON 解析失败:', s, e)
          return undefined
        }
      }
      return parseConditionExpression(s) ?? undefined
    case 'effect':
      return parseEffectColumn(s, undefined) ?? undefined
    case 'ref':
    case 'asset':
    case 'string':
    default:
      return typeof s === 'string' ? s : String(s)
  }
}

// ============ 工具函数 ============
function isTruthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['true', '是', '1', 'yes', 'y'].includes(v.toLowerCase())
  return false
}

function num(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function colByRole(columns: ColumnMapping[], role: string): ColumnMapping[] {
  return columns.filter((c) => c.role === role)
}

function colValue(row: Record<string, unknown>, m: ColumnMapping): unknown {
  return row[m.columnName]
}

// ============ 节点 Sheet 处理 ============
function processNodeSheet(
  sheet: SheetMapping,
  rows: Record<string, unknown>[],
  errors: MappingError[],
): { nodes: IRNode[]; edges: IREdge[]; startNodeId: string | null } {
  const nodes: IRNode[] = []
  const edges: IREdge[] = []
  let startNodeId: string | null = null

  rows.forEach((row, idx) => {
    const rowNo = idx + 1
    const idCol = colByRole(sheet.columns, 'id')[0]
    const typeCol = colByRole(sheet.columns, 'nodeType')[0]

    const nodeId = idCol ? String(colValue(row, idCol) ?? '').trim() : ''
    if (!nodeId) {
      errors.push({
        severity: 'error', code: 'MISSING_ID',
        message: `第 ${rowNo} 行缺少节点 ID，已跳过`,
        sheetName: sheet.sheetName, row: rowNo,
      })
      return
    }
    let nodeType = 'say'
    if (typeCol) {
      const raw = String(colValue(row, typeCol) ?? '').trim()
      nodeType = typeCol.valueMap?.[raw] ?? raw
      if (!raw) nodeType = 'say'
    }

    const fields: Record<string, unknown> = {}
    for (const m of sheet.columns) {
      if (m.role !== 'field') continue
      const key = m.fieldKey || m.columnName
      const value = convertValue(colValue(row, m), m.fieldType)
      if (value !== undefined) fields[key] = value
    }

    // 条件/效果列 → fields
    for (const m of sheet.columns) {
      if (m.role === 'condition') {
        const v = convertValue(colValue(row, m), 'condition')
        if (v !== undefined) fields[m.fieldKey || 'condition'] = v
      } else if (m.role === 'effect') {
        const v = convertValue(colValue(row, m), 'effect')
        if (v !== undefined) fields[m.fieldKey || 'effects'] = v
      }
    }

    const node: IRNode = {
      id: nodeId,
      type: nodeType,
      fields,
      meta: { sourceRow: rowNo, sourceSheet: sheet.sheetName },
    }
    nodes.push(node)

    // 边列 → IREdge（每条边列可通过 edgeConfig.labelColumn 单独配对标签列）
    const edgeCols = colByRole(sheet.columns, 'edge')
    edgeCols.forEach((m, edgeIdx) => {
      const target = String(colValue(row, m) ?? '').trim()
      if (!target) return
      const edge: IREdge = {
        id: genId('e'),
        from: nodeId,
        fromPort: m.edgeConfig?.portId ?? 'out',
        to: target,
        type: m.edgeConfig?.edgeType ?? 'next',
        meta: { sourceRow: rowNo },
      }
      // 优先：该边列配对的标签列（如 choice_1_next 的标签来自 choice_1）
      if (m.edgeConfig?.labelColumn) {
        const label = row[m.edgeConfig.labelColumn]
        if (label !== null && label !== undefined && String(label).trim() !== '') {
          edge.label = String(label)
        }
      }
      // 通用 edgeLabel：仅在未配对标签列时应用（作用于该行所有边）
      const labelCol = colByRole(sheet.columns, 'edgeLabel')[0]
      if (!m.edgeConfig?.labelColumn && labelCol) {
        const label = colValue(row, labelCol)
        if (label !== null && label !== undefined && label !== '') edge.label = String(label)
      }
      const orderCol = colByRole(sheet.columns, 'edgeOrder')[0]
      if (orderCol) {
        const order = num(colValue(row, orderCol))
        if (order !== undefined) edge.order = order
      }
      // 条件列只挂到本行第一条边，避免污染选项/超时等其他出边
      const condCol = colByRole(sheet.columns, 'condition')[0]
      if (edgeIdx === 0 && condCol && !fields[condCol.fieldKey || 'condition']) {
        const cond = convertValue(colValue(row, condCol), 'condition')
        if (cond !== undefined && cond !== null) edge.condition = cond as IREdge['condition']
      }
      edges.push(edge)
    })

    // start 标记
    const startCol = colByRole(sheet.columns, 'start')[0]
    if (startCol && isTruthy(colValue(row, startCol))) {
      startNodeId = nodeId
    }
  })

  return { nodes, edges, startNodeId }
}

// ============ 边表 / 变量表处理 ============
function processEdgeSheet(
  sheet: SheetMapping,
  rows: Record<string, unknown>[],
  errors: MappingError[],
): IREdge[] {
  const edges: IREdge[] = []
  rows.forEach((row, idx) => {
    const rowNo = idx + 1
    const fromCol = colByRole(sheet.columns, 'from')[0]
    const toCol = colByRole(sheet.columns, 'to')[0]
    const from = fromCol ? String(colValue(row, fromCol) ?? '').trim() : ''
    const to = toCol ? String(colValue(row, toCol) ?? '').trim() : ''
    if (!from || !to) {
      errors.push({
        severity: 'error', code: 'MISSING_EDGE_ENDPOINTS',
        message: `边表第 ${rowNo} 行缺少 from/to，已跳过`,
        sheetName: sheet.sheetName, row: rowNo,
      })
      return
    }
    const edge: IREdge = {
      id: genId('e'),
      from,
      fromPort: 'out',
      to,
      type: 'next',
      meta: { sourceRow: rowNo, sourceSheet: sheet.sheetName },
    }
    const portCol = sheet.columns.find((c) => c.role === 'edge' && c.edgeConfig)
    if (portCol?.edgeConfig) {
      edge.fromPort = portCol.edgeConfig.portId
      edge.type = portCol.edgeConfig.edgeType
    }
    const labelCol = colByRole(sheet.columns, 'edgeLabel')[0]
    if (labelCol) {
      const label = colValue(row, labelCol)
      if (label !== null && label !== undefined && label !== '') edge.label = String(label)
    }
    const orderCol = colByRole(sheet.columns, 'edgeOrder')[0]
    if (orderCol) {
      const order = num(colValue(row, orderCol))
      if (order !== undefined) edge.order = order
    }
    const condCol = colByRole(sheet.columns, 'condition')[0]
    if (condCol) {
      const cond = convertValue(colValue(row, condCol), 'condition')
      if (cond !== undefined && cond !== null) edge.condition = cond as IREdge['condition']
    }
    const effCol = colByRole(sheet.columns, 'effect')[0]
    if (effCol) {
      const eff = convertValue(colValue(row, effCol), 'effect')
      if (Array.isArray(eff)) edge.effects = eff as IREdge['effects']
    }
    edges.push(edge)
  })
  return edges
}

function processVariableSheet(rows: Record<string, unknown>[]): VariableDefinition[] {
  return rows
    .map((row) => {
      const name = String(row['变量名'] ?? row['name'] ?? row['名称'] ?? '').trim()
      if (!name) return null
      const rawType = String(row['类型'] ?? row['type'] ?? 'int').toLowerCase()
      const type = (['int', 'float', 'bool', 'string'].includes(rawType) ? rawType : 'int') as
        'int' | 'float' | 'bool' | 'string'
      let defaultValue: unknown = row['默认值'] ?? row['default'] ?? 0
      if (type === 'int' || type === 'float') defaultValue = num(defaultValue) ?? 0
      if (type === 'bool') defaultValue = isTruthy(defaultValue)
      if (type === 'string') defaultValue = String(defaultValue ?? '')
      const def: VariableDefinition = {
        name,
        type,
        defaultValue,
        description:
          row['说明'] !== undefined && row['说明'] !== null ? String(row['说明']) : undefined,
      }
      return def
    })
    .filter((v): v is VariableDefinition => v !== null)
}

// ============ 主入口 ============
export function applyMapping(input: MappingInput): MappingResult & { ir: NarrativeIR } {
  const { profile, mode = 'replace' } = input
  const errors: MappingError[] = []
  const warnings: MappingError[] = []
  let nodes: IRNode[] = []
  let edges: IREdge[] = []
  const variables: VariableDefinition[] = [...(profile.variables ?? [])]
  let startNodeId: string | null = null

  for (const sheet of profile.sheets) {
    const rows = input.sheets[sheet.sheetName]
    if (!rows || rows.length === 0) {
      warnings.push({
        severity: 'warning', code: 'EMPTY_SHEET',
        message: `Sheet "${sheet.sheetName}" 无数据行`,
        sheetName: sheet.sheetName,
      })
      continue
    }
    const skip = sheet.skipRows ?? 0
    const effectiveRows = skip > 0 ? rows.slice(skip) : rows

    if (sheet.entityType === 'node') {
      const r = processNodeSheet(sheet, effectiveRows, errors)
      nodes = nodes.concat(r.nodes)
      edges = edges.concat(r.edges)
      if (r.startNodeId) startNodeId = r.startNodeId
    } else if (sheet.entityType === 'edge') {
      edges = edges.concat(processEdgeSheet(sheet, effectiveRows, errors))
    } else if (sheet.entityType === 'variable') {
      variables.push(...processVariableSheet(effectiveRows))
    }
  }

  // 节点去重（后出现的覆盖先出现的，保留首次的 sourceRow 信息合并）
  const nodeMap = new Map<string, IRNode>()
  for (const node of nodes) {
    const existing = nodeMap.get(node.id)
    if (existing) {
      warnings.push({
        severity: 'warning', code: 'DUPLICATE_NODE_ROW',
        message: `节点 ID "${node.id}" 重复出现，已合并（保留最后一次的字段值）`,
        nodeId: node.id,
      })
      nodeMap.set(node.id, { ...existing, fields: { ...existing.fields, ...node.fields } })
    } else {
      nodeMap.set(node.id, node)
    }
  }
  nodes = [...nodeMap.values()]

  // 起始节点兜底：profile.defaultStartNodeType（默认 say）的第一个节点
  if (!startNodeId) {
    const preferred = profile.defaultStartNodeType ?? 'say'
    const first = nodes.find((n) => n.type === preferred) ?? nodes[0]
    startNodeId = first?.id ?? null
  }

  // 边端点存在性校验
  const nodeIds = new Set(nodes.map((n) => n.id))
  const validEdges: IREdge[] = []
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push({
        severity: 'error', code: 'MISSING_EDGE_TARGET',
        message: `边 ${edge.from} → ${edge.to} 的端点不存在，已丢弃`,
      })
      continue
    }
    validEdges.push(edge)
  }

  // 组装 IR
  const now = new Date().toISOString()
  let ir: NarrativeIR = {
    version: 1,
    meta: {
      title: profile.name,
      description: profile.description,
      createdAt: now,
      updatedAt: now,
    },
    startNodeId: startNodeId ?? '',
    variables,
    nodeTypes: profile.nodeTypes,
    nodes,
    edges: validEdges,
  }

  // merge/append 模式：与基础 IR 合并（按 id 去重，保留已有节点的 position 等手动修改）
  if ((mode === 'merge' || mode === 'append') && input.baseIR) {
    const base = input.baseIR
    const baseNodeMap = new Map(base.nodes.map((n) => [n.id, n]))
    const baseEdgeKey = new Set(base.edges.map((e) => `${e.from}|${e.fromPort}|${e.to}`))
    for (const node of nodes) {
      const existing = baseNodeMap.get(node.id)
      if (existing) {
        // merge：保留已有字段中的非空手动值；replace 语义下导入值优先
        baseNodeMap.set(node.id, {
          ...existing,
          fields: { ...node.fields, ...existing.fields },
          meta: { ...node.meta, ...existing.meta },
        })
      } else {
        baseNodeMap.set(node.id, node)
      }
    }
    const newEdges = validEdges.filter((e) => !baseEdgeKey.has(`${e.from}|${e.fromPort}|${e.to}`))
    ir = {
      ...base,
      startNodeId: base.startNodeId || ir.startNodeId,
      variables: dedupeVariables([...base.variables, ...variables]),
      nodeTypes: base.nodeTypes.length ? base.nodeTypes : profile.nodeTypes,
      nodes: [...baseNodeMap.values()],
      edges: [...base.edges, ...newEdges],
    }
  }

  return { nodes: ir.nodes, edges: ir.edges, variables: ir.variables, startNodeId: ir.startNodeId || null, errors, warnings, ir }
}

function dedupeVariables(vars: VariableDefinition[]): VariableDefinition[] {
  const map = new Map<string, VariableDefinition>()
  for (const v of vars) map.set(v.name, v)
  return [...map.values()]
}


