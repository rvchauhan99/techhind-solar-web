"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getIcon } from "@/utils/iconMapper";
import { IconArrowRight, IconCircle, IconApps, IconSearch } from "@tabler/icons-react";

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function flattenLeafModules(items, parents = []) {
  const result = [];
  if (!items?.length) return result;
  for (const item of items) {
    const pathNames = [...parents, item.name].filter(Boolean);
    if (item.submodules?.length) {
      result.push(...flattenLeafModules(item.submodules, pathNames));
      continue;
    }
    if (item.route) {
      result.push({
        id: item.id,
        name: item.name,
        route: item.route,
        icon: item.icon,
        group: parents[0] || null,
      });
    }
  }
  return result;
}

export default function HomeLandingPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeState, setTimeState] = useState({ date: "", time: "" });

  useEffect(() => {
    setMounted(true);
    
    // Set initial time
    const updateTime = () => {
      const now = new Date();
      setTimeState({
        date: now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        time: now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      });
    };
    
    updateTime();
    // Optional: update time every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => getGreeting(), []);
  const displayName = user?.name?.trim() || user?.email || "there";
  const roleName = user?.role?.name || null;

  const allQuickLinks = useMemo(() => {
    const leaves = flattenLeafModules(user?.modules || []);
    return leaves;
  }, [user?.modules]);

  const quickLinks = useMemo(() => {
    if (!searchQuery.trim()) return allQuickLinks;
    const lowerQuery = searchQuery.toLowerCase();
    return allQuickLinks.filter(
      (link) =>
        link.name.toLowerCase().includes(lowerQuery) ||
        link.group?.toLowerCase().includes(lowerQuery)
    );
  }, [allQuickLinks, searchQuery]);

  if (loading && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-x-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute top-[5%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#1b365d]/[0.03] blur-[100px] pointer-events-none" />
      
      <div className="relative mx-auto max-w-[1440px] px-6 py-10 md:py-16 space-y-12">
        {/* Header Section */}
        <header className={`transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm shadow-primary/5">
                <span className="text-xs font-bold tracking-widest text-primary uppercase">
                  {roleName ? `${roleName} Workspace` : "Workspace"}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {greeting}, <span className="text-primary">{displayName}</span> <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
              </h1>
              <p className="text-base text-slate-600 max-w-2xl leading-relaxed font-medium">
                Welcome to your personalized dashboard. Access your authorized modules seamlessly below.
              </p>
            </div>
            
            <div className={`hidden md:flex flex-col items-end transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-3xl font-light text-slate-800 tracking-tight">
                {timeState.time}
              </div>
              <div className="text-sm font-medium text-slate-500 mt-1">
                {timeState.date}
              </div>
            </div>
          </div>
        </header>

        {/* Quick Access Section */}
        <section className={`transition-all duration-700 ease-out delay-150 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-primary shadow-sm border border-slate-100">
                <IconApps size={22} stroke={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Quick Access
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {allQuickLinks.length} available module{allQuickLinks.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            
            {allQuickLinks.length > 0 && (
              <div className="relative group max-w-sm w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <IconSearch size={18} stroke={1.5} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-72 pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {allQuickLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/60 backdrop-blur-md border border-slate-200 border-dashed rounded-[2rem]">
              <div className="w-20 h-20 mb-6 rounded-full bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100">
                <IconCircle size={32} stroke={1.5} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No modules available</h3>
              <p className="text-sm text-slate-500 max-w-sm text-center font-medium leading-relaxed">
                You don't have access to any modules yet. Please contact your system administrator to assign roles and modules.
              </p>
            </div>
          ) : quickLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/40 rounded-3xl border border-slate-100">
              <p className="text-slate-500 font-medium mb-3">No modules found matching "<span className="text-slate-800">{searchQuery}</span>"</p>
              <button 
                onClick={() => setSearchQuery("")}
                className="text-sm text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {quickLinks.map((item, index) => {
                const IconComponent = getIcon(item.icon) || IconCircle;
                const delay = Math.min(index * 30, 400); // Staggered animation delay
                
                return (
                  <Link
                    key={`${item.id || item.route}-${item.name}`}
                    href={item.route}
                    style={{ transitionDelay: `${mounted ? delay : 0}ms` }}
                    className={`group relative flex flex-col p-5 bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,130,59,0.12)] rounded-[1.25rem] hover:-translate-y-1.5 transition-all duration-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-primary/0 via-primary/0 to-primary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative flex items-start justify-between mb-5">
                      <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-slate-50 text-slate-600 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-110 transition-all duration-300">
                        <IconComponent size={24} stroke={1.5} />
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover:bg-primary/10 transition-colors duration-300">
                        <IconArrowRight size={18} stroke={2} className="text-slate-300 group-hover:text-primary transform -translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                      </div>
                    </div>
                    
                    <div className="relative mt-auto">
                      <h3 className="text-[15px] font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      {item.group && (
                        <p className="text-xs font-medium text-slate-400 mt-1.5 line-clamp-1 group-hover:text-slate-500 transition-colors">
                          {item.group}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
