import { cn } from '../lib/cn'

export function Badge({ tone = 'neutral', dot = true, className, children }) {
  const t = tone || 'neutral'
  return (
    <span
      className={cn('dx-badge', t, !dot && 'no-dot', className)}
      style={!dot ? { '--bullet': 'none' } : null}
    >
      {children ?? String(t).replace(/_/g, ' ')}
    </span>
  )
}
