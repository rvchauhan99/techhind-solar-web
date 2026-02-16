"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { getAllowedRoutes, isPathAllowedByRoutes, normalizePath } from "@/lib/permissionUtils";

/** Set to true to skip frontend module check (only backend will enforce). Revert to false when done testing. */
const SKIP_FRONTEND_MODULE_CHECK = true;

/** Paths that do not require a module permission (always allowed when authenticated). */
const PATH_WHITELIST = new Set(["/", "/home", "/task-planner", "/marketing-leads", "/access-denied"]);

function isPathAllowed(pathname, allowedRoutes) {
  const normalized = normalizePath(pathname);
  if (PATH_WHITELIST.has(normalized)) return true;
  return isPathAllowedByRoutes(pathname, allowedRoutes);
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const pathname = usePathname();
  const { fetchPermissionForModule, setCurrentModuleId } = useAuth();
  const lastFetchedPathnameRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (pathname === lastFetchedPathnameRef.current && authorized) return;
    if (isFetchingRef.current) return;
    if (pathname !== lastFetchedPathnameRef.current) setAuthorized(false);

    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const modules = user?.modules || [];
      const allowedRoutes = getAllowedRoutes(modules);

      if (!SKIP_FRONTEND_MODULE_CHECK && !isPathAllowed(pathname, allowedRoutes)) {
        router.replace("/access-denied");
        setAuthorized(false);
        return;
      }

      isFetchingRef.current = true;

      (async () => {
        try {
          const normalizedPathname = normalizePath(pathname);
          const matchPredicate = (m) => {
            if (!m?.route) return false;
            const normalizedRoute = normalizePath(m.route);
            if (!normalizedRoute) return false;
            return normalizedPathname === normalizedRoute || normalizedPathname.startsWith(normalizedRoute + "/");
          };

          const findModuleRecursive = (list) => {
            for (const mod of list || []) {
              if (matchPredicate(mod)) return mod;
              if (mod.submodules?.length) {
                const found = findModuleRecursive(mod.submodules);
                if (found) return found;
              }
            }
            return null;
          };

          const moduleMatch = findModuleRecursive(modules);
          if (moduleMatch?.id) {
            setCurrentModuleId(moduleMatch.id);
            await fetchPermissionForModule(moduleMatch.id, true);
          } else {
            setCurrentModuleId(null);
          }
        } catch (err) {
          console.error("ProtectedRoute permission fetch error", err);
        } finally {
          lastFetchedPathnameRef.current = pathname;
          isFetchingRef.current = false;
          setAuthorized(true);
        }
      })();
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
