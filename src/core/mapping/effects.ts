import type { EffectAST, Operand } from '../ir/types'
import { splitTopLevel } from './expression'

// 效果表达式解析："gold += 10; flag = true; trigger(battle_start)"
// 支持操作符：= += -= *= ++（append）
// trigger 语法：trigger(事件名) 或 trigger(事件名, key=value, ...)

function parseOperandToken(token: string): Operand {
  const t = token.trim()
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(t)) return { type: 'lit', value: Number(t) }
  if (t === 'true') return { type: 'lit', value: true }
  if (t === 'false') return { type: 'lit', value: false }
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { type: 'lit', value: t.slice(1, -1) }
  }
  return { type: 'var', name: t }
}

/** 解析单条效果语句 */
function parseSingleEffect(stmt: string): EffectAST | null {
  const s = stmt.trim()
  if (!s) return null
  const triggerMatch = s.match(/^trigger\s*\(\s*([^,()]+?)\s*(?:,\s*(.*))?\)$/s)
  if (triggerMatch) {
    const event = triggerMatch[1].trim().replace(/^["']|["']$/g, '')
    const payload: Record<string, unknown> = {}
    if (triggerMatch[2]) {
      for (const pair of splitTopLevel(triggerMatch[2], ',')) {
        const eq = pair.indexOf('=')
        if (eq < 0) continue
        const key = pair.slice(0, eq).trim()
        const operand = parseOperandToken(pair.slice(eq + 1))
        payload[key] = operand.type === 'lit' ? operand.value : operand
      }
    }
    return { op: 'trigger', event, payload: Object.keys(payload).length ? payload : undefined }
  }
  const idRe = '[\\u4e00-\\u9fa5A-Za-z_][\\u4e00-\\u9fa5A-Za-z0-9_]*'
  const ops: Array<[RegExp, EffectAST['op']]> = [
    [new RegExp('^\\s*(' + idRe + ')\\s*\\+=\\s*(.+)$'), 'add'],
    [new RegExp('^\\s*(' + idRe + ')\\s*-=\\s*(.+)$'), 'sub'],
    [new RegExp('^\\s*(' + idRe + ')\\s*\\*=\\s*(.+)$'), 'mul'],
    [new RegExp('^\\s*(' + idRe + ')\\s*\\+\\+\\s*$'), 'append'],
  ]
  for (const [re, op] of ops) {
    const m = s.match(re)
    if (m) {
      if (op === 'append') return { op, variable: m[1], value: { type: 'lit', value: '' } }
      return { op, variable: m[1], value: parseOperandToken(m[2]) } as EffectAST
    }
  }
  const setMatch = s.match(new RegExp('^\\s*(' + idRe + ')\\s*=\\s*(.+)$'))
  if (setMatch && !setMatch[2].includes('==')) {
    return { op: 'set', variable: setMatch[1], value: parseOperandToken(setMatch[2]) }
  }
  return null
}

/** 将效果表达式字符串解析为 EffectAST 数组，失败返回 null */
export function parseEffectExpression(expr: string): EffectAST[] | null {
  if (!expr.trim()) return null
  const results: EffectAST[] = []
  for (const stmt of splitTopLevel(expr, ';')) {
    const parsed = parseSingleEffect(stmt)
    if (!parsed) {
      console.error('效果表达式解析失败:', stmt)
      return null
    }
    results.push(parsed)
  }
  return results.length ? results : null
}

/** 解析效果列：先尝试 JSON（format=json 或值以 [ 开头），再尝试表达式 */
export function parseEffectColumn(
  raw: unknown,
  format: 'json' | 'expression' | undefined,
): EffectAST[] | null {
  if (raw === null || raw === undefined || raw === '') return null
  const asJson =
    format === 'json' ||
    (format === undefined && typeof raw === 'string' && raw.trim().startsWith('['))
  if (asJson) {
    try {
      const parsed = JSON.parse(String(raw))
      if (Array.isArray(parsed)) return parsed as EffectAST[]
    } catch (e) {
      console.error('效果 JSON 解析失败:', raw, e)
      return null
    }
  }
  return parseEffectExpression(String(raw))
}
