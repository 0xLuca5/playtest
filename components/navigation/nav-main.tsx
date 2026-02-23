"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/navigation/sidebar-main"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    badge?: React.ReactNode
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()

  return (
    <SidebarMenu className="">
      {items.map((item) => {
        // 首先检查是否有精确匹配
        const exactMatch = pathname === item.url
        // 然后检查是否有子路径匹配（但排除根路径"/"的子路径匹配，因为所有路径都以"/"开头）
        const subPathMatch = item.url !== "/" && pathname.startsWith(item.url)
        const isActive = item.isActive || exactMatch || subPathMatch
        
        return (
          <SidebarMenuItem key={item.title} className="my-1">
            <SidebarMenuButton 
              asChild 
              isActive={isActive} 
              tooltip={item.title}
              className="!p-0 !bg-transparent !hover:bg-transparent !hover:text-inherit !border-none !shadow-none !outline-none group-data-[collapsible=icon]:!p-0"
              variant="outline"
            >
              <Link href={item.url} className="block w-full">
                <div className={cn(
                  "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full",
                  state === "collapsed" ? "justify-center py-1.5 px-1.5" : "py-2 px-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground"
                )}>
                  <span className={cn(
                    "flex items-center justify-center flex-shrink-0",
                    state === "collapsed" ? "size-5" : "size-5",
                    isActive ? "text-primary-foreground" : "text-primary"
                  )}>
                    <item.icon className={cn(
                      state === "collapsed" ? "size-4" : "size-4"
                    )} />
                  </span>
                  {state !== "collapsed" && (
                    <>
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className={cn(
                          "ml-auto text-xs rounded-full px-2 py-0.5",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
