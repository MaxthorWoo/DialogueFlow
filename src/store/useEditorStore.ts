import { create } from 'zustand'

// 编辑器 UI 状态（选中、面板开关、主题）

export type ThemeMode = 'dark' | 'light' | 'system'

export interface PanelState {
  leftPanel: 'none' | 'import'
  showReader: boolean
  showExport: boolean
}

interface EditorState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  leftPanel: PanelState['leftPanel']
  showReader: boolean
  showExport: boolean
  showValidation: boolean
  showMappingEditor: boolean
  theme: ThemeMode

  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setLeftPanel: (panel: PanelState['leftPanel']) => void
  setShowReader: (show: boolean) => void
  setShowExport: (show: boolean) => void
  setShowValidation: (show: boolean) => void
  setShowMappingEditor: (show: boolean) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  leftPanel: 'none',
  showReader: false,
  showExport: false,
  showValidation: false,
  showMappingEditor: false,
  theme: 'dark',

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setLeftPanel: (panel) => set((s) => ({ leftPanel: s.leftPanel === panel ? 'none' : panel })),
  setShowReader: (show) => set({ showReader: show }),
  setShowExport: (show) => set({ showExport: show }),
  setShowValidation: (show) => set({ showValidation: show }),
  setShowMappingEditor: (show) => set({ showMappingEditor: show }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}))
