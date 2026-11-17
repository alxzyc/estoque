'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DropdownMenuProps {
  trigger: ReactNode
  content: ReactNode
  align?: 'start' | 'end'
}

export function DropdownMenu({ trigger, content, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block">
      <div ref={triggerRef}>
        {typeof trigger === 'function' ? trigger({ open, onClick: () => setOpen(!open) }) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1"
            aria-haspopup="true"
            aria-expanded={open}
          >
            {trigger}
          </button>
        )}
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            'fixed z-50 mt-1.5 min-w-[180px] rounded-md border bg-popover text-popover-foreground shadow-lg',
            align === 'end' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          <div className="py-1">{content}</div>
        </div>
      )}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({ children, onClick, disabled, className }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center px-3 py-2 text-sm focus:outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <hr role="separator" className={cn('my-1 h-1 bg-border', className)} />
}

interface DropdownMenuLabelProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div role="menuitem" className={cn('px-3 py-2 text-sm font-medium text-muted-foreground', className)}>
      {children}
    </div>
  )
}