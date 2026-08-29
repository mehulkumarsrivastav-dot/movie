import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const variants: Record<string, string> = {
  primary: 'bg-rose-glow text-cinema-void hover:bg-rose-ember shadow-[0_0_24px_-6px_rgba(232,116,138,0.55)]',
  secondary: 'bg-cinema-charcoal text-cinema-fog border border-cinema-line hover:border-rose-glow/50 hover:text-white',
  ghost: 'bg-transparent text-cinema-mist hover:text-white hover:bg-white/5',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
}

const sizes: Record<string, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3.5 gap-2.5',
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-none',
        'active:scale-[0.97]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
