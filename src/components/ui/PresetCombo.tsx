import { useState } from 'react'
import { List } from 'lucide-react'
import { SelectWithTips, type SelectOption } from './SelectWithTips'

// 预设下拉 + 手动输入组合框：
// 常态为下拉（含预设说明），最后一项"手动输入…"切换为自由输入

const CUSTOM = '__custom__'

interface Props {
  value: string | undefined
  options: SelectOption[]
  onChange: (value: string | undefined) => void
  className?: string
  /** 值为空时下拉框上显示的占位文字 */
  placeholder?: string
}

export function PresetCombo({ value, options, onChange, className = '', placeholder }: Props) {
  const [custom, setCustom] = useState(false)

  if (custom) {
    return (
      <div className="flex items-center gap-1">
        <input
          className={className}
          placeholder="手动输入"
          autoFocus
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setCustom(false)
          }}
        />
        <button
          type="button"
          className="p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-ink-700 transition-colors shrink-0"
          title="返回列表选择"
          onClick={() => setCustom(false)}
        >
          <List size={12} />
        </button>
      </div>
    )
  }

  return (
    <SelectWithTips
      className={className}
      value={value ?? ''}
      placeholder={placeholder}
      options={[
        ...options,
        ...(value && !options.some((o) => o.value === value)
          ? [{ value, label: value, tip: '当前已保存的自定义值' }]
          : []),
        { value: CUSTOM, label: '手动输入…', tip: '列表里没有需要的值？选择此项后可直接键入，按 Esc 或点列表图标返回选择。' },
      ]}
      onChange={(v) => {
        if (v === CUSTOM) {
          setCustom(true)
          onChange(undefined)
        } else {
          onChange(v || undefined)
        }
      }}
    />
  )
}
