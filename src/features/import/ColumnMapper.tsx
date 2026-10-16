import { useEffect, useMemo, useState } from 'react'
import type { WorkbookInspection } from '../../core/importer/excel'
import type { ColumnMapping, ColumnRole } from '../../core/mapping/types'
import type { SheetConfig } from './ImportWizard'
import { SelectWithTips, type SelectOption } from '../../components/ui/SelectWithTips'
import { InfoTip } from '../../components/ui/InfoTip'

// 列映射：列出全部列 → 逐列分配角色（简化的角色集）

const inputCls =
  'px-1.5 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand'

type SimpleRole =
  | 'ignore'
  | 'id'
  | 'speaker'
  | 'text'
  | 'next'
  | 'optText'
  | 'optNext'
  | 'field'

interface ColAssign {
  role: SimpleRole
  /** optNext：配对的选项文字列 */
  pairText?: string
  /** field：字段名与类型 */
  fieldKey?: string
  fieldType?: 'string' | 'int' | 'float' | 'bool'
}

interface Props {
  inspection: WorkbookInspection
  configs: Record<string, SheetConfig>
  onChange: (name: string, patch: Partial<SheetConfig>) => void
  onValidChange?: (valid: boolean) => void
}

const ROLES: Array<{ value: SimpleRole; label: string; tip: string }> = [
  { value: 'ignore', label: '忽略', tip: '这一列的数据不会进入画布' },
  { value: 'id', label: 'ID', tip: '对话的唯一识别 ID，其他列通过它引用节点' },
  { value: 'speaker', label: '说话者', tip: '说话人名称' },
  { value: 'text', label: '对白', tip: '对白正文内容' },
  { value: 'next', label: '下一节点', tip: '主线跳转：填下一句对话的 ID，生成连线' },
  {
    value: 'optText',
    label: '选项文字',
    tip: '选项的文字内容。必须与某个"选项跳转"列配对，文字会显示在连线标签上',
  },
  {
    value: 'optNext',
    label: '选项跳转',
    tip: '选择该选项后跳转的下一节点 ID。必须在详情里配对一个"选项文字"列',
  },
  {
    value: 'field',
    label: '自定义字段',
    tip: '额外的数据列，需填写字段名并选择类型（文本/整数/数值/是否）',
  },
]

const FIELD_TYPES: Array<{ value: NonNullable<ColAssign['fieldType']>; label: string }> = [
  { value: 'string', label: 'string（文本）' },
  { value: 'int', label: 'integer（整数）' },
  { value: 'float', label: 'number（数值）' },
  { value: 'bool', label: 'boolean（是/否）' },
]

type AssignMap = Record<string, ColAssign>

/** 从现有列配置反推（支持"上一步"后再进来不丢配置） */
function assignsFromColumns(cfg: SheetConfig): AssignMap {
  const map: AssignMap = {}
  for (const c of cfg.columns) {
    const a: ColAssign = { role: 'ignore' }
    if (c.role === 'id') a.role = 'id'
    else if (c.role === 'field') {
      if (c.fieldKey === 'speaker') a.role = 'speaker'
      else if (c.fieldKey === 'text') a.role = 'text'
      else if (c.fieldKey) {
        a.role = 'field'
        a.fieldKey = c.fieldKey
        const allowed: NonNullable<ColAssign['fieldType']>[] = ['string', 'int', 'float', 'bool']
        a.fieldType = allowed.includes(c.fieldType as NonNullable<ColAssign['fieldType']>)
          ? (c.fieldType as NonNullable<ColAssign['fieldType']>)
          : 'string'
      }
    } else if (c.role === 'edge') {
      if (c.edgeConfig?.edgeType === 'choice') {
        a.role = 'optNext'
        a.pairText = c.edgeConfig?.labelColumn
      } else {
        a.role = 'next'
      }
    }
    map[c.columnName] = a
  }
  // 反推选项文字列：被某个选项跳转列的 labelColumn 引用的列
  for (const c of cfg.columns) {
    const lc = c.edgeConfig?.labelColumn
    if (c.role === 'edge' && lc && map[lc] && map[lc].role === 'ignore') {
      map[lc] = { role: 'optText' }
    }
  }
  return map
}

/** 分配结果 → 全部列的映射配置 */
function rebuildColumns(headers: string[], assign: AssignMap): ColumnMapping[] {
  return headers.map((h) => {
    const a = assign[h] ?? { role: 'ignore' as SimpleRole }
    const base: ColumnMapping = { columnName: h, role: 'ignore' as ColumnRole }
    switch (a.role) {
      case 'id':
        return { ...base, role: 'id' }
      case 'speaker':
        return { ...base, role: 'field', fieldKey: 'speaker', fieldType: 'string' }
      case 'text':
        return { ...base, role: 'field', fieldKey: 'text', fieldType: 'string' }
      case 'next':
        return {
          ...base,
          role: 'edge',
          edgeConfig: { portId: 'out', edgeType: 'next', targetIsNodeId: true },
        }
      case 'optNext':
        if (a.pairText) {
          return {
            ...base,
            role: 'edge',
            edgeConfig: {
              portId: 'out',
              edgeType: 'choice',
              targetIsNodeId: true,
              labelColumn: a.pairText,
            },
          }
        }
        return base
      case 'field':
        if (a.fieldKey?.trim()) {
          return { ...base, role: 'field', fieldKey: a.fieldKey.trim(), fieldType: a.fieldType ?? 'string' }
        }
        return base
      default:
        return base
    }
  })
}

function validateAssign(headers: string[], assign: AssignMap): string[] {
  const errs: string[] = []
  const byRole = (r: SimpleRole) => headers.filter((h) => assign[h]?.role === r)
  if (byRole('id').length === 0) errs.push('必须有一列设为 ID')
  if (byRole('id').length > 1) errs.push('ID 只能分配给一列')
  if (byRole('text').length === 0) errs.push('必须有一列设为对白')
  for (const r of ['speaker', 'text', 'next'] as SimpleRole[]) {
    if (byRole(r).length > 1) errs.push(`「${ROLES.find((x) => x.value === r)?.label}」只能分配给一列`)
  }
  // 选项配对：每个 optNext 必须配对一个 optText 列；每个 optText 必须被恰好一个 optNext 引用
  const optTexts = byRole('optText')
  const referenced = new Map<string, number>()
  for (const h of byRole('optNext')) {
    const t = assign[h]?.pairText
    if (!t) {
      errs.push(`列「${h}」为选项跳转，请在详情中配对一个选项文字列`)
      continue
    }
    if (t === h) errs.push(`列「${h}」不能与自己配对`)
    if (assign[t]?.role !== 'optText') {
      errs.push(`列「${h}」配对的「${t}」不是选项文字列`)
      continue
    }
    referenced.set(t, (referenced.get(t) ?? 0) + 1)
  }
  for (const h of optTexts) {
    const n = referenced.get(h) ?? 0
    if (n === 0) errs.push(`列「${h}」为选项文字，但缺少配对的选项跳转列`)
    if (n > 1) errs.push(`列「${h}」被多个选项跳转列配对`)
  }
  // 自定义字段：字段名必填
  for (const h of byRole('field')) {
    if (!assign[h]?.fieldKey?.trim()) errs.push(`列「${h}」为自定义字段，请填写字段名`)
  }
  return errs
}

function SlotHeader({ label, tip }: { label: string; tip: string }) {
  return (
    <th className="px-3 py-1.5 text-left font-medium">
      <span className="flex items-center gap-1">
        {label}
        <InfoTip title={label} description={tip} />
      </span>
    </th>
  )
}

export function ColumnMapper({ inspection, configs, onChange, onValidChange }: Props) {
  const selectedSheets = inspection.sheets.filter((sh) => configs[sh.sheetName]?.selected)
  const [assigns, setAssigns] = useState<Record<string, AssignMap>>({})

  // 挂载时从现有配置反推
  useEffect(() => {
    setAssigns((prev) => {
      const next = { ...prev }
      for (const sh of selectedSheets) {
        if (!next[sh.sheetName]) next[sh.sheetName] = assignsFromColumns(configs[sh.sheetName])
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 分配变化 → 重建列配置
  useEffect(() => {
    for (const sh of selectedSheets) {
      const a = assigns[sh.sheetName]
      if (!a) continue
      const columns = rebuildColumns(sh.headers, a)
      const cur = configs[sh.sheetName]?.columns
      if (JSON.stringify(cur) !== JSON.stringify(columns)) onChange(sh.sheetName, { columns })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigns])

  const errors = useMemo(
    () =>
      selectedSheets.flatMap((sh) => {
        const a = assigns[sh.sheetName]
        if (!a) return []
        return validateAssign(sh.headers, a).map((e) => `${sh.sheetName}：${e}`)
      }),
    [assigns, selectedSheets],
  )

  useEffect(() => {
    onValidChange?.(errors.length === 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors])

  const update = (sheetName: string, col: string, patch: Partial<ColAssign>) =>
    setAssigns((prev) => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        [col]: { ...prev[sheetName][col], ...patch },
      },
    }))

  /** 角色变更（含智能配对：选项文字 ↔ 选项跳转 自动寻找配对列） */
  const changeRole = (sheetName: string, headers: string[], col: string, role: SimpleRole) => {
    setAssigns((prev) => {
      const assign = { ...prev[sheetName] }
      if (role === 'field') {
        assign[col] = {
          role,
          fieldKey: assign[col]?.fieldKey ?? col,
          fieldType: assign[col]?.fieldType ?? 'string',
        }
      } else {
        assign[col] = { ...assign[col], role }
      }

      // 设为"选项文字"：自动填入第一个未配对的"选项跳转"列
      if (role === 'optText') {
        const empty = headers.find(
          (hh) => hh !== col && assign[hh]?.role === 'optNext' && !assign[hh]?.pairText,
        )
        if (empty) assign[empty] = { ...assign[empty], pairText: col }
      }

      // 设为"选项跳转"：自动选择最近一个未被占用的"选项文字"列
      if (role === 'optNext') {
        if (!assign[col]?.pairText) {
          const used = new Set(
            headers
              .filter((hh) => hh !== col && assign[hh]?.role === 'optNext')
              .map((hh) => assign[hh]?.pairText),
          )
          const candidates = headers.filter(
            (hh) => hh !== col && assign[hh]?.role === 'optText' && !used.has(hh),
          )
          const pick = candidates[candidates.length - 1]
          if (pick) assign[col] = { ...assign[col], pairText: pick }
        }
      }

      // 列从"选项文字"改为其他角色时，清掉引用它的配对
      if (prev[sheetName][col]?.role === 'optText' && role !== 'optText') {
        for (const hh of headers) {
          if (assign[hh]?.pairText === col) assign[hh] = { ...assign[hh], pairText: undefined }
        }
      }

      return { ...prev, [sheetName]: assign }
    })
  }

  return (
    <div className="space-y-4">
      {selectedSheets.map((sheet) => {
        const assign = assigns[sheet.sheetName]
        if (!assign) return null
        const optTextOptions = (exceptCol?: string): SelectOption[] =>
          sheet.headers
            .filter((h) => h !== exceptCol && assign[h]?.role === 'optText')
            .map((h) => ({ value: h, label: h }))

        return (
          <div key={sheet.sheetName} className="rounded-xl border border-ink-700 overflow-hidden">
            <div className="px-3 py-2 bg-ink-800 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">{sheet.sheetName}</span>
              <span className="text-xs text-gray-500">节点表 · 为每一列分配角色</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-ink-700">
                  <SlotHeader label="列名" tip="表格中的列头" />
                  <SlotHeader label="角色" tip="告诉导入器这一列的用途，悬停各角色可查看说明" />
                  <SlotHeader label="详情" tip="所选角色的附加配置" />
                </tr>
              </thead>
              <tbody>
                {sheet.headers.map((h) => {
                  const a = assign[h] ?? { role: 'ignore' as SimpleRole }
                  const roleDef = ROLES.find((r) => r.value === a.role)
                  return (
                    <tr key={h} className="border-b border-ink-700/40">
                      <td className="px-3 py-1.5 text-gray-200 font-medium">{h}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <SelectWithTips
                            className={`${inputCls} w-28`}
                            value={a.role}
                            options={ROLES.map(({ value, label, tip }) => ({ value, label, tip }))}
                            onChange={(v) => changeRole(sheet.sheetName, sheet.headers, h, v as SimpleRole)}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          {a.role === 'optNext' && (
                            <>
                              <SelectWithTips
                                className={`${inputCls} w-32`}
                                value={a.pairText ?? ''}
                                placeholder="配对选项文字"
                                options={[
                                  { value: '', label: '（未配对）', tip: '未配对将无法通过校验' },
                                  ...optTextOptions(h),
                                ]}
                                onChange={(v) => update(sheet.sheetName, h, { pairText: v || undefined })}
                              />
                              <InfoTip
                                title="配对选项文字"
                                description="选择一个角色为「选项文字」的列，其在该行的值会成为这条连线的标签文字。"
                              />
                            </>
                          )}
                          {a.role === 'field' && (
                            <>
                              <input
                                className={`${inputCls} w-24`}
                                placeholder="字段名"
                                value={a.fieldKey ?? ''}
                                onChange={(e) =>
                                  update(sheet.sheetName, h, { fieldKey: e.target.value })
                                }
                              />
                              <select
                                className={inputCls}
                                value={a.fieldType ?? 'string'}
                                onChange={(e) =>
                                  update(sheet.sheetName, h, {
                                    fieldType: e.target.value as NonNullable<
                                      ColAssign['fieldType']
                                    >,
                                  })
                                }
                              >
                                {FIELD_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                          {roleDef && a.role !== 'ignore' && a.role !== 'optNext' && a.role !== 'field' && (
                            <span className="text-gray-600">{roleDef.tip}</span>
                          )}
                          {a.role === 'ignore' && <span className="text-gray-600">—</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-500/10 p-2.5 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="text-xs text-red-400">
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
