// Tauri API 封装：桌面端走 invoke/dialog，浏览器端兜底（便于纯 Vite 调试）

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export interface FileResult {
  path: string
  content: string
}

export type SaveResult = { ok: true; path?: string } | { ok: false; error: string }

async function dynamicInvoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

export async function openProjectFile(): Promise<(FileResult & { ok: true }) | { ok: false; error: string; canceled?: boolean }> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({
      filters: [{ name: 'NarrativeFlow 项目', extensions: ['nfproj', 'json'] }],
    })
    if (!path || typeof path !== 'string') return { ok: false, error: 'canceled', canceled: true }
    const result = await dynamicInvoke<FileResult>('read_project_file', { path })
    return { ok: true, ...result }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.nfproj,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve({ ok: false, error: 'canceled', canceled: true })
      const content = await file.text()
      resolve({ ok: true, path: file.name, content })
    }
    input.click()
  })
}

/** 保存项目文件 */
export async function saveProjectFile(defaultName: string, content: string): Promise<SaveResult> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'NarrativeFlow 项目', extensions: ['nfproj'] }],
    })
    if (!path || typeof path !== 'string') return { ok: false, error: 'canceled' }
    await dynamicInvoke('write_project_file', { path, content })
    return { ok: true, path }
  }
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}

/** 导出运行时 JSON */
export async function exportRuntimeJSON(json: string, defaultName: string): Promise<SaveResult> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!path || typeof path !== 'string') return { ok: false, error: 'canceled' }
    await dynamicInvoke('export_runtime_json', { path, json })
    return { ok: true, path }
  }
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
