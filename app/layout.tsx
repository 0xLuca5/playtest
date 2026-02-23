import type { Metadata } from "next";
import "./globals.css";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { LayoutProvider } from "@/components/layout-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProjectProvider } from "@/lib/contexts/project-context";
import { I18nProvider } from "@/components/providers/i18n-provider";
import Script from "next/script";

// 使用CSS变量定义系统字体
const fontVariables = {
  variable: "font-sans font-mono",
};

export const metadata: Metadata = {
  title: "PlayTest - AI-Powered Testing Platform",
  description: "AI-powered application built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* No-flash theme script: decide dark/light before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try{
    var ls = localStorage.getItem('theme-store');
    var isDark = true; // default: dark
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
    // apply theme class if any
    var theme = (ls && JSON.parse(ls)?.state?.theme) || 'blue';
    if(theme && theme !== 'default'){ docEl.classList.add('theme-' + theme); }
  }catch(e){}
})();
            `,
          }}
        />
      </head>
      <body className="antialiased h-full overflow-x-hidden bg-background text-foreground">
        <NextAuthSessionProvider>
          <I18nProvider>
            <ThemeProvider>
              <ProjectProvider>
                <LayoutProvider>
                  {children}
                  <Toaster />
                </LayoutProvider>
              </ProjectProvider>
            </ThemeProvider>
          </I18nProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
