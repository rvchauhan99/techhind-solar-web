import Image from "next/image";

export const metadata = {
  title: "Auth | Solar Management System",
  description: "Solar Management System - Sign in and account recovery.",
};

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      {/* Single full-screen hero image only - solar-hero-4k.png */}
      <Image
        src="/images/solar-hero-4k.png"
        alt="Solar EPC - CRM for Indian solar companies"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      {/* Subtle overlay for text/card readability only */}
      <div
        className="absolute inset-0 bg-slate-900/20"
        aria-hidden
      />

      {/* Content overlaid on hero: two-column on lg, card only on mobile */}
      <div className="relative z-10 grid min-h-dvh lg:grid-cols-2">
        {/* Left: Headline + footer - hidden on mobile */}
        <div className="hidden flex-col justify-between p-8 xl:p-12 lg:flex">
          <div />
          <div>
            <h1 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              India&apos;s Most Powerful{" "}
              <span className="text-emerald-400">CRM</span> for Solar EPC
              <br />
              Companies
            </h1>
            <p className="mt-4 max-w-md text-base text-white/90 xl:text-lg">
              From Lead Generation to Project Completion – Manage your entire
              solar business with one powerful, cloud-based platform designed
              specifically for Indian solar companies.
            </p>
          </div>
          <p className="text-sm text-white/80">
            Powered by Techhind Pvt Ltd
            <br />
            All Rights Reserved © 2026
          </p>
        </div>

        {/* Right: Login card over hero */}
        <div className="flex min-h-dvh items-center justify-center p-4 md:p-6 lg:p-8">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/90 px-6 py-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 md:px-8 md:py-10"
            style={{
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
