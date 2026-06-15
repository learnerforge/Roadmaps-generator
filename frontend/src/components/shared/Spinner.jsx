export default function Spinner({ size = 'md', text = '' }) {
  const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-10 w-10' }
  return (
    <div className="flex flex-col items-center gap-3 py-4" role="status" aria-label={text || 'Loading'}>
      <div className={`spinner-ring rounded-full ${sizeMap[size] || sizeMap.md}`} />
      {text && <span className="text-xs text-text-3">{text}</span>}
    </div>
  )
}
