import type { WorkbookInspection } from '../../core/importer/excel'
import type { ColumnMapping, ColumnRole } from '../../core/mapping/types'
import type { SheetConfig } from './ImportWizard'

const ROLES: Array<{ value: ColumnRole; label: string }> = [
  { value: 'ignore', label: '忽略' },
  { value: 'id', label: 'ID' },
  { value: 'nodeType', label: '节点类型' },
  { value: 'field', label: '字段' },
  { value: 'edge', label: '边（下一节点）' },
  { value: 'edgeLabel', label: '边标签' },
  { value: 'edgeOrder', label: '边排序' },
  { value: 'condition', label: '条件' },
  { value: 'effect', label: '效果' },
  { value: 'start', label: '起始标记' },
  { value: 'from', label: '边源（边表）' },
  { value: 'to', label: '边目标（边表）' },
  { value: 'variable', label: '变量名（变量表）' },
]

const inputCls =
  'px-1.5 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-200 focus:outline-none focus:border-brand'

interface Props {
  inspection: WorkbookInspection
  configs: Record<string, SheetConfig>
  profileBase: 'vn' | 'rpg'
  onProfileBaseChange: (v: 'vn' | 'rpg') => void
  onChange: (name: string, patch: Partial<SheetConfig>) => void
}

export function ColumnMapper({ inspection, configs, profileBase, onProfileBaseChange, onChange }: Props) {
  const selectedSheets = inspection.sheets.filter((s) => configs[s.sheetName]?.selected)

  const sampleOf = (sheetName: string, column: string): string => {
    const sheet = inspection.sheets.find((s) => s.sheetName === sheetName)
    if (!sheet) return ''
    const values = sheet.sampleRows
      .slice(0, 3)
      .map((r) => r[column])
      .filter((v) => v !== null && v !== undefined)
    return values.map((v) => String(v).slice(0, 18)).join(', ')
  }

  const updateColumn = (sheetName: string, colName: string, patch: Partial<ColumnMapping>) => {
    const cfg = configs[sheetName]
    onChange(sheetName, {
      columns: cfg.columns.map((c) => (c.columnName === colName ? { ...c, ...patch } : c)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">节点类型模板：</span>
        <select
          className={`${inputCls} text-sm`}
          value={profileBase}
          onChange={(e) => onProfileBaseChange(e.target.value as 'vn' | 'rpg')}
        >
          <option value="vn">视觉小说标准（say/choice/branch/action/jump/end）</option>
          <option value="rpg">RPG 任务对话（含 quest/battle/变量系统）</option>
        </select>
      </div>

      {selectedSheets.map((sheet) => {
        const cfg = configs[sheet.sheetName]
        return (
          <div key={sheet.sheetName} className="rounded-xl border border-ink-700 overflow-hidden">
            <div className="px-3 py-2 bg-ink-800 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">{sheet.sheetName}</span>
              <span className="text-xs text-gray-500">
                {cfg.entityType === 'node' ? '节点表' : cfg.entityType === 'edge' ? '边表' : '变量表'}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-ink-700">
                  <th className="px-3 py-1.5 text-left font-medium">列名</th>
                  <th className="px-3 py-1.5 text-left font-medium">推断类型</th>
                  <th className="px-3 py-1.5 text-left font-medium">样本值</th>
                  <th className="px-3 py-1.5 text-left font-medium">角色</th>
                  <th className="px-3 py-1.5 text-left font-medium">详情</th>
                </tr>
              </thead>
              <tbody>
                {sheet.headers.map((h) => {
                  const col = cfg.columns.find((c) => c.columnName === h)
                  if (!col) return null
                  return (
                    <tr key={h} className="border-b border-ink-700/40">
                      <td className="px-3 py-1.5 text-gray-200 font-medium">{h}</td>
                      <td className="px-3 py-1.5 text-gray-500">{sheet.inferredTypes[h] ?? '-'}</td>
                      <td className="px-3 py-1.5 text-gray-400 max-w-40 truncate">
                        {sampleOf(sheet.sheetName, h)}
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          className={inputCls}
                          value={col.role}
                          onChange={(e) =>
                            updateColumn(sheet.sheetName, h, { role: e.target.value as ColumnRole })
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        {col.role === 'field' && (
                          <input
                            className={`${inputCls} w-28`}
                            placeholder="字段 key"
                            value={col.fieldKey ?? ''}
                            onChange={(e) =>
                              updateColumn(sheet.sheetName, h, {
                                fieldKey: e.target.value || undefined,
                              })
                            }
                          />
                        )}
                        {col.role === 'edge' && (
                          <div className="flex gap-1">
                            <input
                              className={`${inputCls} w-16`}
                              placeholder="端口"
                              value={col.edgeConfig?.portId ?? 'out'}
                              onChange={(e) =>
                                updateColumn(sheet.sheetName, h, {
                                  edgeConfig: {
                                    portId: e.target.value || 'out',
                                    edgeType: col.edgeConfig?.edgeType ?? 'next',
                                    targetIsNodeId: true,
                                  },
                                })
                              }
                            />
                            <input
                              className={`${inputCls} w-20`}
                              placeholder="边类型"
                              value={col.edgeConfig?.edgeType ?? 'next'}
                              onChange={(e) =>
                                updateColumn(sheet.sheetName, h, {
                                  edgeConfig: {
                                    portId: col.edgeConfig?.portId ?? 'out',
                                    edgeType: e.target.value || 'next',
                                    targetIsNodeId: true,
                                  },
                                })
                              }
                            />
                          </div>
                        )}
                        {col.role === 'nodeType' && (
                          <input
                            className={`${inputCls} w-44`}
                            placeholder="值映射，如 对话:say, 选择:choice"
                            defaultValue={Object.entries(col.valueMap ?? {})
                              .map(([k, v]) => `${k}:${v}`)
                              .join(', ')}
                            onBlur={(e) => {
                              const map: Record<string, string> = {}
                              for (const pair of e.target.value.split(',')) {
                                const idx = pair.indexOf(':')
                                if (idx > 0) {
                                  map[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
                                }
                              }
                              updateColumn(sheet.sheetName, h, {
                                valueMap: Object.keys(map).length ? map : undefined,
                              })
                            }}
                          />
                        )}
                        {(col.role === 'condition' || col.role === 'effect') && (
                          <select
                            className={inputCls}
                            value={col.parseFormat ?? 'expression'}
                            onChange={(e) =>
                              updateColumn(sheet.sheetName, h, {
                                parseFormat: e.target.value as 'json' | 'expression',
                              })
                            }
                          >
                            <option value="expression">表达式</option>
                            <option value="json">JSON</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
