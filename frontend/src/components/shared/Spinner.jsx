export default function Spinner({ size = 'md', text = '' }) {
  const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-10 w-10' }
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className={`${sizeMap[size] || sizeMap.md} animate-spin rounded-full border-2 border-accent border-t-transparent`} />
      {text && <span className="text-xs text-text-3">{text}</span>}
    </div>
  )
}
