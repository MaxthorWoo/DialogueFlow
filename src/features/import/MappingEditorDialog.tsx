import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { WorkbookInspection } from '../../core/importer/excel'
import { applyMapping } from '../../core/mapping/engine'
import type { MappingProfile } from '../../core/mapping/types'
import { useProjectStore } from '../../store/useProjectStore'
import { ColumnMapper } from './ColumnMapper'

// 映射配置弹窗：导入后重新调整全局的角色分配，并基于导入时的表格数据重放

export function MappingEditorDialog({ onClose }: { onClose: () => void }) {
  const profiles = useProjectStore((s) => s.profiles)
  const activeProfileId = useProjectStore((s) => s.activeProfileId)
  const setIR = useProjectStore((s) => s.setIR)
  const setProfiles = useProjectStore((s) => s.setProfiles)
  const profile: MappingProfile | undefined =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const inspection = useMemo<WorkbookInspection>(
    () => ({
      sheets: (profile?.sheets ?? []).map((s) => ({
        sheetName: s.sheetName,
        headers: s.columns.map((c) => c.columnName),
        rowCount: 0,
        sampleRows: [],
        inferredTypes: {},
        hasMergedHeaders: false,
        headerRowIndex: s.headerRowIndex ?? 0,
      })),
      fileName: profile?.name ?? '',
    }),
    [profile],
  )

  const initialConfigs = useMemo(() => {
    const cfgs = Object.fromEntries(
      (profile?.sheets ?? []).map((s) => [
        s.sheetName,
        {
          selected: true,
          entityType: s.entityType,
          headerRow: s.headerRowIndex ?? 0,
          columns: s.columns,
        },
      ]),
    )
    return cfgs as React.ComponentProps<typeof ColumnMapper>['configs']
  }, [profile])

  const [configs, setConfigs] = useState(initialConfigs)
  const [valid, setValid] = useState(true)

  const hasSource = Boolean(profile?.sourceData)

  const apply = () => {
    if (!profile) return
    const updated: MappingProfile = {
      ...profile,
      sheets: profile.sheets.map((s) => ({
        ...s,
        columns: configs[s.sheetName]?.columns ?? s.columns,
      })),
    }
    const ir = useProjectStore.getState().ir
    const r = applyMapping({
      sheets: updated.sourceData ?? {},
      profile: updated,
      mode: 'merge',
      baseIR: ir,
    })
    setIR(r.ir)
    setProfiles([updated], updated.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-[860px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <h2 className="text-base font-semibold text-gray-100">映射配置</h2>
          <button className="text-gray-500 hover:text-white" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {!profile ? (
            <div className="text-sm text-gray-500 text-center py-16">
              当前没有映射配置。请先通过「导入表格」创建。
            </div>
          ) : !hasSource ? (
            <div className="text-sm text-gray-500 text-center py-16">
              该项目缺少导入时的表格数据（可能由旧版本创建），无法重新应用映射。请重新导入表格。
            </div>
          ) : (
            <ColumnMapper
              inspection={inspection}
              configs={configs}
              onChange={(name, patch) =>
                setConfigs((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))
              }
              onValidChange={setValid}
            />
          )}
        </div>

        {profile && hasSource && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700">
            <div className="text-xs text-gray-500">
              应用后将基于导入时的表格数据重新生成画布（保留现有节点布局）
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-ink-800 border border-ink-700 text-gray-300 hover:text-white text-sm transition-colors"
                onClick={onClose}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-bright text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!valid}
                onClick={apply}
              >
                应用并重新导入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
