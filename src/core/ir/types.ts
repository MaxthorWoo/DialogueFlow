// ============ 基础类型 ============
export type FieldType =
  | 'string'
  | 'int'
  | 'float'
  | 'bool'
  | 'enum'
  | 'ref' // 引用另一个节点的 id
  | 'condition' // 条件 AST
  | 'effect' // 效果 AST
  | 'json' // 任意 JSON
  | 'asset'; // 资源路径

export interface FieldDefinition {
  key: string // 字段名，如 'speaker', 'text'
  type: FieldType
  label?: string // 显示名称
  required?: boolean
  defaultValue?: unknown
  enumValues?: string[] // type='enum' 时有效
  refTarget?: string // type='ref' 时，目标节点类型（可选）
  description?: string
}

// ============ 节点类型定义 ============
export interface NodeTypeDefinition {
  type: string // 'say', 'choice', 'branch', 'action', 'jump', 'end'
  label: string // 显示名称
  description?: string
  fields: FieldDefinition[] // 该类型节点拥有的字段
  ports: PortDefinition[] // 出口端口定义
  color?: string // 画布节点颜色
  icon?: string // 图标标识
}

export interface PortDefinition {
  id: string // 'out', 'true', 'false', 'choice'
  label: string // '下一步', '真', '假', '选项'
  multiple?: boolean // 是否允许多条边
  edgeType?: string // 边类型标记，用于导出时区分
}

// ============ IR 节点 ============
export interface IRNode {
  id: string
  type: string // 对应 NodeTypeDefinition.type
  fields: Record<string, unknown> // 字段值，key 对应 FieldDefinition.key
  position?: { x: number; y: number } // 画布坐标（仅项目文件保存）
  meta?: {
    sourceRow?: number // 来自 Excel 的行号，用于溯源
    sourceSheet?: string
    comment?: string // 人工注释
    tags?: string[]
  }
}

// ============ IR 边 ============
export interface IREdge {
  id: string
  from: string // 源节点 id
  fromPort: string // 源端口 id
  to: string // 目标节点 id
  type: string // 'next' | 'choice' | 'true' | 'false' | 'jump'
  label?: string // 选项文本等
  order?: number // 同端口多条边的排序
  condition?: ConditionAST // 边的条件（可选）
  effects?: EffectAST[] // 边的效果（可选）
  meta?: {
    sourceRow?: number
    sourceSheet?: string
    comment?: string
  }
}

// ============ 变量定义 ============
export interface VariableDefinition {
  name: string
  type: 'int' | 'float' | 'bool' | 'string'
  defaultValue: unknown
  description?: string
  scope?: 'global' | 'scene' // 预留
}

// ============ 条件 AST ============
export type CompareOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

export type ConditionAST =
  | { op: 'and'; children: ConditionAST[] }
  | { op: 'or'; children: ConditionAST[] }
  | { op: 'not'; child: ConditionAST }
  | { op: CompareOp; left: Operand; right: Operand }
  | { op: 'in'; left: Operand; right: Operand[] }
  | { op: 'has'; variable: string } // 变量存在且非空/非零
  | { op: 'true' } // 恒真
  | { op: 'false' } // 恒假

export type Operand =
  | { type: 'var'; name: string }
  | { type: 'lit'; value: string | number | boolean }

// ============ 效果 AST ============
export type EffectAST =
  | { op: 'set'; variable: string; value: Operand }
  | { op: 'add'; variable: string; value: Operand }
  | { op: 'sub'; variable: string; value: Operand }
  | { op: 'mul'; variable: string; value: Operand }
  | { op: 'append'; variable: string; value: Operand } // 字符串拼接
  | { op: 'trigger'; event: string; payload?: Record<string, unknown> }

// ============ IR 根结构 ============
export interface NarrativeIR {
  version: number
  meta: {
    title: string
    description?: string
    createdAt: string
    updatedAt: string
  }
  startNodeId: string
  variables: VariableDefinition[]
  nodeTypes: NodeTypeDefinition[] // 当前项目使用的节点类型定义
  nodes: IRNode[]
  edges: IREdge[]
}

// ============ 校验问题 ============
export type Severity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: Severity
  code: string
  message: string
  nodeId?: string
  edgeId?: string
  fieldKey?: string
}
