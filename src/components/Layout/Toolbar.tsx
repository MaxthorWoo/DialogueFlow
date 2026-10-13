import { useEffect } from 'react'
import {
  FilePlus2, FolderOpen, Save, FileJson, FileSpreadsheet,
  Undo2, Redo2, BookOpen, ShieldCheck, Sun, Moon, Play,
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { openProjectFile, saveProjectFile } from '../../lib/tauri'
import { serializeProject, parseProject } from '../../core/exporter/project'
import { validateIR } from '../../core/validator/engine'

// 顶部工具栏：项目操作 / 撤销重做 / 校验 / 阅读模式 / 导出 / 主题

const btn =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-ink-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export function Toolbar() {
  const ir = useProjectStore((s) => s.ir)
  const isDirty = useProjectStore((s) => s.isDirty)
  const projectFilePath = useProjectStore((s) => s.projectFilePath)
  const setIR = useProjectStore((s) => s.setIR)
  const loadProject = useProjectStore((s) => s.loadProject)
  const newProject = useProjectStore((s) => s.newProject)
  const markSaved = useProjectStore((s) => s.markSaved)
  const editor = useEditorStore()

  // 撤销/重做
  const undo = () => (useProjectStore as unknown as { temporal: { getState: () => { undo: () => void } } }).temporal.getState().undo()
  const redo = () => (useProjectStore as unknown as { temporal: { getState: () => { redo: () => void } } }).temporal.getState().redo()

  const handleNew = () => {
    newProject({
      id: 'vn-standard', name: '未命名项目', version: 1, sheets: [],
      nodeTypes: ir.nodeTypes.length ? ir.nodeTypes : [],
    })
    // 新项目至少带视觉小说节点类型
    import('../../core/mapping/presets').then(({ visualNovelProfile }) => {
      const cur = useProjectStore.getState()
      cur.setIR({ ...cur.ir, nodeTypes: visualNovelProfile.nodeTypes })
    })
  }

  const handleOpen = async () => {
    const result = await openProjectFile()
    if (!result.ok) {
      if (!result.canceled) console.error('打开失败:', result.error)
      return
    }
    try {
      const project = parseProject(result.content)
      loadProject(project, result.path)
    } catch (e) {
      console.error('项目文件解析失败:', e)
    }
  }

  const handleSave = async () => {
    const project = serializeProject(ir, useProjectStore.getState().profiles, useProjectStore.getState().activeProfileId)
    const defaultName = projectFilePath ?? `${ir.meta.title || 'project'}.nfproj`
    const result = await saveProjectFile(defaultName, project)
    if (result.ok) markSaved(result.path ?? defaultName)
    else if (result.error !== 'canceled') console.error('保存失败:', result.error)
  }

  // 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave() }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo() }
      else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() }
      else if (e.key === 'Delete') {
        const sel = useEditorStore.getState().selectedNodeId
        if (sel) {
          useProjectStore.getState().removeNode(sel)
          useEditorStore.getState().selectNode(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ir, projectFilePath])

  const errorCount = validateIR(ir).filter((i) => i.severity === 'error').length

  return (
    <header className="h-12 fixed top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 bg-ink-900 border-b border-ink-700">
      <div className="flex items-center gap-2 pr-3 mr-1 border-r border-ink-700">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand to-[#2B6CB0] flex items-center justify-center">
          <Play size={11} className="text-white" fill="currentColor" />
        </div>
        <span className="text-sm font-semibold text-gray-100">NarrativeFlow</span>
        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-nodeChoice" title="未保存" />}
      </div>

      <button className={btn} onClick={handleNew}><FilePlus2 size={14} /> 新建</button>
      <button className={btn} onClick={handleOpen}><FolderOpen size={14} /> 打开</button>
      <button className={btn} onClick={handleSave}><Save size={14} /> 保存</button>
      <button className={btn} onClick={() => editor.setShowExport(true)}><FileJson size={14} /> 导出</button>
      <button className={btn} onClick={() => editor.setLeftPanel('import')}>
        <FileSpreadsheet size={14} /> 导入 Excel
      </button>

      <div className="w-px h-5 bg-ink-700 mx-1" />
      <button className={btn} onClick={undo} title="Ctrl+Z"><Undo2 size={14} /></button>
      <button className={btn} onClick={redo} title="Ctrl+Shift+Z"><Redo2 size={14} /></button>

      <div className="w-px h-5 bg-ink-700 mx-1" />
      <button
        className={`${btn} ${editor.leftPanel === 'validate' ? 'bg-ink-700 text-white' : ''}`}
        onClick={() => editor.setLeftPanel('validate')}
      >
        <ShieldCheck size={14} /> 校验
        {errorCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">
            {errorCount}
          </span>
        )}
      </button>
      <button className={btn} onClick={() => editor.setShowReader(true)}>
        <BookOpen size={14} /> 阅读模式
      </button>

      <div className="ml-auto flex items-center">
        <button
          className={btn}
          title="切换主题"
          onClick={() => editor.toggleTheme()}
        >
          {editor.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </header>
  )
}
