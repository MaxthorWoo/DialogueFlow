import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EditorRenderer,
  EditorState,
  EditorStateConfigEntity,
  FreeLayoutEditorProvider,
  useClientContext,
  usePlaygroundTools,
  type FreeLayoutPluginContext,
  type FlowDocumentJSON,
} from '@flowgram.ai/free-layout-editor'
import { createFreeAutoLayoutPlugin } from '@flowgram.ai/free-auto-layout-plugin'
import { createFreeSnapPlugin } from '@flowgram.ai/free-snap-plugin'
import '@flowgram.ai/free-layout-editor/index.css'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { irToFlowGram, flowGramToIR } from './adapters'
import { buildNodeRegistries, getDefaultRegistry } from './registries'
import { NarrativeNode } from './NarrativeNode'
import { CanvasToolbar } from './CanvasToolbar'

// FlowGram 自由布局画布：双向同步 Zustand 中的 IR

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

export function NarrativeCanvas() {
  const ir = useProjectStore((s) => s.ir)
  const setIR = useProjectStore((s) => s.setIR)
  const setIRRef = useRef(setIR)
  setIRRef.current = setIR
  const lastPushedRef = useRef<unknown>(null)

  // 节点类型定义变化时重建注册表
  const nodeTypesKey = useMemo(
    () => JSON.stringify(ir.nodeTypes.map((t) => [t.type, t.ports.map((p) => p.id)])),
    [ir.nodeTypes],
  )
  const nodeRegistries = useMemo(
    () => buildNodeRegistries(ir.nodeTypes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeTypesKey],
  )

  // 初始数据仅在挂载时取一次（项目切换通过 key 重新挂载）
  const initialData = useMemo(() => irToFlowGram(ir), []) // eslint-disable-line react-hooks/exhaustive-deps

  const editorProps = useMemo(
    () => ({
      background: true,
      readonly: false,
      initialData: initialData as unknown as FlowDocumentJSON,
      nodeRegistries,
      getNodeDefaultRegistry(type: string) {
        return getDefaultRegistry(type)
      },
      nodeEngine: { enable: false },
      history: { enable: true, disableShortcuts: true },
      // 画布交互：鼠标优先模式（左键拖动=平移、滚轮=缩放、Shift+左键=框选）
      playground: {
        ineractiveType: 'MOUSE',
        autoFocus: false,
        autoResize: true,
      } as never,
      materials: {
        renderDefaultNode: NarrativeNode,
      } as never,
      lineColor: {
        hidden: 'transparent',
        default: '#5A6472',
        drawing: '#4A90D9',
        hovered: '#4A90D9',
        selected: '#3B82F6',
        error: '#E74C3C',
        flowing: '#4A90D9',
      },
      onContentChange: debounce((ctx: FreeLayoutPluginContext) => {
        if (ctx.document.disposed) return
        const doc = ctx.document.toJSON() as unknown as Parameters<typeof flowGramToIR>[0]
        const currentIR = useProjectStore.getState().ir
        const newIR = flowGramToIR(doc, currentIR)
        lastPushedRef.current = newIR
        setIRRef.current(newIR)
      }, 400),
      plugins: () => [
        createFreeAutoLayoutPlugin({
          direction: 'LR' as never,
        } as never),
        createFreeSnapPlugin({
          edgeColor: '#00B2B2',
          alignColor: '#00B2B2',
          edgeLineWidth: 1,
          alignLineWidth: 1,
          alignCrossWidth: 8,
        }),
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeTypesKey],
  )

  return (
    <FreeLayoutEditorProvider {...(editorProps as unknown as Record<string, unknown>)}>
      <CanvasSync lastPushedRef={lastPushedRef} />
      <CanvasInteraction />
      <CanvasDeselect />
      <EditorRenderer />
      <CanvasToolbar />
    </FreeLayoutEditorProvider>
  )
}

/**
 * 画布交互模式：启用 FlowGram 的"鼠标优先模式"
 * 左键拖动空白处 = 平移画布；滚轮 = 缩放；Shift + 左键拖动 = 框选
 * 画布初始化会重置为默认状态，因此持续断言该模式
 */
function CanvasInteraction() {
  const ctx = useClientContext()
  useEffect(() => {
    let disposed = false
    let disposable: { dispose: () => void } | undefined

    const apply = () => {
      if (disposed) return
      try {
        const cfg = ctx.get<EditorStateConfigEntity>(EditorStateConfigEntity)
        if (cfg.getCurrentState()?.id === EditorState.STATE_SELECT.id) {
          cfg.changeState(EditorState.STATE_MOUSE_FRIENDLY_SELECT.id)
        }
      } catch {
        /* 实体尚未就绪，等待下次重试 */
      }
    }

    apply()
    const timer = window.setInterval(apply, 200)
    window.setTimeout(() => {
      if (!disposed) {
        window.clearInterval(timer)
        apply()
      }
    }, 2000)
    try {
      const cfg = ctx.get<EditorStateConfigEntity>(EditorStateConfigEntity)
      const d = cfg.onStateChange(() => window.setTimeout(apply, 0))
      disposable = d
    } catch {
      /* ignore */
    }

    return () => {
      disposed = true
      window.clearInterval(timer)
      disposable?.dispose()
    }
  }, [ctx])
  return null
}

/** 点击画布空白处取消选中（关闭浮动属性面板） */
function CanvasDeselect() {
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.gedit-playground')) return
      if (t.closest('[data-node-selected]')) return
      useEditorStore.getState().selectNode(null)
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [])
  return null
}

/** 画布 ↔ Store 同步：当 IR 被外部修改（撤销/导入/添加节点）时刷新画布 */
function CanvasSync({ lastPushedRef }: { lastPushedRef: React.MutableRefObject<unknown> }) {
  const ctx = useClientContext()
  const ir = useProjectStore((s) => s.ir)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (lastPushedRef.current === ir) return
    // 外部 IR 变化（撤销/重做/导入/添加节点）→ 重载画布数据
    try {
      ctx.document.fromJSON(irToFlowGram(ir) as never)
    } catch (e) {
      console.error('画布同步失败:', e)
    }
  }, [ir, mounted, ctx, lastPushedRef])

  return null
}
