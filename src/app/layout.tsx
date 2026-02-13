import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/lib/i18n-context";
import { Toaster } from "@/components/ui/sonner";
import { DemoBanner } from "@/components/demo-banner";

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
          <LanguageProvider>
            <DemoBanner />
            {children}
            <Toaster />
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
