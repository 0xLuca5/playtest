import type { Metadata } from "next";
import "../globals.css";
import { NextAuthSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "认证 - AI Run",
  description: "登录或注册 AI Run 应用",
};

// 这个布局完全替换根布局，不会继承任何组件
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* No-flash theme script for auth layout */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try{
    var ls = localStorage.getItem('theme-store');
    var isDark = true;
    if(ls){
      var parsed = JSON.parse(ls);
      if(parsed && parsed.state && typeof parsed.state.isDarkMode === 'boolean'){
        isDark = parsed.state.isDarkMode;
      }
    } else if (window.matchMedia) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var docEl = document.documentElement;
    if(isDark){ docEl.classList.add('dark'); }
    var theme = (ls && JSON.parse(ls)?.state?.theme) || 'blue';
    if(theme && theme !== 'default'){ docEl.classList.add('theme-' + theme); }
  }catch(e){}
})();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <NextAuthSessionProvider>
          <div className="flex h-dvh w-screen items-center justify-center bg-background">
            {children}
          </div>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
} 