import { Manrope, Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Providers } from "@/components/providers";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import FloatingNotificationWidget from "@/components/notifications/FloatingNotificationWidgetLoader";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Solar Management System",
    template: "%s | Solar Management System",
  },
  description:
    "Solar Management System - Inquiry, quotation, orders, and operations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Solar" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-800 min-h-screen`}
        suppressHydrationWarning
      >
        <Providers>
          <AuthProvider>
            <NotificationProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
              <FloatingNotificationWidget />
            </NotificationProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
