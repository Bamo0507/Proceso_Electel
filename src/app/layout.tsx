import type { Metadata } from "next";
import { PT_Sans, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Toolbar } from "@/components/shared/toolbar";

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-pt-sans',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Electel | Proceso",
  description: "Electel",
  icons: {
    icon: './Proceso_Electel/logo.svg',
    apple: './Proceso_Electel/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ptSans.variable} ${nunito.variable} font-sans antialiased`}
      >
        <SidebarProvider>
          <div className="flex w-full min-h-screen">
            <AppSidebar className="peer" />
            <SidebarInset
              className="
                flex-1
                md:peer-data-[variant=inset]:rounded-none
                md:peer-data-[variant=inset]:shadow-none
                md:peer-data-[variant=inset]:m-0
                bg-gray-50
                min-h-screen
              "
            >
              <Toolbar />
              <main className="p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>

        <Toaster 
          richColors 
          theme="light"
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }
          }}
        />
      </body>
    </html>
  );
}