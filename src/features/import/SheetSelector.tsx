import type { WorkbookInspection } from '../../core/importer/excel'
import type { SheetConfig } from './ImportWizard'

// Step 2：Sheet 选择与表头行调整

interface Props {
  inspection: WorkbookInspection
  configs: Record<string, SheetConfig>
  onChange: (name: string, patch: Partial<SheetConfig>) => void
}

export function SheetSelector({ inspection, configs, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          共 {inspection.sheets.length} 个 Sheet，勾选要导入的 Sheet 并指定实体类型
        </p>
      </div>
      {inspection.sheets.map((sheet) => {
        const cfg = configs[sheet.sheetName]
        if (!cfg) return null
        return (
          <div
            key={sheet.sheetName}
            className={`rounded-xl border p-3 transition-colors ${
              cfg.selected ? 'border-brand/60 bg-brand/5' : 'border-ink-700 bg-ink-800/40'
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[#4A90D9]"
                  checked={cfg.selected}
                  onChange={(e) => onChange(sheet.sheetName, { selected: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-200">{sheet.sheetName}</span>
              </label>
              <span className="text-xs text-gray-500">{sheet.rowCount} 行数据</span>
              {sheet.hasMergedHeaders && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  检测到合并表头
                </span>
              )}
              {cfg.selected && (
                <>
                  <select
                    className="px-2 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-200"
                    value={cfg.entityType}
                    onChange={(e) =>
                      onChange(sheet.sheetName, {
                        entityType: e.target.value as SheetConfig['entityType'],
                      })
                    }
                  >
                    <option value="node">节点表（每行一个节点）</option>
                    <option value="edge">边表（每行一条边）</option>
                    <option value="variable">变量表（每行一个变量）</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    表头行
                    <input
                      type="number"
                      min={0}
                      className="w-16 px-1.5 py-1 rounded-md bg-ink-800 border border-ink-700 text-xs text-gray-200"
                      value={cfg.headerRow}
                      onChange={(e) =>
                        onChange(sheet.sheetName, { headerRow: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            {cfg.selected && sheet.sampleRows.length > 0 && (
              <div className="mt-2 overflow-auto max-h-40 rounded-lg border border-ink-700/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ink-800">
                      {sheet.headers.map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-gray-400 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.sampleRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-ink-700/60">
                        {sheet.headers.map((h) => (
                          <td key={h} className="px-2 py-1 text-gray-300 whitespace-nowrap max-w-40 truncate">
                            {row[h] === null || row[h] === undefined ? '' : String(row[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
