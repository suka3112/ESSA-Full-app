import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 rounded-md border border-line bg-white px-2 py-1.5 text-[13px] font-normal text-ink',
        'focus:border-essa-500 focus:outline-none focus:ring-2 focus:ring-essa-100 disabled:bg-line-soft',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  )
})
