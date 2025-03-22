import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "@/app/globals.css"

export const metadata = {
  title: "Glask IDE",
  description: "A glassmorphic IDE experience",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            color-scheme: dark;
          }
        `}</style>
      </head>
      <body className="bg-gradient-custom min-h-screen font-['SF_Pro_Display',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] text-foreground dark">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#c0c0c8]/5 blur-3xl"></div>
            <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-[#c0c0c8]/5 blur-3xl"></div>
          </div>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'