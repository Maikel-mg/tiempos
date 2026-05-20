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
  FileSpreadsheet,
  Clock,
  FolderOpen,
  Settings,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { uiConfig } from "@/config/stores"

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Importar CSV",
    url: "/import",
    icon: FileSpreadsheet,
  },
  {
    title: "Proyectos",
    url: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Tiempos en Vivo",
    url: "/live-entries",
    icon: Clock,
  },
  {
    title: "Mi TimeTracker",
    url: "/time-tracker",
    icon: Clock,
  },
]

const settingsNavItems = [
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(() => {
    const config = uiConfig.get();
    return config?.sidebarOpen ?? true;
  })

  useEffect(() => {
    uiConfig.set({ sidebarOpen: open });
  }, [open])

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="min-h-screen flex">
        <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className={`flex items-center ${open ? 'justify-between gap-2 p-2' : 'justify-center gap-0 p-1'}`}>
            <div className="flex items-center gap-1">
              <div className="p-1 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              {open && (
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Importador</span>
                  <span className="text-xs text-muted-foreground">de Tiempos</span>
                </div>
              )}
            </div>
            <SidebarTrigger className="h-5 w-5 p-1" />
          </div>
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
            <Separator className="mx-auto w-4/5 my-2" />
            <SidebarGroup>
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
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
