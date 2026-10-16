import * as XLSX from 'xlsx'
import type { FieldType } from '../ir/types'

// Excel 导入器：读取工作簿 → 结构探查 → 类型推断 → 防御性清洗

export interface SheetInspection {
  sheetName: string
  headers: string[]
  rowCount: number
  sampleRows: Record<string, unknown>[] // 前 20 行样本
  inferredTypes: Record<string, FieldType> // 列名 → 推断类型
  hasMergedHeaders: boolean
  headerRowIndex: number
}

export interface WorkbookInspection {
  sheets: SheetInspection[]
  fileName: string
}

/** 防御性清洗单元格值：BOM、trim、空串转 null */
export function cleanCell(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const s = value.replace(/\uFEFF/g, '').trim()
    if (s === '' || s === '-') return null
    return s
  }
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((v) => cleanCell(v) === null)
}

/** 猜测表头行：前 10 行中"非空单元格最多且以字符串为主"的行 */
export function guessHeaderRow(rows: unknown[][]): number {
  let best = 0
  let bestScore = -1
  const limit = Math.min(rows.length, 10)
  for (let r = 0; r < limit; r++) {
    const row = rows[r]
    if (isBlankRow(row)) continue
    let nonEmpty = 0
    let stringCount = 0
    for (const cell of row) {
      const v = cleanCell(cell)
      if (v !== null) {
        nonEmpty++
        if (typeof v === 'string') stringCount++
      }
    }
    if (nonEmpty === 0) continue
    const stringRatio = stringCount / nonEmpty
    const score = nonEmpty * 2 + stringRatio * 10 - r * 0.1
    if (stringRatio >= 0.6 && score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return best
}

/** Excel 列号（0-based）转字母（0→A, 26→AA） */
export function colLetter(index: number): string {
  let s = ''
  let n = index
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

/** 列类型推断 */
export function inferColumnType(values: unknown[]): FieldType {
  const cleaned = values.map(cleanCell).filter((v) => v !== null) as unknown[]
  if (cleaned.length === 0) return 'string'
  const allNumbers = cleaned.every((v) => typeof v === 'number')
  if (allNumbers) {
    const allInts = (cleaned as number[]).every((n) => Number.isInteger(n))
    return allInts ? 'int' : 'float'
  }
  const allBool = cleaned.every((v) => typeof v === 'boolean' || v === 'true' || v === 'false')
  if (allBool) return 'bool'
  const allString = cleaned.every((v) => typeof v === 'string')
  if (allString) {
    const unique = new Set(cleaned as string[])
    if (unique.size < Math.max(3, cleaned.length / 4) && cleaned.length >= 8) return 'enum'
    // 节点 id 引用格式（n1, node_001 等）
    const idLike = (cleaned as string[]).every((s) => /^[A-Za-z][\w-]{0,20}\d+$/.test(s))
    if (idLike) return 'ref'
  }
  return 'string'
}

/** 读取工作簿为二维数组（跳过空行） */
function readMatrix(data: ArrayBuffer, sheetName: string): unknown[][] {
  const ws = getSheet(data, sheetName)
  if (!ws) return []
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  })
}

function readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
  const bytes = new Uint8Array(data)
  if (bytes.length >= 4) {
    const sig =
      (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    // PK\x03\x04 → xlsx（zip）；\xD0\xCF\x11\xE0 → xls（OLE2）
    if (sig === 0x504b0304 || sig === 0xd0cf11e0) {
      return XLSX.read(data, { type: 'array', cellDates: true })
    }
  }
  // 其余按文本处理（CSV / TSV），先 UTF-8 严格解码，失败再尝试 GBK（中文 Excel 导出常见）
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data)
    return XLSX.read(text, { type: 'string', cellDates: true, raw: false })
  } catch {
    const text = new TextDecoder('gbk').decode(data)
    return XLSX.read(text, { type: 'string', cellDates: true, raw: false })
  }
}

function getSheet(data: ArrayBuffer, sheetName: string): XLSX.WorkSheet | undefined {
  const wb = readWorkbook(data)
  return wb.Sheets[sheetName]
}

/** 探查工作簿结构 */
export function inspectWorkbook(data: ArrayBuffer, fileName = ''): WorkbookInspection {
  const wb = readWorkbook(data)
  const sheets: SheetInspection[] = []

  for (const sheetName of wb.SheetNames) {
    const matrix = readMatrix(data, sheetName)
    if (matrix.length === 0) {
      sheets.push({
        sheetName, headers: [], rowCount: 0, sampleRows: [],
        inferredTypes: {}, hasMergedHeaders: false, headerRowIndex: 0,
      })
      continue
    }
    const headerRowIndex = guessHeaderRow(matrix)
    const rawHeaders = matrix[headerRowIndex] ?? []
    const headers: string[] = rawHeaders.map((h, i) => {
      const v = cleanCell(h)
      return v === null ? `列${colLetter(i)}` : String(v)
    })

    // 合并表头检测与扁平化展开（如 "角色/姓名"）
    let hasMergedHeaders = false
    const ws = getSheet(data, sheetName)
    const merges = ws?.['!merges'] ?? []
    for (const merge of merges) {
      if (merge.s.r < headerRowIndex && merge.e.r >= headerRowIndex && merge.e.c > merge.s.c) {
        hasMergedHeaders = true
        const base = headers[merge.s.c] ?? ''
        for (let c = merge.s.c + 1; c <= merge.e.c && c < headers.length; c++) {
          headers[c] = `${base}/${headers[c]}`
        }
      }
    }

    const dataRows = matrix.slice(headerRowIndex + 1)
    const rowObjects = dataRows.map((row) => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        obj[h] = cleanCell(row[i])
      })
      return obj
    })
    const filledRows = rowObjects.filter((obj) =>
      Object.values(obj).some((v) => v !== null),
    )

    const inferredTypes: Record<string, FieldType> = {}
    headers.forEach((h, i) => {
      inferredTypes[h] = inferColumnType(dataRows.slice(0, 100).map((row) => row[i]))
    })

    sheets.push({
      sheetName,
      headers,
      rowCount: filledRows.length,
      sampleRows: filledRows.slice(0, 20),
      inferredTypes,
      hasMergedHeaders,
      headerRowIndex,
    })
  }

  return { sheets, fileName }
}

/** 将指定 Sheet 转为行对象数组（可指定表头行） */
export function extractRows(
  data: ArrayBuffer,
  sheetName: string,
  headerRowIndex?: number,
): Record<string, unknown>[] {
  const matrix = readMatrix(data, sheetName)
  if (matrix.length === 0) return []
  const hIdx = headerRowIndex ?? guessHeaderRow(matrix)
  const rawHeaders = matrix[hIdx] ?? []
  const headers = rawHeaders.map((h, i) => {
    const v = cleanCell(h)
    return v === null ? `列${colLetter(i)}` : String(v)
  })
  return matrix
    .slice(hIdx + 1)
    .map((row) => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        obj[h] = cleanCell(row[i])
      })
      return obj
    })
    .filter((obj) => Object.values(obj).some((v) => v !== null))
}
