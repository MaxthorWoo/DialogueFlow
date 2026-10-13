import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import type { NarrativeIR, IRNode, IREdge } from '../core/ir/types'
import type { MappingProfile } from '../core/mapping/types'
import { createEmptyIR } from '../core/ir/factory'
import type { ProjectFile } from '../core/exporter/project'

// 项目状态：IR + Profile + 布局坐标（含撤销/重做，zundo limit 100）

interface ProjectState {
  ir: NarrativeIR
  profiles: MappingProfile[]
  activeProfileId: string | null
  projectFilePath: string | null
  isDirty: boolean

  setIR: (ir: NarrativeIR) => void
  updateNodeField: (nodeId: string, key: string, value: unknown) => void
  addNode: (node: IRNode) => void
  removeNode: (nodeId: string) => void
  addEdge: (edge: IREdge) => void
  removeEdge: (edgeId: string) => void
  updateNodePosition: (nodeId: string, pos: { x: number; y: number }) => void
  setStartNode: (nodeId: string) => void
  setProfiles: (profiles: MappingProfile[], activeProfileId: string | null) => void
  setActiveProfile: (id: string) => void
  loadProject: (project: ProjectFile, filePath: string | null) => void
  newProject: (profile: MappingProfile) => void
  markSaved: (filePath: string) => void
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    immer((set) => ({
      ir: createEmptyIR(),
      profiles: [],
      activeProfileId: null,
      projectFilePath: null,
      isDirty: false,

      setIR: (ir) =>
        set((s) => {
          s.ir = ir
          s.isDirty = true
        }),

      updateNodeField: (nodeId, key, value) =>
        set((s) => {
          const node = s.ir.nodes.find((n) => n.id === nodeId)
          if (node) {
            node.fields[key] = value
            s.isDirty = true
          }
        }),

      addNode: (node) =>
        set((s) => {
          s.ir.nodes.push(node)
          s.isDirty = true
        }),

      removeNode: (nodeId) =>
        set((s) => {
          s.ir.nodes = s.ir.nodes.filter((n) => n.id !== nodeId)
          s.ir.edges = s.ir.edges.filter((e) => e.from !== nodeId && e.to !== nodeId)
          if (s.ir.startNodeId === nodeId) s.ir.startNodeId = ''
          s.isDirty = true
        }),

      addEdge: (edge) =>
        set((s) => {
          s.ir.edges.push(edge)
          s.isDirty = true
        }),

      removeEdge: (edgeId) =>
        set((s) => {
          s.ir.edges = s.ir.edges.filter((e) => e.id !== edgeId)
          s.isDirty = true
        }),

      updateNodePosition: (nodeId, pos) =>
        set((s) => {
          const node = s.ir.nodes.find((n) => n.id === nodeId)
          if (node) {
            node.position = pos
            s.isDirty = true
          }
        }),

      setStartNode: (nodeId) =>
        set((s) => {
          s.ir.startNodeId = nodeId
          s.isDirty = true
        }),

      setProfiles: (profiles, activeProfileId) =>
        set((s) => {
          s.profiles = profiles
          s.activeProfileId = activeProfileId
          s.isDirty = true
        }),

      setActiveProfile: (id) =>
        set((s) => {
          s.activeProfileId = id
          s.isDirty = true
        }),

      loadProject: (project, filePath) =>
        set((s) => {
          s.ir = project.ir
          s.profiles = project.profiles ?? []
          s.activeProfileId = project.activeProfileId ?? null
          s.projectFilePath = filePath
          s.isDirty = false
        }),

      newProject: (profile) =>
        set((s) => {
          s.ir = createEmptyIR(profile.name)
          s.ir.nodeTypes = profile.nodeTypes
          if (profile.variables) s.ir.variables = profile.variables
          s.profiles = [profile]
          s.activeProfileId = profile.id
          s.projectFilePath = null
          s.isDirty = true
        }),

      markSaved: (filePath) =>
        set((s) => {
          s.projectFilePath = filePath
          s.isDirty = false
        }),
    })),
    { limit: 100 },
  ),
)
