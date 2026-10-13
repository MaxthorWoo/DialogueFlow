import type { ConditionAST } from '../../../core/ir/types'
import { CONDITION_OPS, createCondition, conditionToText } from '../ast-utils'

// 可视化条件 AST 树编辑器（支持 and/or/not 嵌套）

interface OperandEditorProps {
  value: { type: 'var'; name: string } | { type: 'lit'; value: string | number | boolean }
  variables: string[]
  onChange: (v: ConditionAST extends never ? never : OperandShape) => void
}

type OperandShape = { type: 'var'; name: string } | { type: 'lit'; value: string | number | boolean }

const selectCls = 'px-1.5 py-1 rounded bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand'
const inputCls = 'px-1.5 py-1 rounded bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand flex-1 min-w-0'

function OperandEditor({ value, variables, onChange }: OperandEditorProps) {
  const isVar = value.type === 'var'
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <select
        className={selectCls}
        value={isVar ? 'var' : 'lit'}
        onChange={(e) => {
          if (e.target.value === 'var') onChange({ type: 'var', name: '' })
          else onChange({ type: 'lit', value: '' })
        }}
      >
        <option value="var">变量</option>
        <option value="lit">常量</option>
      </select>
      {isVar ? (
        <>
          <input
            className={inputCls}
            list="nf-variable-list"
            value={(value as { name: string }).name}
            onChange={(e) => onChange({ type: 'var', name: e.target.value })}
            placeholder="变量名"
          />
        </>
      ) : (
        <input
          className={inputCls}
          value={String((value as { value: unknown }).value ?? '')}
          onChange={(e) => {
            const raw = e.target.value
            const num = Number(raw)
            onChange({ type: 'lit', value: raw !== '' && !Number.isNaN(num) ? num : raw })
          }}
          placeholder="值"
        />
      )}
    </div>
  )
}

interface ConditionEditorProps {
  value: ConditionAST
  variables: string[]
  onChange: (v: ConditionAST) => void
  depth?: number
}

export function ConditionEditor({ value, variables, onChange, depth = 0 }: ConditionEditorProps) {
  const update = (patch: Partial<ConditionAST>) => onChange({ ...value, ...patch } as ConditionAST)

  const opSelector = (
    <select
      className={selectCls}
      value={value.op}
      onChange={(e) => onChange(createCondition(e.target.value))}
    >
      {CONDITION_OPS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )

  if (value.op === 'and' || value.op === 'or') {
    return (
      <div className={`rounded-md border p-2 ${depth > 0 ? 'border-ink-700 bg-ink-900/60' : 'border-ink-700'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {opSelector}
          <button
            className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-700 text-xs text-gray-400 hover:text-white"
            onClick={() => update({ children: [...value.children, { op: 'true' } as ConditionAST] } as ConditionAST)}
          >
            + 子条件
          </button>
        </div>
        <div className="space-y-1.5">
          {value.children.map((child, i) => (
            <div key={i} className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <ConditionEditor
                  value={child}
                  variables={variables}
                  depth={depth + 1}
                  onChange={(v) => {
                    const children = [...value.children]
                    children[i] = v
                    update({ children } as ConditionAST)
                  }}
                />
              </div>
              <button
                className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-700 text-xs text-red-400 hover:bg-red-500/20"
                onClick={() => update({ children: value.children.filter((_, j) => j !== i) } as ConditionAST)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (value.op === 'not') {
    return (
      <div className="rounded-md border border-ink-700 p-2">
        <div className="mb-1.5">{opSelector}</div>
        <ConditionEditor
          value={value.child}
          variables={variables}
          depth={depth + 1}
          onChange={(v) => update({ child: v } as ConditionAST)}
        />
      </div>
    )
  }

  if (value.op === 'has') {
    return (
      <div className="flex items-center gap-1.5">
        {opSelector}
        <input
          className={inputCls}
          list="nf-variable-list"
          value={value.variable}
          onChange={(e) => update({ variable: e.target.value } as ConditionAST)}
          placeholder="变量名"
        />
      </div>
    )
  }

  if (value.op === 'true' || value.op === 'false') {
    return <div>{opSelector}</div>
  }

  // 比较 / in
  const left = (value as { left: OperandShape }).left
  const right = (value as { right: OperandShape | OperandShape[] }).right
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {opSelector}
      <OperandEditor
        value={left}
        variables={variables}
        onChange={(v) => update({ left: v } as ConditionAST)}
      />
      {value.op === 'in' ? (
        <OperandEditor
          value={Array.isArray(right) ? right[0] ?? { type: 'lit', value: '' } : (right as OperandShape)}
          variables={variables}
          onChange={(v) => update({ right: [v] } as ConditionAST)}
        />
      ) : (
        <OperandEditor
          value={right as OperandShape}
          variables={variables}
          onChange={(v) => update({ right: v } as ConditionAST)}
        />
      )}
    </div>
  )
}

/** 条件字段（含 JSON 源码模式） */
export function ConditionField({
  value,
  variables,
  onChange,
}: {
  value: ConditionAST | undefined
  variables: string[]
  onChange: (v: ConditionAST | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <datalist id="nf-variable-list">
        {variables.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {value ? (
        <>
          <div className="text-xs text-gray-500 font-mono truncate">{conditionToText(value)}</div>
          <ConditionEditor value={value} variables={variables} onChange={onChange} />
          <button
            className="text-xs text-red-400 hover:text-red-300"
            onClick={() => onChange(undefined)}
          >
            清除条件
          </button>
        </>
      ) : (
        <button
          className="px-2 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-300 hover:text-white"
          onClick={() => onChange({ op: 'true' })}
        >
          + 添加条件
        </button>
      )}
    </div>
  )
}
