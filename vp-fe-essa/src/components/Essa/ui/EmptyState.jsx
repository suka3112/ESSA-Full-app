import { CheckCircle, Clock, Inbox, Search } from 'lucide-react'

const ICONS = {
  inbox: Inbox,
  'check-circle': CheckCircle,
  'clock-history': Clock,
  search: Search
}

export function EmptyState({ icon = 'inbox', title, description, action }) {
  const Icon = ICONS[icon] || Inbox

  return (
    <div className="dx-empty-state">
      <Icon size={32} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
