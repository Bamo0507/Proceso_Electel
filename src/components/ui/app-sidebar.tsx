"use client"

import Link from "next/link"
import { FileInput } from "lucide-react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import Image from "next/image"

type MenuItem = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const menuItems: MenuItem[] = [
  { title: "Excel Proceso", url: "/process", icon: FileInput }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="p-0 group-data-[collapsible=icon]:!py-2 border-r border-b-black border-8"
      {...props}
    >
      <SidebarHeader>
        {/* Expanded: logo png */}
        <div className="group-data-[collapsible=icon]:hidden flex w-full items-center justify-center px-0">
          <Image
            src={`./Proceso_Electel/logo.svg`}
            width={120}
            height={120}
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        {/* Collapsed: avatar */}
        <div className="hidden group-data-[collapsible=icon]:flex w-full items-center justify-center px-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="font-semibold">E</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    asChild
                    className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!px-0"
                  >
                    <Link
                      href={item.url}
                      className="flex items-center group-data-[collapsible=icon]:justify-center"
                    >
                      <item.icon className="group-data-[collapsible=icon]:mx-auto" />
                      <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}