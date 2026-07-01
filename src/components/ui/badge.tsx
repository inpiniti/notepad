import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'project' | 'tag'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400",
        // Variants
        variant === "default" && "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-800",
        variant === "secondary" && "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
        variant === "destructive" && "border-transparent bg-red-100 text-red-700 border-red-200",
        variant === "outline" && "text-slate-950 border-slate-200 bg-white",
        // 프로젝트 및 태그 전용 스타일 (Harmonious 프리미엄 컬러 세트)
        variant === "project" && "border-transparent bg-rose-50 text-rose-700 hover:bg-rose-100/80 font-medium border border-rose-100",
        variant === "tag" && "border-transparent bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 font-medium border border-emerald-100",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
