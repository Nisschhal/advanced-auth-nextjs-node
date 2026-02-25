import type { Metadata } from "next"
import { DM_Sans, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/next-theme"
import QueryProvider from "@/components/providers/query-provider"
import { Toaster } from "sonner"

const dm_sans = DM_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NextJS/Express Auth App",
  description: "Express as backend, Nextjs as frontend",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`bg-background ${dm_sans.className} antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
