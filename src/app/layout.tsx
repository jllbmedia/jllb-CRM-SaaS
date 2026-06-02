import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "JLLB CRM | Premium CRM Solution",
  description: "Secure, high-performance, browser-based CRM built for JLLB Media.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-[#0B0B0C] text-zinc-100 font-sans selection:bg-[#F6CF38]/30 selection:text-white">
        <div className="flex w-full min-h-screen">
          {/* Desktop Sidebar Navigation */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Scrollable Container */}
            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile Sticky Bottom Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
