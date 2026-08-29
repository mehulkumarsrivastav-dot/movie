import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-cinema-line bg-cinema-charcoal/70 px-4 py-3 text-sm text-cinema-fog',
        'placeholder:text-cinema-mist/70 outline-none transition-colors',
        'focus:border-rose-glow/60',
        className
      )}
      {...props}
    />
  )
}
