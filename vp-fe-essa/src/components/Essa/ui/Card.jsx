import React from 'react'
import { cn } from '../lib/cn'

export function Card({ title, actions, children, className, pad, style, ...props }) {
  const hasChrome = title != null || actions != null
  const padded = pad ?? true

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...style
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottom: '1px solid #EEF0F2',
    background: '#FAFBFA',
    padding: '12px 18px',
    margin: 0
  }

  const titleStyle = {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: '#1F2937'
  }

  const bodyStyle = {
    padding: padded ? 18 : 0
  }

  return (
    <section className={cn('card', !hasChrome && 'dx-card', className)} style={cardStyle} {...props}>
      {hasChrome ? (
        <header className="card-header">
          <h2 className="card-title">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={cn('card-body', !padded && 'no-padding')}>{children}</div>
    </section>
  )
}

export function CardHeader({ className, style, children, ...props }) {
  return (
    <div className={cn('card-header dx-card-head', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, style, children, ...props }) {
  return (
    <h3 className={cn('card-title dx-card-title', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardBody({ className, style, children, ...props }) {
  return (
    <div className={cn('card-body dx-card-body', className)} {...props}>
      {children}
    </div>
  )
}
