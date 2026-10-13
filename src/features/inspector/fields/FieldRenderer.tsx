import type { FieldDefinition } from '../../../core/ir/types'
import type { ConditionAST, EffectAST } from '../../../core/ir/types'
import { StringField, NumberField, BoolField, EnumField, JsonField, AssetField } from './basic'
import { ConditionField } from './ConditionField'
import { EffectField } from './EffectField'

// 字段渲染分发器：按 FieldType 分发到对应编辑器

interface FieldRendererProps {
  field: FieldDefinition
  value: unknown
  variables: string[]
  nodeOptions: Array<{ id: string; label: string }>
  onChange: (v: unknown) => void
}

const labelCls = 'block text-xs text-gray-400 mb-1'
const inputCls =
  'w-full px-2 py-1.5 rounded-md bg-ink-800 border border-ink-700 text-sm text-gray-200 focus:outline-none focus:border-brand transition-colors'

export function FieldRenderer({ field, value, variables, nodeOptions, onChange }: FieldRendererProps) {
  let editor: React.ReactNode
  switch (field.type) {
    case 'string':
      editor = <StringField field={field} value={value} onChange={onChange} />
      break
    case 'int':
    case 'float':
      editor = <NumberField field={field} value={value} onChange={onChange} />
      break
    case 'bool':
      editor = <BoolField field={field} value={value} onChange={onChange} />
      break
    case 'enum':
      editor = <EnumField field={field} value={value} onChange={onChange} />
      break
    case 'ref':
      editor = (
        <select
          className={inputCls}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">（未设置）</option>
          {nodeOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      )
      break
    case 'condition':
      editor = (
        <ConditionField
          value={value as ConditionAST | undefined}
          variables={variables}
          onChange={(v) => onChange(v)}
        />
      )
      break
    case 'effect':
      editor = (
        <EffectField
          value={value as EffectAST[] | undefined}
          onChange={(v) => onChange(v)}
        />
      )
      break
    case 'json':
      editor = <JsonField field={field} value={value} onChange={onChange} />
      break
    case 'asset':
      editor = <AssetField field={field} value={value} onChange={onChange} />
      break
    default:
      editor = <StringField field={field} value={value} onChange={onChange} />
  }

  return (
    <div>
      <label className={labelCls}>
        {field.label ?? field.key}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
        <span className="text-gray-600 ml-1.5 font-mono">{field.type}</span>
      </label>
      {editor}
    </div>
  )
}
