import type { ConditionAST, Operand } from '../ir/types'

// 手写递归下降解析器：将简单条件表达式解析为 ConditionAST
// 支持：&& || ! == != > >= < <= in，数字/字符串/true/false 字面量，中文变量名
// ============ 词法分析 ============
type TokenType = 'num' | 'str' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof'

interface Token {
  type: TokenType
  value: string
  pos: number
}

const TWO_CHAR_OPS = ['&&', '||', '==', '!=', '>=', '<=']
const ONE_CHAR_OPS = ['>', '<', '!']

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) { i++; continue }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      tokens.push({ type: 'num', value: input.slice(i, j), pos: i })
      i = j
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1
      let value = ''
      while (j < input.length && input[j] !== ch) {
        if (input[j] === '\\' && j + 1 < input.length) { value += input[j + 1]; j += 2 }
        else { value += input[j]; j++ }
      }
      if (j >= input.length) throw new Error('字符串未闭合（位置 ' + i + '）')
      tokens.push({ type: 'str', value, pos: i })
      i = j + 1
      continue
    }
    if (/[\u4e00-\u9fa5A-Za-z_]/.test(ch)) {
      let j = i
      while (j < input.length && /[\u4e00-\u9fa5A-Za-z0-9_]/.test(input[j])) j++
      tokens.push({ type: 'ident', value: input.slice(i, j), pos: i })
      i = j
      continue
    }
    if (ch === '(') { tokens.push({ type: 'lparen', value: ch, pos: i }); i++; continue }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ch, pos: i }); i++; continue }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch, pos: i }); i++; continue }
    const two = input.slice(i, i + 2)
    const op = TWO_CHAR_OPS.includes(two) ? two : ONE_CHAR_OPS.includes(ch) ? ch : null
    if (op) { tokens.push({ type: 'op', value: op, pos: i }); i += op.length; continue }
    throw new Error('无法识别的字符 "' + ch + '"（位置 ' + i + '）')
  }
  tokens.push({ type: 'eof', value: '', pos: input.length })
  return tokens
}
// ============ 递归下降解析 ============
class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos] }
  peekPublic(): Token { return this.peek() }
  private next(): Token { return this.tokens[this.pos++] }

  /** or（最低优先级） */
  parseOr(): ConditionAST {
    let left = this.parseAnd()
    while (this.peek().type === 'op' && this.peek().value === '||') {
      this.next()
      const right = this.parseAnd()
      left = { op: 'or', children: [left, right] }
    }
    return left
  }

  private parseAnd(): ConditionAST {
    let left = this.parseUnary()
    while (this.peek().type === 'op' && this.peek().value === '&&') {
      this.next()
      const right = this.parseUnary()
      left = { op: 'and', children: [left, right] }
    }
    return left
  }

  private parseUnary(): ConditionAST {
    const t = this.peek()
    if (t.type === 'op' && t.value === '!') {
      this.next()
      return { op: 'not', child: this.parseUnary() }
    }
    if (t.type === 'lparen') {
      this.next()
      const inner = this.parseOr()
      if (this.next().type !== 'rparen') throw new Error('缺少右括号（位置 ' + t.pos + '）')
      return inner
    }
    return this.parseComparison()
  }

  private parseComparison(): ConditionAST {
    const leftOperand = this.parseOperand()
    const t = this.peek()
    if (t.type === 'op') {
      const map: Record<string, ConditionAST['op']> = {
        '==': 'eq', '!=': 'neq', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
      }
      const op = map[t.value]
      if (op) {
        this.next()
        const right = this.parseOperand()
        return { op, left: leftOperand, right } as ConditionAST
      }
    }
    if (t.type === 'ident' && t.value === 'in') {
      this.next()
      const items: Operand[] = [this.parseOperand()]
      while (this.peek().type === 'comma') { this.next(); items.push(this.parseOperand()) }
      return { op: 'in', left: leftOperand, right: items }
    }
    // 裸标识符视为 has；裸字面量视为常量条件
    if (leftOperand.type === 'var') return { op: 'has', variable: leftOperand.name }
    return leftOperand.value ? { op: 'true' } : { op: 'false' }
  }

  private parseOperand(): Operand {
    const t = this.next()
    if (t.type === 'num') {
      const value = Number(t.value)
      if (Number.isNaN(value)) throw new Error('非法数字 "' + t.value + '"（位置 ' + t.pos + '）')
      return { type: 'lit', value }
    }
    if (t.type === 'str') return { type: 'lit', value: t.value }
    if (t.type === 'ident') {
      if (t.value === 'true') return { type: 'lit', value: true }
      if (t.value === 'false') return { type: 'lit', value: false }
      return { type: 'var', name: t.value }
    }
    throw new Error('期望变量或字面量（位置 ' + t.pos + '）')
  }
}

/** 将条件表达式字符串解析为 ConditionAST，失败返回 null（错误输出到 console.error） */
export function parseConditionExpression(expr: string): ConditionAST | null {
  const trimmed = expr.trim()
  if (!trimmed) return null
  try {
    const parser = new Parser(tokenize(trimmed))
    const result = parser.parseOr()
    if (parser.peekPublic().type !== 'eof') {
      throw new Error('多余的内容 "' + parser.peekPublic().value + '"（位置 ' + parser.peekPublic().pos + '）')
    }
    return result
  } catch (e) {
    console.error('条件表达式解析失败:', expr, e)
    return null
  }
}

/** 按顶层分隔符切分（忽略括号与字符串内的分隔符） */
export function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === sep && depth === 0) {
      parts.push(input.slice(start, i))
      start = i + 1
    }
  }
  parts.push(input.slice(start))
  return parts
}
