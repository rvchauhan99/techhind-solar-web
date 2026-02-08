"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const pathname = usePathname();
  const { fetchPermissionForModule, setCurrentModuleId } = useAuth();
  // Track the last pathname for which permissions were successfully fetched
  const lastFetchedPathnameRef = useRef(null);
  // Prevent concurrent fetches
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Skip if already fetched for this pathname
    if (pathname === lastFetchedPathnameRef.current && authorized) {
      return;
    }

    // Skip if currently fetching
    if (isFetchingRef.current) {
      return;
    }

    // Reset authorized state when pathname changes to show loading while fetching new permissions
    if (pathname !== lastFetchedPathnameRef.current) {
      setAuthorized(false);
    }

    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
      } else {
        // Before rendering, try to resolve module id from user profile for this route
        isFetchingRef.current = true;

        (async () => {
          try {
            // find module in user.modules by route or key (search recursively through submodules)
            const modules = user?.modules || [];
            const normalizeKeys = (m) => [m.key, m.route];

            const matchPredicate = (m) => {
              if (!m) return false;
              const routeMatch = m.route === pathname;
              const key = m.key || '';
              const keyMatch = key === pathname.replace(/^\//, '') || key === pathname.replace(/\//g, '_') || key === pathname.replace(/\//g, '-');
              return routeMatch || keyMatch;
            };

            const findModuleRecursive = (list) => {
              for (const mod of list || []) {
                if (matchPredicate(mod)) return mod;
                if (mod.submodules && mod.submodules.length) {
                  const found = findModuleRecursive(mod.submodules);
                  if (found) return found;
                }
              }
              return null;
            };

            const moduleMatch = findModuleRecursive(modules);
            if (moduleMatch && moduleMatch.id) {
              console.debug('[ProtectedRoute] module match found for', pathname, '->', moduleMatch);
              setCurrentModuleId(moduleMatch.id);
              // fetch permission once and cache in context (force refresh on route render)
              console.debug('[ProtectedRoute] calling fetchPermissionForModule for moduleId', moduleMatch.id, '(force)');
              await fetchPermissionForModule(moduleMatch.id, true);
            } else {
              console.debug('[ProtectedRoute] no moduleMatch for', pathname, 'user.modules length', modules.length);
              try {
                console.debug('[ProtectedRoute] modules:', modules.map((m) => ({ id: m.id, key: m.key, route: m.route })));
              } catch (e) {
                console.debug('[ProtectedRoute] modules (raw):', modules);
              }
              setCurrentModuleId(null);
            }
          } catch (err) {
            console.error('ProtectedRoute permission fetch error', err);
          } finally {
            // Mark this pathname as successfully fetched
            lastFetchedPathnameRef.current = pathname;
            isFetchingRef.current = false;
            setAuthorized(true);
          }
        })();
      }
    }
  }, [user, loading, router, pathname, fetchPermissionForModule, setCurrentModuleId, authorized]);

  if (loading || !authorized)
    return (
      <div className="flex justify-center items-center h-screen">
        <div
          className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );

  return authorized ? children : null;
}
