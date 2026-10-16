import { useEffect } from 'react'
import { Settings2, X } from 'lucide-react'
import { useEditorStore, type ThemeMode } from '../../store/useEditorStore'
import { TitleBar } from './TitleBar'
import { Toolbar } from './Toolbar'
import { NarrativeCanvas } from '../../features/canvas/NarrativeCanvas'
import { NodeInspector } from '../../features/inspector/NodeInspector'
import { ImportWizard } from '../../features/import/ImportWizard'
import { MappingEditorDialog } from '../../features/import/MappingEditorDialog'
import { ReaderMode } from '../../features/reader/ReaderMode'
import { ExportDialog } from '../../features/export/ExportDialog'
import { ValidationDrawer } from '../../features/validator/ValidationDrawer'

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
}

export function AppShell() {
  const showImport = useEditorStore((s) => s.leftPanel === 'import')
  const showReader = useEditorStore((s) => s.showReader)
  const showExport = useEditorStore((s) => s.showExport)
  const showValidation = useEditorStore((s) => s.showValidation)
  const showMappingEditor = useEditorStore((s) => s.showMappingEditor)
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const theme = useEditorStore((s) => s.theme)
  const setTheme = useEditorStore((s) => s.setTheme)

  useEffect(() => {
    const saved = localStorage.getItem('nf-theme') as ThemeMode | null
    if (saved) setTheme(saved)
    else applyTheme('dark')
  }, [setTheme])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('nf-theme', theme)
  }, [theme])

  return (
    <div className="h-screen w-screen overflow-hidden bg-ink-950 text-gray-200 flex flex-col">
      <TitleBar />
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 relative min-w-0">
          <NarrativeCanvas />
          {showValidation && <ValidationDrawer />}
          {/* 右侧浮动属性面板（类似 Coze 工作流）：选中节点时弹出 */}
          {selectedNodeId && (
            <div className="absolute right-3 top-3 bottom-3 w-80 z-30 flex flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700 bg-ink-800 shrink-0">
                <Settings2 size={13} className="text-brand" />
                <span className="text-xs font-semibold text-gray-200">节点属性</span>
                <button
                  className="ml-auto text-gray-500 hover:text-white transition-colors"
                  onClick={() => selectNode(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-auto min-h-0">
                <NodeInspector />
              </div>
            </div>
          )}
        </main>
      </div>

      {showImport && (
        <ImportWizard onClose={() => useEditorStore.getState().setLeftPanel('none')} />
      )}
      {showMappingEditor && (
        <MappingEditorDialog onClose={() => useEditorStore.getState().setShowMappingEditor(false)} />
      )}
      {showReader && <ReaderMode />}
      {showExport && <ExportDialog />}
    </div>
  )
}
