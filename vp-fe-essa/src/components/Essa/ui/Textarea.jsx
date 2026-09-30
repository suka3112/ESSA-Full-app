import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('dx-textarea font-normal', className)} {...props} />
})
