import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-white/10 bg-white/[0.02] p-6 transition-all duration-300',
        hover && 'hover:border-primary/50 hover:bg-white/[0.03]',
        className
      )}
      {...props}
    />
  )
}
