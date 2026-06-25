import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-98 transition-transform duration-100 cursor-pointer",
          // Variants
          variant === "default" && "bg-slate-900 text-slate-50 hover:bg-slate-800 shadow-sm",
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-700 shadow-sm",
          variant === "outline" && "border border-slate-200 bg-white text-slate-950 hover:bg-slate-50 hover:text-slate-900",
          variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-200",
          variant === "ghost" && "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
          variant === "link" && "text-slate-900 underline-offset-4 hover:underline",
          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 rounded-lg px-3 text-xs",
          size === "lg" && "h-11 rounded-xl px-8 text-base",
          size === "icon" && "h-10 w-10 rounded-full",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
