import type { MappingProfile } from '../types'

export const visualNovelProfile: MappingProfile = {
  id: 'vn-standard',
  name: '视觉小说标准',
  description: '标准视觉小说对话结构：对话/选择/条件分支/执行效果/跳转/结束',
  version: 1,
  defaultStartNodeType: 'say',
  sheets: [
    {
      sheetName: '对话',
      entityType: 'node',
      columns: [
        { columnName: 'ID', role: 'id' },
        {
          columnName: '类型',
          role: 'nodeType',
          valueMap: { 对话: 'say', 选择: 'choice', 分支: 'branch', 效果: 'action', 跳转: 'jump', 结束: 'end' },
        },
        { columnName: '角色', role: 'field', fieldKey: 'speaker', fieldType: 'string' },
        { columnName: '文本', role: 'field', fieldKey: 'text', fieldType: 'string' },
        { columnName: '情绪', role: 'field', fieldKey: 'emotion', fieldType: 'enum' },
        { columnName: '下一句', role: 'edge', edgeConfig: { portId: 'out', edgeType: 'next', targetIsNodeId: true } },
        { columnName: '条件', role: 'condition', parseFormat: 'expression' },
      ],
    },
  ],
  nodeTypes: [
    {
      type: 'say',
      label: '对话',
      fields: [
        { key: 'speaker', type: 'string', label: '说话人', required: true },
        { key: 'text', type: 'string', label: '文本', required: true },
        {
          key: 'emotion',
          type: 'enum',
          label: '情绪',
          enumValues: ['neutral', 'happy', 'sad', 'angry', 'surprised'],
        },
      ],
      ports: [{ id: 'out', label: '下一步', edgeType: 'next' }],
      color: '#4A90D9',
    },
    {
      type: 'choice',
      label: '选择',
      fields: [{ key: 'text', type: 'string', label: '提示文本' }],
      ports: [{ id: 'choice', label: '选项', edgeType: 'choice', multiple: true }],
      color: '#E8A838',
    },
    {
      type: 'branch',
      label: '条件分支',
      fields: [{ key: 'condition', type: 'condition', label: '条件', required: true }],
      ports: [
        { id: 'true', label: '真', edgeType: 'true' },
        { id: 'false', label: '假', edgeType: 'false' },
      ],
      color: '#9B59B6',
    },
    {
      type: 'action',
      label: '执行效果',
      fields: [{ key: 'effects', type: 'effect', label: '效果' }],
      ports: [{ id: 'out', label: '下一步', edgeType: 'next' }],
      color: '#27AE60',
    },
    {
      type: 'jump',
      label: '跳转',
      fields: [{ key: 'target', type: 'ref', label: '目标节点', required: true }],
      ports: [],
      color: '#7F8C8D',
    },
    {
      type: 'end',
      label: '结束',
      fields: [],
      ports: [],
      color: '#E74C3C',
    },
  ],
}
