import type { NarrativeIR } from '../ir/types'
import type { MappingProfile } from '../mapping/types'
import Ajv from 'ajv'
import { irSchema } from '../ir/schema'

// .nfproj 项目文件序列化

export interface ProjectFile {
  format: 'narrative-flow-project'
  version: 1
  ir: NarrativeIR
  profiles: MappingProfile[]
  activeProfileId: string | null
  uiState?: {
    viewport?: { x: number; y: number; zoom: number }
    selectedNodeId?: string
  }
}

export function serializeProject(
  ir: NarrativeIR,
  profiles: MappingProfile[],
  activeProfileId: string | null,
  uiState?: ProjectFile['uiState'],
): string {
  const project: ProjectFile = {
    format: 'narrative-flow-project',
    version: 1,
    ir,
    profiles,
    activeProfileId,
    uiState,
  }
  return JSON.stringify(project, null, 2)
}

const ajv = new Ajv({ allErrors: true })
const validateIRSchema = ajv.compile(irSchema)

export function parseProject(content: string): ProjectFile {
  const raw = JSON.parse(content) as ProjectFile
  if (raw.format !== 'narrative-flow-project') {
    throw new Error('不是有效的 NarrativeFlow 项目文件（format 不匹配）')
  }
  const valid = validateIRSchema(raw.ir)
  if (!valid) {
    const msg = ajv.errorsText(validateIRSchema.errors)
    throw new Error(`项目文件 IR 结构校验失败: ${msg}`)
  }
  return raw
}
