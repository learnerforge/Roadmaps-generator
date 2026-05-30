import { useCallback, useMemo } from 'react'
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

const CATEGORY_COLORS = {
  'role-based': { border: '#7c6af7', bg: 'rgba(124,106,247,0.08)', badge: '#7c6af7' },
  'skill-based': { border: '#4ade80', bg: 'rgba(74,222,128,0.08)', badge: '#4ade80' },
  'absolute-beginners': { border: '#fbbf24', bg: 'rgba(251,191,36,0.08)', badge: '#fbbf24' },
  'web-development': { border: '#60a5fa', bg: 'rgba(96,165,250,0.08)', badge: '#60a5fa' },
  'frameworks': { border: '#a78bfa', bg: 'rgba(167,139,250,0.08)', badge: '#a78bfa' },
  'languages': { border: '#22d3ee', bg: 'rgba(34,211,238,0.08)', badge: '#22d3ee' },
  'ai-ml': { border: '#fb7185', bg: 'rgba(251,113,133,0.08)', badge: '#fb7185' },
  'devops': { border: '#fb923c', bg: 'rgba(251,146,60,0.08)', badge: '#fb923c' },
  'mobile': { border: '#2dd4bf', bg: 'rgba(45,212,191,0.08)', badge: '#2dd4bf' },
  'databases': { border: '#818cf8', bg: 'rgba(129,140,248,0.08)', badge: '#818cf8' },
  'cyber-security': { border: '#f87171', bg: 'rgba(248,113,113,0.08)', badge: '#f87171' },
}

function GraphNode({ data }) {
  const colors = CATEGORY_COLORS[data.roadmapCategory] || { border: '#5a5a72', bg: 'rgba(90,90,114,0.08)', badge: '#5a5a72' }

  return (
    <div
      className="group rounded-lg border bg-bg-2 px-3 py-2 shadow-lg transition-all hover:border-accent/50 hover:shadow-accent/10"
      style={{
        borderColor: data.selected ? colors.border : undefined,
        minWidth: 140,
        maxWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} className="!border-border !bg-bg-3" />
      <div className="text-xs font-medium text-white leading-tight">{data.label}</div>
      {data.difficulty && (
        <span
          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-mono uppercase"
          style={{ backgroundColor: colors.bg, color: colors.badge }}
        >
          {data.difficulty}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!border-border !bg-bg-3" />
    </div>
  )
}

const defaultViewport = { x: 0, y: 0, zoom: 0.6 }

export default function RoadmapGraph({ nodes: rawNodes, edges: rawEdges, category }) {
  const initialNodes = useMemo(() => {
    const posXValues = rawNodes.map(n => n.position_x)
    const posYValues = rawNodes.map(n => n.position_y)
    const minX = Math.min(...posXValues)
    const minY = Math.min(...posYValues)

    return rawNodes.map((n) => ({
      id: String(n.id),
      type: 'graphNode',
      position: {
        x: n.position_x - minX,
        y: n.position_y - minY,
      },
      data: {
        label: n.title,
        difficulty: n.difficulty,
        roadmapCategory: category,
        selected: false,
      },
    }))
  }, [rawNodes, category])

  const initialEdges = useMemo(() => rawEdges.map((e) => ({
    id: e.id,
    source: String(e.source),
    target: String(e.target),
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3a3a52', strokeWidth: 2 },
    active: false,
  })), [rawEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const nodeTypes = useMemo(() => ({ graphNode: GraphNode }), [])

  const onNodeClick = useCallback((_, node) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
        data: { ...n.data, selected: n.id === node.id },
      }))
    )
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: e.source === node.id || e.target === node.id,
        style: {
          ...e.style,
          stroke: e.source === node.id || e.target === node.id ? '#7c6af7' : '#3a3a52',
          strokeWidth: e.source === node.id || e.target === node.id ? 3 : 2,
        },
      }))
    )
  }, [setNodes, setEdges])

  return (
    <div className="h-[600px] w-full rounded-xl border border-border bg-bg" style={{ height: '75vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={4}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        nodesDraggable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        selectNodesOnDrag={false}
      >
        <Controls className="!border-border !bg-bg-3 !rounded-lg" />
        <MiniMap
          nodeColor={() => '#3a3a52'}
          maskColor="rgba(10,10,15,0.85)"
          style={{ background: '#16161f', border: '1px solid #2a2a3e', borderRadius: 8, width: 200, height: 150, zIndex: 15 }}
          pannable={true}
          zoomable={true}
          nodeStrokeWidth={1}
          nodeStrokeColor="#5a5a72"
          nodeBorderRadius={4}
        />
        <Background color="#1a1a2e" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
