// NarrativeIR JSON Schema（draft-07，配合 AJV 校验项目文件）
// 条件/效果 AST 做浅层校验（存在 op），深度校验由 validator 负责
export const irSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['version', 'meta', 'startNodeId', 'variables', 'nodeTypes', 'nodes', 'edges'],
  properties: {
    version: { type: 'number' },
    meta: {
      type: 'object',
      required: ['title', 'createdAt', 'updatedAt'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    startNodeId: { type: 'string' },
    variables: { type: 'array', items: { $ref: '#/definitions/variable' } },
    nodeTypes: { type: 'array', items: { $ref: '#/definitions/nodeType' } },
    nodes: { type: 'array', items: { $ref: '#/definitions/node' } },
    edges: { type: 'array', items: { $ref: '#/definitions/edge' } },
  },
  definitions: {
    variable: {
      type: 'object',
      required: ['name', 'type', 'defaultValue'],
      properties: {
        name: { type: 'string' },
        type: { enum: ['int', 'float', 'bool', 'string'] },
        defaultValue: {},
        description: { type: 'string' },
      },
    },
    nodeType: {
      type: 'object',
      required: ['type', 'label', 'fields', 'ports'],
      properties: {
        type: { type: 'string' },
        label: { type: 'string' },
        fields: { type: 'array', items: { $ref: '#/definitions/fieldDef' } },
        ports: { type: 'array', items: { $ref: '#/definitions/portDef' } },
        color: { type: 'string' },
        icon: { type: 'string' },
      },
    },
    fieldDef: {
      type: 'object',
      required: ['key', 'type'],
      properties: {
        key: { type: 'string' },
        type: {
          enum: ['string', 'int', 'float', 'bool', 'enum', 'ref', 'condition', 'effect', 'json', 'asset'],
        },
        label: { type: 'string' },
        required: { type: 'boolean' },
        enumValues: { type: 'array', items: { type: 'string' } },
      },
    },
    portDef: {
      type: 'object',
      required: ['id', 'label'],
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        multiple: { type: 'boolean' },
        edgeType: { type: 'string' },
      },
    },
    node: {
      type: 'object',
      required: ['id', 'type', 'fields'],
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        fields: { type: 'object' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        meta: { type: 'object' },
      },
    },
    edge: {
      type: 'object',
      required: ['id', 'from', 'fromPort', 'to', 'type'],
      properties: {
        id: { type: 'string' },
        from: { type: 'string' },
        fromPort: { type: 'string' },
        to: { type: 'string' },
        type: { type: 'string' },
        label: { type: 'string' },
        order: { type: 'number' },
        condition: { $ref: '#/definitions/condition' },
        effects: { type: 'array', items: { $ref: '#/definitions/effect' } },
        meta: { type: 'object' },
      },
    },
    condition: {
      type: 'object',
      required: ['op'],
      properties: { op: { type: 'string' } },
    },
    effect: {
      type: 'object',
      required: ['op'],
      properties: { op: { type: 'string' } },
    },
  },
}
