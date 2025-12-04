'use client'

import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'group relative inline-flex items-center justify-center font-medium border overflow-hidden transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-primary border-primary text-white hover:brightness-110': variant === 'default',
          'bg-white/[0.02] border-white/10 text-white/70': variant === 'outline',
          'bg-transparent border-transparent text-white/70': variant === 'ghost',
        },
        {
          'h-10 px-5 text-sm': size === 'sm',
          'h-12 px-8 text-base': size === 'md',
          'h-14 px-10 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
        {props.children}
      </span>
      {variant === 'default' && (
        <div className="absolute inset-0 bg-primary/80 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      )}
      {variant === 'outline' && (
        <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      )}
      {variant === 'ghost' && (
        <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      )}
    </button>
  )
}
