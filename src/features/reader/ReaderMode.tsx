import { useState, useCallback } from 'react'
import { X, RotateCcw, ArrowRight } from 'lucide-react'
import type { NarrativeIR, IREdge } from '../../core/ir/types'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { evalCondition, applyEffects } from './interpreter'

// 阅读模式：模拟解释器 + 变量监视 + 历史回放

interface HistoryEntry {
  nodeId: string
  speaker?: string
  text: string
}

interface ReaderState {
  currentNodeId: string | null
  variables: Record<string, unknown>
  history: HistoryEntry[]
  status: 'playing' | 'ended' | 'error'
  error?: string
}

function initVars(ir: NarrativeIR): Record<string, unknown> {
  const vars: Record<string, unknown> = {}
  for (const v of ir.variables) vars[v.name] = v.defaultValue
  return vars
}

function initialReaderState(ir: NarrativeIR): ReaderState {
  return {
    currentNodeId: ir.startNodeId || null,
    variables: initVars(ir),
    history: [],
    status: ir.startNodeId ? 'playing' : 'error',
    error: ir.startNodeId ? undefined : '未设置起始节点',
  }
}

export function ReaderMode() {
  const ir = useProjectStore((s) => s.ir)
  const setShowReader = useEditorStore((s) => s.setShowReader)
  const selectNode = useEditorStore((s) => s.selectNode)
  const [state, setState] = useState<ReaderState>(() => initialReaderState(ir))

  const restart = useCallback(() => setState(initialReaderState(ir)), [ir])

  const node = state.currentNodeId ? ir.nodes.find((n) => n.id === state.currentNodeId) : undefined
  const nodeType = node ? ir.nodeTypes.find((t) => t.type === node.type) : undefined

  /** 执行节点效果并自动前进（action/jump/branch/battle） */
  const advance = useCallback(
    (input: ReaderState): ReaderState => {
      let s = { ...input }
      let guard = 0
      while (guard++ < 100) {
        const n = s.currentNodeId ? ir.nodes.find((x) => x.id === s.currentNodeId) : undefined
        if (!n) return { ...s, status: 'error', error: `节点 "${s.currentNodeId}" 不存在` }
        const edgesFrom = (port?: string): IREdge[] =>
          ir.edges
            .filter((e) => e.from === n.id && (port === undefined || e.fromPort === port))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const goNext = (port: string): ReaderState | null => {
          const next = edgesFrom(port)[0] ?? edgesFrom()[0]
          if (!next) return null
          applyEffects(next.effects, s.variables)
          return { ...s, currentNodeId: next.to }
        }

        if (n.type === 'end') return { ...s, status: 'ended' }
        if (n.type === 'action') {
          applyEffects(n.fields?.['effects'] as never, s.variables)
          const ns = goNext('out')
          if (!ns) return { ...s, status: 'ended' }
          s = ns
          continue
        }
        if (n.type === 'jump') {
          s = { ...s, currentNodeId: String(n.fields?.['target'] ?? '') }
          continue
        }
        if (n.type === 'branch') {
          const condTrue = evalCondition(n.fields?.['condition'] as never, s.variables)
          const ns = goNext(condTrue ? 'true' : 'false')
          if (!ns) return { ...s, status: 'ended' }
          s = ns
          continue
        }
        if (n.type === 'battle') {
          const ns = goNext('true')
          if (!ns) return { ...s, status: 'ended' }
          s = ns
          continue
        }
        return s // say / choice：等待用户交互
      }
      return { ...s, status: 'error', error: '检测到无限循环（超过 100 步自动停止）' }
    },
    [ir],
  )

  const handleContinue = () => {
    if (!node) return
    const history = [
      ...state.history,
      {
        nodeId: node.id,
        speaker: node.fields?.['speaker'] as string | undefined,
        text: String(node.fields?.['text'] ?? ''),
      },
    ]
    const outEdges = ir.edges
      .filter((e) => e.from === node.id && e.fromPort === (nodeType?.ports[0]?.id ?? 'out'))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (outEdges.length === 0) {
      setState({ ...state, history, status: 'ended' })
      return
    }
    const next = outEdges[0]
    applyEffects(next.effects, state.variables)
    setState(advance({ ...state, history, currentNodeId: next.to }))
  }

  const handleChoice = (edge: IREdge) => {
    if (!node) return
    const history = [
      ...state.history,
      {
        nodeId: node.id,
        text: String(node.fields?.['text'] ?? '选择'),
        speaker: edge.label ? `→ ${edge.label}` : undefined,
      },
    ]
    applyEffects(edge.effects, state.variables)
    setState(advance({ ...state, history, currentNodeId: edge.to }))
  }

  const choiceEdges =
    node?.type === 'choice'
      ? ir.edges
          .filter((e) => e.from === node.id && e.fromPort === 'choice')
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .filter((e) => evalCondition(e.condition, state.variables))
      : []

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/95 backdrop-blur-sm flex animate-fade-in">
      {/* 左侧：剧情显示区 */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-200">阅读模式 · {ir.meta.title}</h2>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-ink-800 border border-ink-700 text-xs text-gray-300 hover:text-white flex items-center gap-1.5"
              onClick={restart}
            >
              <RotateCcw size={13} /> 重新开始
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-ink-800 border border-ink-700 text-xs text-gray-300 hover:text-white flex items-center gap-1.5"
              onClick={() => setShowReader(false)}
            >
              <X size={13} /> 退出
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-3 pr-2">
          {state.history.map((h, i) => (
            <div key={i} className="text-sm">
              {h.speaker && <div className="text-xs text-brand mb-0.5">{h.speaker}</div>}
              <div className="text-gray-400 leading-relaxed">{h.text}</div>
            </div>
          ))}
          {state.status === 'error' && (
            <div className="text-sm text-red-400 px-3 py-2 rounded-lg bg-red-500/10">{state.error}</div>
          )}
          {state.status === 'ended' && (
            <div className="text-sm text-nodeChoice px-3 py-2 rounded-lg bg-nodeChoice/10">
              —— 剧情 end ——
            </div>
          )}
        </div>

        {node && state.status === 'playing' && (
          <div className="mt-6 rounded-xl border border-ink-600 bg-ink-900/80 p-5 shadow-2xl">
            {typeof node.fields?.['speaker'] === 'string' && (
              <div className="inline-block px-3 py-0.5 -mt-9 mb-2 rounded-md bg-brand text-white text-sm font-medium shadow">
                {String(node.fields['speaker'])}
              </div>
            )}
            <p className="text-base text-gray-100 leading-relaxed whitespace-pre-wrap min-h-12">
              {String(node.fields?.['text'] ?? nodeType?.label ?? node.id)}
            </p>
            {node.type === 'choice' ? (
              <div className="mt-4 space-y-2">
                {choiceEdges.length === 0 && (
                  <div className="text-xs text-red-400">没有满足条件的选择（检查选项边的条件）</div>
                )}
                {choiceEdges.map((e) => (
                  <button
                    key={e.id}
                    className="w-full text-left px-4 py-2.5 rounded-lg border border-ink-600 bg-ink-800 hover:border-brand hover:bg-brand/10 text-gray-200 text-sm transition-colors"
                    onClick={() => handleChoice(e)}
                  >
                    {e.label || '（未命名选项）'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <button
                  className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-bright text-white text-sm flex items-center gap-1.5 transition-colors"
                  onClick={handleContinue}
                >
                  继续 <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧：变量监视 + 历史 */}
      <div className="w-72 border-l border-ink-700 bg-ink-900/60 p-4 overflow-auto">
        <h3 className="text-xs font-semibold text-gray-400 mb-2">变量监视</h3>
        <div className="space-y-1 mb-6">
          {ir.variables.length === 0 && <div className="text-xs text-gray-600">（无变量）</div>}
          {ir.variables.map((v) => (
            <div key={v.name} className="flex justify-between text-xs px-2 py-1 rounded bg-ink-800">
              <span className="text-gray-400">{v.name}</span>
              <span className="text-nodeChoice font-mono">
                {JSON.stringify(state.variables[v.name] ?? v.defaultValue)}
              </span>
            </div>
          ))}
        </div>
        <h3 className="text-xs font-semibold text-gray-400 mb-2">当前节点</h3>
        <button
          className="w-full text-left text-xs px-2 py-1 rounded bg-ink-800 text-brand hover:bg-ink-700 mb-6"
          onClick={() => {
            if (state.currentNodeId) {
              selectNode(state.currentNodeId)
              setShowReader(false)
            }
          }}
        >
          {state.currentNodeId ?? '—'}
        </button>
        <h3 className="text-xs font-semibold text-gray-400 mb-2">历史节点</h3>
        <div className="space-y-1">
          {state.history.map((h, i) => (
            <button
              key={i}
              className="w-full text-left text-xs px-2 py-1 rounded bg-ink-800/60 text-gray-500 hover:text-gray-300 truncate"
              onClick={() => {
                selectNode(h.nodeId)
                setShowReader(false)
              }}
            >
              {h.nodeId} · {h.text.slice(0, 14)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
