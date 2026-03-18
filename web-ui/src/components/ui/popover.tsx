import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextType | null>(null)

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Popover = ({ open, onOpenChange, children }: PopoverProps) => {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(({ asChild, children, ...props }, ref) => {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverTrigger must be used within a Popover")
  
  const { open, onOpenChange } = context
  
  return React.cloneElement(children as React.ReactElement, { 
    ...props, 
    ref,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      onOpenChange(!open)
    }
  })
})
PopoverTrigger.displayName = "PopoverTrigger"

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(({ className, align = "end", children, ...props }, ref) => {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverContent must be used within a Popover")
  
  const { open, onOpenChange } = context
  
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
