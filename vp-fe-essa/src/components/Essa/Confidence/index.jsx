export default function Confidence({ value }) {
  if (value == null) return <span className="text-muted">—</span>
  const pct = Math.round(value * 100)
  const cls = pct >= 90 ? 'high' : pct >= 75 ? 'mid' : 'low'
  return (
    <span className={`dx-confidence ${cls}`} title="OCR confidence score">
      <span className="bar">
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm fw-600">{pct}%</span>
    </span>
  )
}
