import { useState, useEffect } from "react"
import { NavLink } from "react-router-dom"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Timer,
  Clock,
  FolderOpen,
  Settings,
  ListTodo,
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { uiConfig } from "@/config/stores"
import { CommandPaletteProvider } from "@/components/CommandPaletteContext"
import { CommandActionsProvider } from "@/components/CommandActionsContext"
import { CommandPalette } from "@/components/CommandPalette"
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts"

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  // {
  //   title: "Importar CSV",
  //   url: "/import",
  //   icon: FileSpreadsheet,
  // },
  {
    title: "Mi TimeTracker",
    url: "/time-tracker",
    icon: Clock,
  },
  {
    title: "Proyectos",
    url: "/projects",
    icon: FolderOpen,
  },
  // {
  //   title: "Tiempos en Vivo",
  //   url: "/live-entries",
  //   icon: Clock,
  // },
  {
    title: "Mis Tareas",
    url: "/my-tasks",
    icon: ListTodo,
  },
]

const settingsNavItems = [
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
]

function GlobalShortcuts() {
  useGlobalShortcuts();
  return null;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(() => {
    const config = uiConfig.get();
    return config?.sidebarOpen ?? true;
  })

  useEffect(() => {
    uiConfig.set({ sidebarOpen: open });
  }, [open])

  return (
    <CommandPaletteProvider>
      <CommandActionsProvider>
        <SidebarProvider open={open} onOpenChange={setOpen}>
          <div className="min-h-screen flex flex-grow">
            <Sidebar collapsible="icon" className="border-r border-border/50">
            <SidebarHeader>
              {open ? (
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="flex items-center gap-1">
                    <Timer className="w-5 h-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Chronos</span>
                      <span className="text-xs text-muted-foreground">Time Tracker</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <SidebarTrigger className="h-5 w-5 p-1" />
                    <ThemeToggle className="!h-7 !w-7" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 p-1">
                  <Timer className="w-5 h-5 text-primary" />
                  <SidebarTrigger className="h-5 w-5 p-1" />
                  <ThemeToggle className="!h-7 !w-7" />
                </div>
              )}
            </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {mainNavItems.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <NavLink
                            to={item.url}
                            className="w-full"
                            end={item.url === "/"}
                          >
                            {({ isActive }) => (
                              <SidebarMenuButton
                                isActive={isActive}
                                tooltip={item.title}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                              </SidebarMenuButton>
                            )}
                          </NavLink>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup className="mt-auto">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {settingsNavItems.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <NavLink
                            to={item.url}
                            className="w-full"
                            end={item.url === "/settings"}
                          >
                            {({ isActive }) => (
                              <SidebarMenuButton
                                isActive={isActive}
                                tooltip={item.title}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                              </SidebarMenuButton>
                            )}
                          </NavLink>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex-1 min-w-0 bg-background font-sans">
              {children}
            </main>
          </div>
        </SidebarProvider>
        <CommandPalette />
        <GlobalShortcuts />
      </CommandActionsProvider>
    </CommandPaletteProvider>
  )
}
