import type { EffectAST } from '../../../core/ir/types'
import { EFFECT_OPS, createEffect, operandToText } from '../ast-utils'

// 效果 AST 列表编辑器

type OperandShape = { type: 'var'; name: string } | { type: 'lit'; value: string | number | boolean }

const selectCls = 'px-1.5 py-1 rounded bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand'
const inputCls = 'px-1.5 py-1 rounded bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand flex-1 min-w-0'

function effectToText(e: EffectAST): string {
  if (e.op === 'trigger') return `trigger(${e.event})`
  return `${e.variable} ${e.op} ${operandToText(e.value)}`
}

function OperandEditor({
  value,
  onChange,
}: {
  value: OperandShape
  onChange: (v: OperandShape) => void
}) {
  const isVar = value.type === 'var'
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <select
        className={selectCls}
        value={isVar ? 'var' : 'lit'}
        onChange={(e) =>
          onChange(e.target.value === 'var' ? { type: 'var', name: '' } : { type: 'lit', value: '' })
        }
      >
        <option value="var">变量</option>
        <option value="lit">常量</option>
      </select>
      <input
        className={inputCls}
        list="nf-variable-list"
        value={isVar ? (value as { name: string }).name : String((value as { value: unknown }).value ?? '')}
        onChange={(e) =>
          isVar
            ? onChange({ type: 'var', name: e.target.value })
            : onChange({ type: 'lit', value: e.target.value })
        }
        placeholder={isVar ? '变量名' : '值'}
      />
    </div>
  )
}

export function EffectField({
  value,
  onChange,
}: {
  value: EffectAST[] | undefined
  onChange: (v: EffectAST[] | undefined) => void
}) {
  const effects = value ?? []
  const update = (i: number, patch: Partial<EffectAST>) => {
    const next = effects.map((e, j) => (j === i ? ({ ...e, ...patch } as EffectAST) : e))
    onChange(next)
  }

  return (
    <div className="space-y-1.5">
      <datalist id="nf-variable-list">
        {/* 变量列表由外部 datalist 提供，此处为空占位 */}
      </datalist>
      {effects.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap">
          <select
            className={selectCls}
            value={e.op}
            onChange={(ev) => update(i, createEffect(ev.target.value) as Partial<EffectAST>)}
          >
            {EFFECT_OPS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {e.op === 'trigger' ? (
            <input
              className={inputCls}
              value={e.event}
              onChange={(ev) => update(i, { event: ev.target.value } as Partial<EffectAST>)}
              placeholder="事件名"
            />
          ) : (
            <>
              <input
                className={inputCls}
                list="nf-variable-list"
                value={e.variable}
                onChange={(ev) => update(i, { variable: ev.target.value } as Partial<EffectAST>)}
                placeholder="变量名"
              />
              {e.op !== 'append' && (
                <OperandEditor
                  value={e.value as OperandShape}
                  onChange={(v) => update(i, { value: v } as Partial<EffectAST>)}
                />
              )}
            </>
          )}
          <button
            className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-700 text-xs text-red-400 hover:bg-red-500/20"
            onClick={() => onChange(effects.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      {effects.length > 0 && (
        <div className="text-xs text-gray-500 font-mono truncate">
          {effects.map(effectToText).join('; ')}
        </div>
      )}
      <button
        className="px-2 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-300 hover:text-white"
        onClick={() => onChange([...effects, createEffect('set') as EffectAST])}
      >
        + 添加效果
      </button>
    </div>
  )
}
