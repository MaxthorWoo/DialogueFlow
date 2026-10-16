import type { FieldType, NodeTypeDefinition, VariableDefinition } from '../ir/types'

// ============ 列角色 ============
export type ColumnRole =
  | 'id'
  | 'nodeType'
  | 'from'
  | 'to'
  | 'field'
  | 'edge'
  | 'edgeLabel'
  | 'edgeOrder'
  | 'condition'
  | 'effect'
  | 'variable'
  | 'varType'
  | 'varDefault'
  | 'start'
  | 'ignore'

// ============ 单列映射 ============
export interface ColumnMapping {
  columnName: string // Excel 中的列名
  role: ColumnRole
  fieldKey?: string // role='field' 时，映射到 fields 中的 key
  fieldType?: FieldType // role='field' 时，字段类型
  edgeConfig?: {
    portId: string // 从哪个端口出发
    edgeType: string // 边的类型标记
    targetIsNodeId: boolean // 列值是否直接是目标节点 id
    labelColumn?: string // 可选：用哪一列的值作为这条连线的标签（如 choice_1_next ← choice_1）
  }
  valueMap?: Record<string, string> // role='nodeType' 时的值映射
  parseFormat?: 'json' | 'expression' // 条件/效果列的解析格式
}

// ============ Sheet 映射 ============
export interface SheetMapping {
  sheetName: string
  entityType: 'node' | 'edge' | 'variable'
  columns: ColumnMapping[]
  skipRows?: number
  headerRowIndex?: number
}

// ============ 完整 Profile ============
export interface MappingProfile {
  id: string
  name: string
  description?: string
  version: number
  sheets: SheetMapping[]
  nodeTypes: NodeTypeDefinition[]
  variables?: VariableDefinition[]
  defaultStartNodeType?: string
  /** 导入时的表格数据（用于导入后重新调整映射并重放） */
  sourceData?: Record<string, Record<string, unknown>[]>
}

// ============ 映射输入输出 ============
export interface MappingInput {
  sheets: Record<string, Record<string, unknown>[]>
  profile: MappingProfile
  mode?: 'replace' | 'merge' | 'append'
  baseIR?: import('../ir/types').NarrativeIR
}

export interface MappingError {
  severity: 'error' | 'warning'
  code: string
  message: string
  sheetName?: string
  row?: number
  nodeId?: string
}

export interface MappingResult {
  nodes: import('../ir/types').IRNode[]
  edges: import('../ir/types').IREdge[]
  variables: VariableDefinition[]
  startNodeId: string | null
  errors: MappingError[]
  warnings: MappingError[]
}
