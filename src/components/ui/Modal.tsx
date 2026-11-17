import { Fragment, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Modal({ open, onOpenChange, title, description, children, size = 'md' }: ModalProps) {
  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onOpenChange(false)
  }

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn(
            'relative w-full rounded-lg bg-background p-6 shadow-lg',
            sizes[size]
          )}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          {(title || description) && (
            <div className="mb-4">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </Fragment>
  )
}