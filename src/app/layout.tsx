import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supplier Onboarding",
  description: "Supplier onboarding applicatie voor leveranciersregistratie",
};

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {isDemoMode && (
            <div className="bg-red-50 border-b border-red-200 text-red-700 text-center text-sm font-medium py-1">
              Test / Demo omgeving
            </div>
          )}
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
