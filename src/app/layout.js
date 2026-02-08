import { Manrope, Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/context/AuthContext";
import { Providers } from "@/components/providers";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
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
    <html lang="en" className={manrope.variable}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Solar" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
