import * as React from "react"
import { cn } from "@/lib/utils"

const PopoverContext = React.createContext(null)

const Popover = ({ open, onOpenChange, children }) => {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef(({ asChild, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(PopoverContext)
  
  return React.cloneElement(children, { 
    ...props, 
    ref,
    onClick: (e) => {
      e.stopPropagation()
      onOpenChange(!open)
    }
  })
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef(({ className, align = "end", children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(PopoverContext)
  
  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-transparent" 
        onClick={() => onOpenChange(false)} 
      />
      <div
        ref={ref}
        className={cn(
          "absolute top-full mt-2 bg-background rounded-lg shadow-lg border p-4 min-w-[200px] max-h-[300px] overflow-auto z-50",
          align === "end" ? "right-0" : "left-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
PopoverContent.displayName = "PopoverContent"

export {
  Popover,
  PopoverContent,
  PopoverTrigger,
}
