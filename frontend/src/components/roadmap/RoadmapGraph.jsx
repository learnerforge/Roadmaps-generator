import { useCallback, useMemo, memo, useState, useEffect } from 'react'
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, Handle, Position, Panel } from 'reactflow'
import 'reactflow/dist/style.css'
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '../../lib/constants'

const TARGET_W = 3000
const TARGET_H = 4000
const PAD = 120
const GRID_COLS = 8
const GRID_SPACING_X = 320
const GRID_SPACING_Y = 130

function normalizeNodes(rawNodes, edges, category) {
  if (!rawNodes || !rawNodes.length) return []

  const xs = rawNodes.map(n => n.position_x ?? 0)
  const ys = rawNodes.map(n => n.position_y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const dataW = maxX - minX || 1
  const dataH = maxY - minY || 1

  // Detect degenerate positions (all zeros) — typically markdown-only roadmaps
  const allSameX = xs.every(x => x === xs[0])
  const allSameY = ys.every(y => y === ys[0])
  const useGrid = allSameX && allSameY && xs[0] === 0 && ys[0] === 0

  // Compute incoming/outgoing edge counts for start/end detection
  const inCount = {}
  const outCount = {}
  if (edges) {
    for (const e of edges) {
      const s = String(e.source)
      const t = String(e.target)
      outCount[s] = (outCount[s] || 0) + 1
      inCount[t] = (inCount[t] || 0) + 1
    }
  }

  const scaleX = (TARGET_W - PAD * 2) / dataW
  const scaleY = (TARGET_H - PAD * 2) / dataH
  const scale = Math.min(scaleX, scaleY)
  const usableW = dataW * scale
  const usableH = dataH * scale
  const offsetX = (TARGET_W - usableW) / 2
  const offsetY = (TARGET_H - usableH) / 2

  return rawNodes.map((n, i) => {
    const id = String(n.id)
    let pos
    if (useGrid) {
      pos = {
        x: (i % GRID_COLS) * GRID_SPACING_X + PAD,
        y: Math.floor(i / GRID_COLS) * GRID_SPACING_Y + PAD * 0.5,
      }
    } else {
      pos = {
        x: (n.position_x - minX) * scale + offsetX,
        y: (n.position_y - minY) * scale + offsetY,
      }
    }
    return {
      id,
      type: 'graphNode',
      position: pos,
      data: {
        label: n.title,
        difficulty: n.difficulty,
        roadmapCategory: category || n.category,
        selected: false,
        isRoot: !inCount[id],
        isLeaf: !outCount[id],
      },
    }
  })
}

function GraphNode({ data }) {
  const colors = CATEGORY_COLORS[data.roadmapCategory] || { border: '#5a5a72', bg: 'rgba(90,90,114,0.08)', badge: '#5a5a72' }
  const isSelected = data.selected
  const dc = DIFFICULTY_COLORS[data.difficulty]

  let accentStyle = {}
  let badgeText = null
  if (data.isRoot && !data.isLeaf) {
    accentStyle = { borderColor: 'var(--color-green)', boxShadow: '0 0 0 1px var(--color-green), 0 0 20px rgba(34,197,94,0.15)' }
    badgeText = 'START'
  } else if (data.isLeaf && !data.isRoot) {
    accentStyle = { borderColor: 'var(--color-accent)', boxShadow: '0 0 0 1px var(--color-accent), 0 0 20px rgba(99,102,241,0.15)' }
    badgeText = 'END'
  } else if (data.isRoot && data.isLeaf) {
    accentStyle = { borderColor: 'var(--color-amber)', boxShadow: '0 0 0 1px var(--color-amber), 0 0 20px rgba(245,158,11,0.15)' }
    badgeText = 'STANDALONE'
  }

  return (
    <div
      className="rounded-xl border-2 bg-surface px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      style={{
        borderColor: isSelected ? colors.border : (accentStyle.borderColor || 'var(--color-border)'),
        boxShadow: isSelected
          ? `0 0 0 2px ${colors.border}, 0 0 28px ${colors.border}44`
          : (accentStyle.boxShadow || '0 2px 8px var(--color-shadow)'),
        minWidth: 170,
        maxWidth: 230,
      }}
      role="button"
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-border !bg-bg-3" />
      <div className="flex items-center gap-2">
        <div
          className="text-sm font-semibold leading-snug text-text flex-1"
          style={{ color: isSelected ? colors.badge : undefined }}
        >
          {data.label}
        </div>
        {badgeText && (
          <span
            className="text-[8px] font-bold uppercase tracking-[0.12em] shrink-0 rounded-md px-1.5 py-0.5"
            style={{
              backgroundColor: data.isRoot && !data.isLeaf ? 'var(--color-green-dim)' : data.isLeaf && !data.isRoot ? 'var(--color-accent-glow)' : 'var(--color-amber-dim)',
              color: accentStyle.borderColor,
            }}
          >
            {badgeText}
          </span>
        )}
      </div>
      {data.difficulty && dc && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: dc.dot }} />
          <span className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: dc.text }}>
            {data.difficulty}
          </span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-border !bg-bg-3" />
    </div>
  )
}

const GraphNodeMemo = memo(GraphNode)

export default memo(function RoadmapGraph({ nodes: rawNodes, edges: rawEdges, category }) {
  const [showMinimap, setShowMinimap] = useState(true)

  const initialNodes = useMemo(
    () => normalizeNodes(rawNodes, rawEdges, category),
    [rawNodes, rawEdges, category]
  )

  const initialEdges = useMemo(() => {
    if (!rawEdges || !rawEdges.length) return []
    const nodeIds = new Set(initialNodes.map(n => n.id))
    return rawEdges
      .filter(e => nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)))
      .map(e => ({
        id: String(e.id),
        source: String(e.source),
        target: String(e.target),
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-border-2)', strokeWidth: 2.5 },
        inactive: true,
      }))
  }, [rawEdges, initialNodes])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const nodeTypes = useMemo(() => ({ graphNode: GraphNodeMemo }), [])

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const isLarge = initialNodes.length > 80

  const onNodeClick = useCallback((_, node) => {
    setNodes(nds =>
      nds.map(n => ({
        ...n,
        selected: n.id === node.id,
        data: { ...n.data, selected: n.id === node.id },
      }))
    )
    setEdges(eds =>
      eds.map(e => {
        const highlight = e.source === node.id || e.target === node.id
        return {
          ...e,
          animated: highlight,
          style: {
            stroke: highlight ? 'var(--color-accent)' : 'var(--color-border-2)',
            strokeWidth: highlight ? 4 : 2.5,
          },
        }
      })
    )
  }, [setNodes, setEdges])

  return (
    <div className="relative h-full w-full" style={{ minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeKeyDown={(event, node) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onNodeClick(event, node)
          }
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: isLarge ? 0.3 : 0.15 }}
        attributionPosition="bottom-left"
        minZoom={0.05}
        maxZoom={4}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        nodesDraggable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        selectNodesOnDrag={false}
        nodesFocusable={true}
        elevateNodesOnSelect={false}
      >
        <Controls
          className="!border-border !bg-bg-2 !rounded-lg !shadow-lg [&_.react-flow__controls-button]:!border-border [&_.react-flow__controls-button]:!bg-bg-3 [&_.react-flow__controls-button]:!text-text-2 [&_.react-flow__controls-button]:!hover:bg-bg-4 [&_.react-flow__controls-button]:!w-7 [&_.react-flow__controls-button]:!h-7"
          showInteractive={false}
        />

        {showMinimap && (
          <MiniMap
            nodeColor={n => {
              const c = CATEGORY_COLORS[n.data?.roadmapCategory]
              return c?.border || '#5a5a72'
            }}
            maskColor="var(--color-overlay)"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: 110,
              height: 80,
            }}
            nodeStrokeWidth={1}
            nodeStrokeColor="var(--color-border-2)"
            nodeBorderRadius={4}
            pannable={true}
            zoomable={true}
          />
        )}

        <Background color="var(--color-border-2)" gap={28} size={1.5} variant="dots" />

        {/* Top-right controls */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => setShowMinimap(p => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-2 text-text-2 hover:border-accent hover:text-accent transition-colors shadow-md"
            aria-label={showMinimap ? 'Hide minimap' : 'Show minimap'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showMinimap ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </Panel>

        {/* Bottom-left legend */}
        <Panel position="bottom-left" className="flex items-center gap-3 rounded-lg border border-border bg-surface/90 backdrop-blur-sm px-3 py-2 text-[11px] text-text-3 shadow-md">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-green)' }} />
            <span className="text-text-2 font-medium">beginner</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-amber)' }} />
            <span className="text-text-2 font-medium">intermediate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-red)' }} />
            <span className="text-text-2 font-medium">advanced</span>
          </span>
          <span className="mx-1 h-3 w-px bg-border" />
          <span className="text-text-3/60 font-mono text-[10px]">scroll to zoom &middot; drag to pan</span>
        </Panel>

        {/* Bottom-right stats */}
        <Panel position="bottom-right" className="rounded-lg border border-border bg-surface/90 backdrop-blur-sm px-3 py-1.5 text-xs font-mono text-text-3 shadow-md tabular-nums">
          {initialNodes.length} nodes
          {initialEdges.length > 0 && <span className="ml-2">| {initialEdges.length} connections</span>}
        </Panel>
      </ReactFlow>
    </div>
  )
})
