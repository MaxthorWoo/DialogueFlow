import type { ConditionAST, Operand } from '../../core/ir/types'

// 条件/效果 AST 编辑辅助

export const CONDITION_OPS: Array<{ value: string; label: string }> = [
  { value: 'and', label: '且 (AND)' },
  { value: 'or', label: '或 (OR)' },
  { value: 'not', label: '非 (NOT)' },
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'in', label: '属于' },
  { value: 'has', label: '变量存在' },
  { value: 'true', label: '恒真' },
  { value: 'false', label: '恒假' },
]

export const EFFECT_OPS: Array<{ value: string; label: string }> = [
  { value: 'set', label: '赋值 =' },
  { value: 'add', label: '增加 +=' },
  { value: 'sub', label: '减少 -=' },
  { value: 'mul', label: '乘以 *=' },
  { value: 'append', label: '拼接 ++' },
  { value: 'trigger', label: '触发事件' },
]

export function createCondition(op: string): ConditionAST {
  switch (op) {
    case 'and':
    case 'or':
      return { op, children: [{ op: 'true' }, { op: 'true' }] } as ConditionAST
    case 'not':
      return { op, child: { op: 'true' } }
    case 'has':
      return { op, variable: '' }
    case 'true':
      return { op: 'true' }
    case 'false':
      return { op: 'false' }
    case 'in':
      return { op, left: { type: 'var', name: '' }, right: [{ type: 'lit', value: '' }] } as ConditionAST
    default:
      return { op: op as 'eq', left: { type: 'var', name: '' }, right: { type: 'lit', value: '' } }
  }
}

export function createEffect(op: string): unknown {
  if (op === 'trigger') return { op, event: '' }
  return { op, variable: '', value: { type: 'lit', value: '' } }
}

export function operandToText(o: Operand): string {
  return o.type === 'var' ? o.name : String(o.value)
}

export function conditionToText(c: ConditionAST): string {
  switch (c.op) {
    case 'and':
      return `(${c.children.map(conditionToText).join('; ')})`
    case 'or':
      return `(${c.children.map(conditionToText).join('; ')})`
    case 'not':
      return `!(${conditionToText(c.child)})`
    case 'has':
      return c.variable
    case 'true':
      return 'true'
    case 'false':
      return 'false'
    case 'in':
      return `${operandToText(c.left)} in [${c.right.map(operandToText).join(', ')}]`
    default:
      return `${operandToText(c.left)} ${c.op} ${operandToText(c.right)}`
  }
}
