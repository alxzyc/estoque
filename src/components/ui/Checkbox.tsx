import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex items-start space-x-3">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2',
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div className="space-y-1 leading-none">
            {label && (
              <label htmlFor={checkboxId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'