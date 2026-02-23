"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useNavigationLayout, useSidebarCollapsed } from "@/stores/simple-navigation-store"

export function SimpleNavMain({
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
  const layout = useNavigationLayout()
  const sidebarCollapsed = useSidebarCollapsed()

  // 只在垂直布局时渲染
  if (layout !== 'vertical') {
    return null
  }

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        // 计算活跃状态
        const exactMatch = pathname === item.url
        const subPathMatch = item.url !== "/" && pathname.startsWith(item.url)
        const isActive = item.isActive || exactMatch || subPathMatch
        
        return (
          <Link
            key={item.title}
            href={item.url}
            className={cn(
              "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full",
              sidebarCollapsed ? "justify-center py-2 px-2" : "py-2 px-3",
              "hover:bg-primary/10",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-sidebar-foreground hover:text-primary"
            )}
          >
            <span className={cn(
              "flex items-center justify-center flex-shrink-0 size-5",
              isActive ? "text-primary-foreground" : "text-sidebar-foreground/70"
            )}>
              <item.icon className="size-4" />
            </span>
            {!sidebarCollapsed && (
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
          </Link>
        )
      })}
    </nav>
  )
}
