import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'dx-input h-9 w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] font-normal placeholder:text-ink-faint',
        'focus:border-essa-500 focus:outline-none focus:ring-2 focus:ring-essa-100 disabled:bg-line-soft',
        className
      )}
      {...props}
    />
  )
})
