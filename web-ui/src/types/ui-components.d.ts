// Declaraciones de módulo para componentes UI sin tipos TypeScript
// Estos archivos .d.ts evitan errores "is not a module" y permiten any implícito

declare module '@/components/ui/dropdown-menu' {
  import * as React from 'react'
  export const DropdownMenu: React.ComponentType<any>
  export const DropdownMenuTrigger: React.ComponentType<any>
  export const DropdownMenuContent: React.ComponentType<any>
  export const DropdownMenuItem: React.ComponentType<any>
  export const DropdownMenuCheckboxItem: React.ComponentType<any>
  export const DropdownMenuRadioItem: React.ComponentType<any>
  export const DropdownMenuLabel: React.ComponentType<any>
  export const DropdownMenuSeparator: React.ComponentType<any>
  export const DropdownMenuGroup: React.ComponentType<any>
  export const DropdownMenuRadioGroup: React.ComponentType<any>
  export const DropdownMenuSub: React.ComponentType<any>
  export const DropdownMenuSubTrigger: React.ComponentType<any>
  export const DropdownMenuSubContent: React.ComponentType<any>
}

declare module '@/components/ui/select' {
  import * as React from 'react'
  export const Select: React.ComponentType<any>
  export const SelectGroup: React.ComponentType<any>
  export const SelectValue: React.ComponentType<any>
  export const SelectTrigger: React.ComponentType<any>
  export const SelectContent: React.ComponentType<any>
  export const SelectLabel: React.ComponentType<any>
  export const SelectItem: React.ComponentType<any>
  export const SelectSeparator: React.ComponentType<any>
  export const SelectScrollUpButton: React.ComponentType<any>
  export const SelectScrollDownButton: React.ComponentType<any>
}