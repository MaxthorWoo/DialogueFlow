import type { FieldDefinition } from '../../../core/ir/types'

// 基础字段编辑器

const inputCls =
  'w-full px-2 py-1.5 rounded-md bg-ink-800 border border-ink-700 text-sm text-gray-200 focus:outline-none focus:border-brand transition-colors'

interface FieldProps {
  field: FieldDefinition
  value: unknown
  onChange: (v: unknown) => void
}

export function StringField({ value, onChange }: FieldProps) {
  return (
    <input
      className={inputCls}
      value={typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function NumberField({ field, value, onChange }: FieldProps) {
  const num = typeof value === 'number' ? value : ''
  return (
    <input
      type="number"
      step={field.type === 'int' ? 1 : 'any'}
      className={inputCls}
      value={num as number | string}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? undefined : Number(v))
      }}
    />
  )
}

export function BoolField({ value, onChange }: FieldProps) {
  return (
    <button
      className={`w-full px-2 py-1.5 rounded-md text-sm border transition-colors ${
        value ? 'bg-brand/20 border-brand text-brand' : 'bg-ink-800 border-ink-700 text-gray-400'
      }`}
      onClick={() => onChange(!value)}
    >
      {value ? '是' : '否'}
    </button>
  )
}

export function EnumField({ field, value, onChange }: FieldProps) {
  return (
    <select
      className={inputCls}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">（未设置）</option>
      {(field.enumValues ?? []).map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  )
}

export function JsonField({ value, onChange }: FieldProps) {
  const text = value === undefined || value === null ? '' : JSON.stringify(value, null, 2)
  return (
    <textarea
      className={`${inputCls} font-mono text-xs min-h-20`}
      defaultValue={text}
      onBlur={(e) => {
        const raw = e.target.value.trim()
        if (!raw) {
          onChange(undefined)
          return
        }
        try {
          onChange(JSON.parse(raw))
        } catch {
          console.error('无效 JSON:', raw)
        }
      }}
    />
  )
}

export function AssetField({ value, onChange }: FieldProps) {
  return (
    <input
      className={`${inputCls} font-mono text-xs`}
      placeholder="assets/..."
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
