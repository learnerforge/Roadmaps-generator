export const CATEGORIES = [
  'All', 'role-based', 'skill-based', 'absolute-beginners',
  'web-development', 'frameworks', 'languages', 'ai-ml',
  'devops', 'mobile', 'databases', 'cyber-security',
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
}

export const STATUS_COLORS = {
  pending: 'border-border bg-bg-2 text-text-2',
  in_progress: 'border-blue bg-blue-dim text-blue',
  done: 'border-green bg-green-dim text-green',
  skipped: 'border-text-3 bg-bg-3 text-text-3',
  bookmarked: 'border-amber bg-amber-dim text-amber',
}

export const EXPORT_FORMATS = [
  { format: 'json', label: 'Export JSON', ext: 'json' },
  { format: 'csv', label: 'Export CSV', ext: 'csv' },
]
