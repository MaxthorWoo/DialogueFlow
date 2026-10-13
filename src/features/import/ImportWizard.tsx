import { useState } from 'react'
import { inspectWorkbook, extractRows, type WorkbookInspection } from '../../core/importer/excel'
import type { ColumnMapping, ColumnRole, SheetMapping, MappingProfile } from '../../core/mapping/types'
import { applyMapping } from '../../core/mapping/engine'
import { visualNovelProfile, rpgDialogueProfile } from '../../core/mapping/presets'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { SheetSelector } from './SheetSelector'
import { ColumnMapper } from './ColumnMapper'

interface SheetConfig {
  selected: boolean
  entityType: 'node' | 'edge' | 'variable'
  headerRow: number
  columns: ColumnMapping[]
}

export type { SheetConfig }

type Step = 1 | 2 | 3 | 4

const btnPrimary =
  'px-4 py-2 rounded-lg bg-brand hover:bg-brand-bright text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const btnSecondary =
  'px-4 py-2 rounded-lg bg-ink-800 border border-ink-700 text-gray-300 hover:text-white text-sm transition-colors'

export function ImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null)
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, SheetConfig>>({})
  const [profileBase, setProfileBase] = useState<'vn' | 'rpg'>('vn')
  const [result, setResult] = useState<ReturnType<typeof applyMapping> | null>(null)

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer()
    const insp = inspectWorkbook(buf, file.name)
    const configs: Record<string, SheetConfig> = {}
    for (const sheet of insp.sheets) {
      configs[sheet.sheetName] = {
        selected: false,
        entityType: 'node',
        headerRow: sheet.headerRowIndex,
        columns: sheet.headers.map((h) => ({
          columnName: h,
          role: 'ignore' as ColumnRole,
        })),
      }
    }
    setFileName(file.name)
    setBuffer(buf)
    setInspection(insp)
    setSheetConfigs(configs)
    setStep(2)
  }

  const updateConfig = (name: string, patch: Partial<SheetConfig>) => {
    setSheetConfigs((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))
  }

  const buildProfile = (): MappingProfile => {
    const base = profileBase === 'vn' ? visualNovelProfile : rpgDialogueProfile
    const sheets: SheetMapping[] = []
    for (const [sheetName, cfg] of Object.entries(sheetConfigs)) {
      if (!cfg.selected) continue
      sheets.push({
        sheetName,
        entityType: cfg.entityType,
        headerRowIndex: cfg.headerRow,
        columns: cfg.columns,
      })
    }
    return {
      ...base,
      id: `${base.id}-custom-${Date.now().toString(36)}`,
      name: `${fileName} · ${base.name}`,
      sheets,
    }
  }

  const runPreview = () => {
    const profile = buildProfile()
    const sheetsData: Record<string, Record<string, unknown>[]> = {}
    for (const sheet of profile.sheets) {
      sheetsData[sheet.sheetName] = buffer
        ? extractRows(buffer, sheet.sheetName, sheet.headerRowIndex)
        : []
    }
    const ir = useProjectStore.getState().ir
    const r = applyMapping({ sheets: sheetsData, profile, mode: 'replace', baseIR: ir })
    setResult(r)
    setStep(4)
  }

  const confirmImport = () => {
    if (!result) return
    const profile = buildProfile()
    useProjectStore.getState().setIR(result.ir)
    useProjectStore.getState().setProfiles([profile], profile.id)
    useEditorStore.getState().setLeftPanel('none')
    onClose()
  }

  const selectedCount = Object.values(sheetConfigs).filter((c) => c.selected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-[860px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <h2 className="text-base font-semibold text-gray-100">导入 Excel</h2>
          <div className="flex items-center gap-1.5 text-xs">
            {['文件', 'Sheet', '列映射', '预览'].map((label, i) => (
              <span
                key={label}
                className={`px-2 py-0.5 rounded-full ${
                  step === i + 1 ? 'bg-brand text-white' : 'bg-ink-800 text-gray-500'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <button className="text-gray-500 hover:text-white" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <label className={`${btnPrimary} cursor-pointer`}>
                选择 Excel 文件（.xlsx / .xls）
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
              <p className="text-xs text-gray-500">支持多 Sheet、自动探测表头行与列类型</p>
            </div>
          )}

          {step === 2 && inspection && (
            <SheetSelector inspection={inspection} configs={sheetConfigs} onChange={updateConfig} />
          )}

          {step === 3 && inspection && (
            <ColumnMapper
              inspection={inspection}
              configs={sheetConfigs}
              profileBase={profileBase}
              onProfileBaseChange={setProfileBase}
              onChange={updateConfig}
            />
          )}

          {step === 4 && result && (
            <div className="space-y-4">
              <div className="flex gap-3 text-sm">
                <div className="flex-1 rounded-lg bg-ink-800 p-3">
                  <div className="text-2xl font-semibold text-brand">{result.nodes.length}</div>
                  <div className="text-xs text-gray-500">节点</div>
                </div>
                <div className="flex-1 rounded-lg bg-ink-800 p-3">
                  <div className="text-2xl font-semibold text-nodeAction">{result.edges.length}</div>
                  <div className="text-xs text-gray-500">边</div>
                </div>
                <div className="flex-1 rounded-lg bg-ink-800 p-3">
                  <div className="text-2xl font-semibold text-nodeChoice">{result.variables.length}</div>
                  <div className="text-xs text-gray-500">变量</div>
                </div>
              </div>
              {result.startNodeId && (
                <div className="text-xs text-gray-500">起始节点：{result.startNodeId}</div>
              )}
              {result.errors.slice(0, 10).map((e, i) => (
                <div key={`e${i}`} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">
                  {e.message}
                </div>
              ))}
              {result.warnings.slice(0, 10).map((w, i) => (
                <div key={`w${i}`} className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                  {w.message}
                </div>
              ))}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-1.5">节点预览（前 10）</h4>
                <div className="rounded-lg border border-ink-700 divide-y divide-ink-700/60">
                  {result.nodes.slice(0, 10).map((n) => (
                    <div key={n.id} className="px-3 py-1.5 text-xs flex gap-2">
                      <span className="font-mono text-gray-500">{n.id}</span>
                      <span className="text-brand">{n.type}</span>
                      <span className="text-gray-400 truncate">
                        {JSON.stringify(n.fields).slice(0, 80)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-1.5">边预览（前 10）</h4>
                <div className="rounded-lg border border-ink-700 divide-y divide-ink-700/60">
                  {result.edges.slice(0, 10).map((e) => (
                    <div key={e.id} className="px-3 py-1.5 text-xs flex gap-2">
                      <span className="font-mono text-gray-500">
                        {e.from}:{e.fromPort}
                      </span>
                      <span className="text-gray-600">→</span>
                      <span className="font-mono text-nodeAction">{e.to}</span>
                      {e.label && <span className="text-nodeChoice">“{e.label}”</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700">
          <div className="text-xs text-gray-500">{fileName}</div>
          <div className="flex gap-2">
            {step > 1 && (
              <button className={btnSecondary} onClick={() => setStep((step - 1) as Step)}>
                上一步
              </button>
            )}
            {step === 2 && (
              <button className={btnPrimary} disabled={selectedCount === 0} onClick={() => setStep(3)}>
                下一步（{selectedCount} 个 Sheet）
              </button>
            )}
            {step === 3 && (
              <button className={btnPrimary} onClick={runPreview}>
                生成预览
              </button>
            )}
            {step === 4 && (
              <button className={btnPrimary} onClick={confirmImport}>
                导入并载入画布
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
