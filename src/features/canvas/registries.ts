import type { FlowNodeRegistry } from '@flowgram.ai/free-layout-editor'
import type { NodeTypeDefinition } from '../../core/ir/types'

// 由 NodeTypeDefinition 构建 FlowGram 节点注册表

export function buildNodeRegistries(nodeTypes: NodeTypeDefinition[]): FlowNodeRegistry[] {
  return nodeTypes.map((t) => ({
    type: t.type,
    meta: {
      defaultPorts: [
        { type: 'input' },
        ...t.ports.map((p) => ({ id: p.id, type: 'output', location: 'right' as const })),
      ],
      defaultExpanded: true,
      size: { width: 220, height: 84 },
    },
  }))
}

/** 未知类型的兜底注册 */
export function getDefaultRegistry(type: string): FlowNodeRegistry {
  return {
    type,
    meta: {
      defaultPorts: [{ type: 'input' }, { type: 'output' }],
      defaultExpanded: true,
      size: { width: 220, height: 84 },
    },
  }
}
