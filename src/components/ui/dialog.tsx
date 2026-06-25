import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
  const [shouldRender, setShouldRender] = React.useState(isOpen)

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // 모달이 열리면 바디 스크롤 방지
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200) // 애니메이션 지속시간 매칭
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!shouldRender) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 백드롭 */}
      <div 
        className={cn(
          "absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* 다이얼로그 컨텐츠 */}
      <div
        className={cn(
          // 공통 스타일: 유리모프(glassmorphism) 스타일 테두리와 섀도우
          "relative z-10 w-full bg-white border border-slate-100 shadow-2xl p-5 sm:p-6 transition-all duration-200 ease-out focus:outline-none flex flex-col",
          // 모바일: 하단에서 위로 팝업 & 라운드 코너
          "rounded-t-2xl max-h-[90vh] overflow-hidden transform sm:transform-none",
          isOpen ? "translate-y-0" : "translate-y-full",
          // 데스크탑: 중앙 팝업 & scale 애니메이션
          "sm:rounded-2xl sm:max-w-md sm:w-full sm:translate-y-0 sm:scale-100",
          !isOpen && "sm:scale-95 sm:opacity-0",
          className
        )}
      >
        {/* 헤더 */}
        {title ? (
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors bg-white/80 backdrop-blur-xs border border-slate-100"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}

        {/* 바디 */}
        <div className="text-sm text-slate-600 flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}
