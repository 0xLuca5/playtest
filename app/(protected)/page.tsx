import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/navigation/sidebar-main"

import { JSXPreview } from "@/components/ui/jsx-preview"

// 强制动态渲染以避免静态生成错误
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="bg-muted/50 mx-auto h-24 w-full max-w-3xl rounded-xl" />
        <div className="bg-muted/50 mx-auto h-[100vh] w-full max-w-3xl rounded-xl" />
        
      </div>
    </SidebarInset>
  )
}
