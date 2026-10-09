import { cn } from '../lib/cn'

export function Tabs({ tabs, value, onChange, className, actions = null }) {
  const row = (
    <div className={cn('dx-tabs', className)} role="tablist">
      {tabs.map((t) => {
        const active = value === t.value
        const Icon = t.icon
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn('dx-tab', active && 'active', t.tabClassName)}
            type="button"
            title={t.title}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {Icon && <Icon size={14} strokeWidth={2} />}
              <span>{t.label}</span>
              {t.badge != null && (
                <span className={cn('dx-tab-badge', active && 'is-active')}>{t.badge}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )

  if (!actions) return row

  return (
    <div className="dx-tabs-row">
      {row}
      <div className="dx-tabs-actions">{actions}</div>
    </div>
  )
}
