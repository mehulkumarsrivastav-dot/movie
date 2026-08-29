import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-cinema-line bg-cinema-black/80 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]',
        className
      )}
      {...props}
    />
  )
}
