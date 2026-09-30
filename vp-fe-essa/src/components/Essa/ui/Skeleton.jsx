import { cn } from '../lib/cn'

export function Skeleton({ className, style }) {
  return <div className={cn('dx-skel', className)} style={style} />
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('dx-stack-sm', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} style={{ height: 12, width: i === lines - 1 ? '66%' : '100%' }} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="dx-card" style={{ padding: 14 }}>
      <Skeleton style={{ height: 14, width: '33%', marginBottom: 10 }} />
      <Skeleton style={{ height: 30, width: '60%', marginBottom: 6 }} />
      <Skeleton style={{ height: 12, width: '40%' }} />
    </div>
  )
}
