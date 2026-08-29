import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  danger?: boolean
  label: string
  children: ReactNode
}

export function IconButton({ active, danger, label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
        danger
          ? 'bg-red-500/90 text-white hover:bg-red-500'
          : active
            ? 'bg-white text-cinema-void'
            : 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
