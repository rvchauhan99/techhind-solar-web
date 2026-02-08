import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Auth | Solar Management System",
  description: "Solar Management System - Sign in and account recovery.",
};

export default function AuthLayout({ children }) {
  return (
    <div className="bg-content min-h-dvh p-2 md:p-4">
      <Card className="h-[calc(100vh-16px)] w-full md:h-[calc(100vh-32px)] md:py-0">
        <CardContent className="flex h-full px-0 md:pl-4">
          {/* Left Section - Branding (hidden on small screens) */}
          <div
            className="relative hidden overflow-hidden rounded-md md:my-4 lg:flex lg:flex-1"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            }}
          >
            <div className="relative z-10 flex flex-1 flex-col justify-end p-5">
              <h1 className="text-2xl font-bold text-primary">
                Solar Management System
              </h1>
              <p className="mt-2 text-sm text-white/90">
                Monitor efficiency, track grid performance, and optimize
                energy output in real-time. Inquiry, quotation, orders, and
                operations in one place.
              </p>
            </div>
          </div>

          {/* Right Section - Form area */}
          <div className="relative flex flex-1 overflow-y-auto bg-background">
            {/* Dot pattern background */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative z-10 flex w-full justify-center p-4">
              <div className="mx-auto w-full max-w-md">
                <div className="flex min-h-full items-center justify-center py-8">
                  <div className="w-full shrink-0">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
