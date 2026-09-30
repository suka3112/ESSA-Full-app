import { forwardRef } from 'react'
import { cn } from '../lib/cn'

const variantClass = {
  primary: 'dx-btn dx-btn-primary',
  secondary: 'dx-btn dx-btn-secondary',
  ghost: 'dx-btn dx-btn-ghost',
  outline: 'dx-btn dx-btn-ghost',
  success: 'dx-btn dx-btn-success',
  danger: 'dx-btn dx-btn-danger',
  subtle: 'dx-btn',
  link: ''
}

const sizeClass = {
  sm: 'dx-btn-sm',
  md: '',
  lg: '',
  icon: 'dx-btn dx-btn-ghost dx-icon-btn'
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, children, style, ...props },
  ref
) {
  const isIcon = size === 'icon'
  const cls = isIcon
    ? cn(sizeClass.icon, className)
    : cn(variantClass[variant] || variantClass.primary, sizeClass[size], className)

  const linkStyle =
    variant === 'link'
      ? {
          color: 'var(--dx-primary-600)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          ...style
        }
      : style

  return (
    <button ref={ref} className={cls} style={linkStyle} {...props}>
      {children}
    </button>
  )
})
