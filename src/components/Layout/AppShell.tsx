import { useEffect } from 'react'
import { useEditorStore, type ThemeMode } from '../../store/useEditorStore'
import { Toolbar } from './Toolbar'
import { SidePanel } from './SidePanel'
import { NarrativeCanvas } from '../../features/canvas/NarrativeCanvas'
import { ImportWizard } from '../../features/import/ImportWizard'
import { ReaderMode } from '../../features/reader/ReaderMode'
import { ExportDialog } from '../../features/export/ExportDialog'

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
      <Toolbar />
      <div className="flex flex-1 pt-12 min-h-0">
        <SidePanel />
        <main className="flex-1 relative min-w-0">
          <NarrativeCanvas />
        </main>
      </div>

      {showImport && (
        <ImportWizard onClose={() => useEditorStore.getState().setLeftPanel('none')} />
      )}
      {showReader && <ReaderMode />}
      {showExport && <ExportDialog />}
    </div>
  )
}
