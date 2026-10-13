import type { ConditionAST, Operand, EffectAST } from '../../core/ir/types'

// 阅读模式：条件/效果求值器（纯函数）

export function evalOperand(o: Operand, vars: Record<string, unknown>): unknown {
  return o.type === 'var' ? vars[o.name] : o.value
}

export function evalCondition(c: ConditionAST | undefined, vars: Record<string, unknown>): boolean {
  if (!c) return true
  switch (c.op) {
    case 'and':
      return c.children.every((ch) => evalCondition(ch, vars))
    case 'or':
      return c.children.some((ch) => evalCondition(ch, vars))
    case 'not':
      return !evalCondition(c.child, vars)
    case 'has':
      return vars[c.variable] !== undefined && vars[c.variable] !== null && vars[c.variable] !== '' && vars[c.variable] !== 0
    case 'true':
      return true
    case 'false':
      return false
    case 'in': {
      const v = evalOperand(c.left, vars)
      return c.right.some((r) => evalOperand(r, vars) === v)
    }
    default: {
      const l = evalOperand(c.left, vars)
      const r = evalOperand(c.right, vars)
      switch (c.op) {
        case 'eq': return l === r
        case 'neq': return l !== r
        case 'gt': return (l as number) > (r as number)
        case 'gte': return (l as number) >= (r as number)
        case 'lt': return (l as number) < (r as number)
        case 'lte': return (l as number) <= (r as number)
        default: return false
      }
    }
  }
}

export function applyEffects(effects: EffectAST[] | undefined, vars: Record<string, unknown>): void {
  if (!effects) return
  for (const e of effects) {
    if (e.op === 'trigger') continue
    const v = evalOperand(e.value, vars)
    const cur = vars[e.variable]
    switch (e.op) {
      case 'set': vars[e.variable] = v; break
      case 'add': vars[e.variable] = (typeof cur === 'number' ? cur : 0) + (typeof v === 'number' ? v : 0); break
      case 'sub': vars[e.variable] = (typeof cur === 'number' ? cur : 0) - (typeof v === 'number' ? v : 0); break
      case 'mul': vars[e.variable] = (typeof cur === 'number' ? cur : 0) * (typeof v === 'number' ? v : 0); break
      case 'append': vars[e.variable] = String(cur ?? '') + String(v ?? ''); break
    }
  }
}
