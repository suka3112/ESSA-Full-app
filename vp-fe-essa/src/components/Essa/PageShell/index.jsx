import { Link } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'

export default function EssaPageShell({ children }) {
  return <LeftPageContainer>{children}</LeftPageContainer>
}

function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-separator">&gt;</span>}
          {item.to ? (
            <Link to={item.to} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'breadcrumb-current' : undefined}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

/** Tight header (design review): minimal whitespace around the breadcrumb bar. */
export function PageHeader({ breadcrumb, title, description, actions }) {
  const hasCrumb = Boolean(breadcrumb?.length)
  return (
    <div className="page-header">
      {hasCrumb ? <Breadcrumb items={breadcrumb} /> : null}
      <div className="page-header-content">
        <div className="page-header-main">
          <h1 className="page-header-title">{title}</h1>
          {description ? <p className="page-header-description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </div>
  )
}
