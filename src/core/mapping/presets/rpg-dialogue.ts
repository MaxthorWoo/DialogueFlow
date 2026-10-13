import type { MappingProfile } from '../types'

export const rpgDialogueProfile: MappingProfile = {
  id: 'rpg-dialogue',
  name: 'RPG 任务对话',
  description: 'RPG 对话结构：含任务/战斗节点与变量系统',
  version: 1,
  defaultStartNodeType: 'say',
  variables: [
    { name: 'gold', type: 'int', defaultValue: 0, description: '金币' },
    { name: 'affection', type: 'int', defaultValue: 0, description: '好感度' },
    { name: 'hasKey', type: 'bool', defaultValue: false, description: '是否持有钥匙' },
    { name: 'questMain', type: 'string', defaultValue: '', description: '主线任务状态' },
  ],
  sheets: [
    {
      sheetName: '对话',
      entityType: 'node',
      columns: [
        { columnName: 'ID', role: 'id' },
        {
          columnName: '类型',
          role: 'nodeType',
          valueMap: {
            对话: 'say', 选择: 'choice', 分支: 'branch',
            效果: 'action', 跳转: 'jump', 结束: 'end', 任务: 'quest', 战斗: 'battle',
          },
        },
        { columnName: '角色', role: 'field', fieldKey: 'speaker', fieldType: 'string' },
        { columnName: '文本', role: 'field', fieldKey: 'text', fieldType: 'string' },
        { columnName: '任务ID', role: 'field', fieldKey: 'questId', fieldType: 'string' },
        { columnName: '任务状态', role: 'field', fieldKey: 'questState', fieldType: 'enum' },
        { columnName: '敌人', role: 'field', fieldKey: 'enemy', fieldType: 'string' },
        { columnName: '下一句', role: 'edge', edgeConfig: { portId: 'out', edgeType: 'next', targetIsNodeId: true } },
        { columnName: '条件', role: 'condition', parseFormat: 'expression' },
        { columnName: '效果', role: 'effect', parseFormat: 'expression' },
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
      type: 'quest',
      label: '任务',
      fields: [
        { key: 'questId', type: 'string', label: '任务 ID', required: true },
        { key: 'questState', type: 'enum', label: '任务状态', enumValues: ['start', 'active', 'complete', 'fail'] },
      ],
      ports: [{ id: 'out', label: '下一步', edgeType: 'next' }],
      color: '#C0392B',
    },
    {
      type: 'battle',
      label: '战斗',
      fields: [
        { key: 'enemy', type: 'string', label: '敌人', required: true },
        { key: 'level', type: 'int', label: '难度等级', defaultValue: 1 },
      ],
      ports: [
        { id: 'true', label: '胜利', edgeType: 'true' },
        { id: 'false', label: '失败', edgeType: 'false' },
      ],
      color: '#E67E22',
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
