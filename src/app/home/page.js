"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  IconSolarElectricity,
  IconTrendingUp,
  IconPackage,
  IconClipboardList,
  IconUsers,
  IconCircleCheck,
  IconGauge,
  IconShield,
  IconChartBar,
  IconMoodHappy,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const fadeInUp = "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards";

const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    const endValue = parseInt(String(end).replace(/,/g, ""), 10);

    if (isNaN(endValue)) return;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * endValue));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration]);

  return end.replace(/\d+/g, count.toLocaleString());
};

export default function Home() {
  const { user } = useAuth();

  const stats = [
    {
      title: "Total Inquiries",
      value: "1,234",
      change: "+12%",
      icon: IconClipboardList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500",
    },
    {
      title: "Active Projects",
      value: "89",
      change: "+5%",
      icon: IconSolarElectricity,
      color: "text-sky-600",
      bgColor: "bg-sky-500",
    },
    {
      title: "Inventory Items",
      value: "2,456",
      change: "+8%",
      icon: IconPackage,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500",
    },
    {
      title: "Total Orders",
      value: "567",
      change: "+15%",
      icon: IconTrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-500",
    },
  ];

  const features = [
    {
      title: "Inquiry Management",
      description:
        "Streamline customer inquiries from initial contact to conversion.",
      icon: IconClipboardList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Inventory Control",
      description:
        "Real-time stock tracking with serial numbers and lot management.",
      icon: IconPackage,
      color: "text-sky-600",
      bgColor: "bg-sky-500/10",
    },
    {
      title: "Purchase Orders",
      description: "Efficient procurement with automated supplier workflows.",
      icon: IconTrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "User Management",
      description: "Granular permissions and role-based access control.",
      icon: IconUsers,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Analytics & Reports",
      description: "Real-time insights and customizable visual reporting.",
      icon: IconChartBar,
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
    },
    {
      title: "Security & Compliance",
      description: "Enterprise-grade 2FA, audit trails, and data protection.",
      icon: IconShield,
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
  ];

  const highlights = [
    {
      title: "Real-time Tracking",
      description: "Live operational monitoring.",
      icon: IconGauge,
      color: "text-pink-600",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Smart Automation",
      description: "Intelligent process optimization.",
      icon: IconCircleCheck,
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-transparent pb-8">
        <Container className="pt-6">
          {/* Header */}
          <div className={cn("mb-6", fadeInUp)}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dashboard Overview
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
              <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
                Welcome back, {user?.name?.split(" ")[0] || "User"}!
              </span>
              <span className="inline-block animate-wave origin-[70%_70%]">
                <IconMoodHappy className="size-8 text-amber-400" />
              </span>
            </h1>
            <p className="mt-1 max-w-xl text-muted-foreground">
              Here&apos;s what&apos;s happening with your Solar Management System
              today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className={cn(
                    "transition-all duration-300 hover:-translate-y-2 hover:shadow-lg",
                    fadeInUp
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className={cn(
                          "flex size-12 items-center justify-center rounded-xl text-white shadow-lg [&>svg]:size-6",
                          stat.bgColor
                        )}
                      >
                        <Icon />
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("font-semibold", stat.color)}
                      >
                        {stat.change}
                      </Badge>
                    </div>
                    <p className="text-2xl font-extrabold tracking-tight">
                      <AnimatedCounter end={stat.value} />
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Access */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-bold">Quick Access</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Card
                      key={feature.title}
                      className={cn(
                        "cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
                        fadeInUp
                      )}
                      style={{ animationDelay: `${300 + index * 50}ms` }}
                    >
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-11 items-center justify-center rounded-xl",
                              feature.bgColor,
                              feature.color
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <h3 className="font-bold">{feature.title}</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* System Status */}
            <div className={cn("space-y-4", fadeInUp)} style={{ animationDelay: "400ms" }}>
              <h2 className="text-lg font-bold">System Status</h2>

              <div className="space-y-3">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.title}
                      className="transition-transform duration-200 hover:scale-[1.02]"
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl",
                            item.bgColor,
                            item.color
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl">
                <CardContent className="relative p-6">
                  <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-indigo-500/30 blur-3xl" />
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-sky-500/30 blur-2xl" />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-white/15">
                        <IconSolarElectricity className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Solar System</p>
                        <p className="text-xs uppercase tracking-wider opacity-70">
                          Enterprise v2.0
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed opacity-90">
                      Manage your solar operations efficiently. Track inquiries,
                      inventory, and projects in one place.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </ProtectedRoute>
  );
}
