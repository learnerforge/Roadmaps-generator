export const CATEGORIES = [
  'All', 'role-based', 'skill-based', 'absolute-beginners',
  'web-development', 'frameworks', 'languages', 'ai-ml',
  'devops', 'mobile', 'databases', 'cyber-security',
  'computer-science', 'security', 'version-control', 'ui-ux', 'soft-skills',
]

export const CATEGORY_COLORS = {
  'role-based': { border: '#7c6af7', bg: 'rgba(124,106,247,0.08)', badge: '#7c6af7', tw: 'bg-accent-glow text-accent border-accent/20' },
  'skill-based': { border: '#4ade80', bg: 'rgba(74,222,128,0.08)', badge: '#4ade80', tw: 'bg-green-dim text-green border-green/20' },
  'absolute-beginners': { border: '#fbbf24', bg: 'rgba(251,191,36,0.08)', badge: '#fbbf24', tw: 'bg-amber-dim text-amber border-amber/20' },
  'web-development': { border: '#60a5fa', bg: 'rgba(96,165,250,0.08)', badge: '#60a5fa', tw: 'bg-blue-dim text-blue border-blue/20' },
  'frameworks': { border: '#a78bfa', bg: 'rgba(167,139,250,0.08)', badge: '#a78bfa', tw: 'bg-purple-dim text-purple-400 border-purple-400/20' },
  'languages': { border: '#22d3ee', bg: 'rgba(34,211,238,0.08)', badge: '#22d3ee', tw: 'bg-cyan-dim text-cyan-400 border-cyan-400/20' },
  'ai-ml': { border: '#fb7185', bg: 'rgba(251,113,133,0.08)', badge: '#fb7185', tw: 'bg-rose-dim text-rose-400 border-rose-400/20' },
  'devops': { border: '#fb923c', bg: 'rgba(251,146,60,0.08)', badge: '#fb923c', tw: 'bg-orange-dim text-orange-400 border-orange-400/20' },
  'mobile': { border: '#2dd4bf', bg: 'rgba(45,212,191,0.08)', badge: '#2dd4bf', tw: 'bg-teal-dim text-teal-400 border-teal-400/20' },
  'databases': { border: '#818cf8', bg: 'rgba(129,140,248,0.08)', badge: '#818cf8', tw: 'bg-indigo-dim text-indigo-400 border-indigo-400/20' },
  'cyber-security': { border: '#f87171', bg: 'rgba(248,113,113,0.08)', badge: '#f87171', tw: 'bg-red-dim text-red border-red/20' },
  'computer-science': { border: '#34d399', bg: 'rgba(52,211,153,0.08)', badge: '#34d399', tw: 'bg-emerald-dim text-emerald-400 border-emerald-400/20' },
  'security': { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', badge: '#ef4444', tw: 'bg-red-dim text-red-500 border-red-500/20' },
  'version-control': { border: '#c084fc', bg: 'rgba(192,132,252,0.08)', badge: '#c084fc', tw: 'bg-purple-dim text-purple-300 border-purple-300/20' },
  'ui-ux': { border: '#67e8f9', bg: 'rgba(103,232,249,0.08)', badge: '#67e8f9', tw: 'bg-cyan-dim text-cyan-400 border-cyan-400/20' },
  'soft-skills': { border: '#fbbf24', bg: 'rgba(251,191,36,0.08)', badge: '#fbbf24', tw: 'bg-amber-dim text-amber border-amber/20' },
}

export const STATUS_COLORS = {
  pending: 'border-border bg-bg-2 text-text-2',
  in_progress: 'border-blue bg-blue-dim text-blue',
  done: 'border-green bg-green-dim text-green',
  skipped: 'border-text-3 bg-bg-3 text-text-3',
  bookmarked: 'border-amber bg-amber-dim text-amber',
}

export const DIFFICULTY_COLORS = {
  beginner:     { dot: 'var(--color-green)',  text: 'var(--color-green)' },
  intermediate: { dot: 'var(--color-amber)',  text: 'var(--color-amber)' },
  advanced:     { dot: 'var(--color-red)',    text: 'var(--color-red)' },
}

export const EXPORT_FORMATS = [
  { format: 'json', label: 'Export JSON', ext: 'json' },
  { format: 'csv', label: 'Export CSV', ext: 'csv' },
]
