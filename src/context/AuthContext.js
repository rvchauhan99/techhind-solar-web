// context/AuthContext.js
"use client";

import { createContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/services/apiClient";
import roleModuleService from "@/services/roleModuleService";
import {
  getAccessToken,
  clearTokens,
  getStoredProfile,
  setStoredProfile,
  clearStoredProfile,
} from "@/lib/authStorage";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [modulePermissions, setModulePermissions] = useState({});
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchProfile = async () => {
      // If user is in the middle of first-login password-change flow, skip fetching profile
      try {
        const skip = localStorage.getItem("requirePasswordChange");
        if (skip) {
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore localStorage errors and continue
      }

      const isAuthRoute = pathname?.startsWith("/auth");
      const isAdminRoute = pathname?.startsWith("/admin");

      // Admin UI uses admin API key only; no login required (allows creating first tenant when 0 tenants).
      if (isAdminRoute) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (isAuthRoute) {
        // On auth routes: restore session from token if present
        if (typeof window === "undefined") {
          setLoading(false);
          setUser(null);
          return;
        }
        const accessToken = getAccessToken();
        if (!accessToken) {
          setLoading(false);
          setUser(null);
          return;
        }
        const storedProfile = getStoredProfile();
        if (storedProfile) {
          setUser(storedProfile);
          setLoading(false);
          return;
        }
        try {
          const res = await apiClient.get("/auth/profile");
          if (res?.status && res?.data?.result) {
            const profile = res.data.result;
            setUser(profile);
            setStoredProfile(profile);
          } else {
            setUser(null);
          }
        } catch (err) {
          clearTokens();
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Non-auth routes: use cached profile when token + profile exist; else fetch
      if (typeof window !== "undefined") {
        const accessToken = getAccessToken();
        const storedProfile = getStoredProfile();
        if (accessToken && storedProfile) {
          setUser(storedProfile);
          setLoading(false);
          return;
        }
      }
      try {
        const res = await apiClient.get("/auth/profile");
        if (res?.status && res?.data?.result) {
          const profile = res.data.result;
          setUser(profile);
          setStoredProfile(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [pathname, router]);

  const logout = async () => {
    try {
      await apiClient.get("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearStoredProfile();
      clearTokens();
      setUser(null);
      router.replace("/auth/login");
    }
  };

  // Fetch and cache permission for a module id (idempotent)
  // Memoized to prevent infinite re-renders when used in useEffect dependencies
  const fetchPermissionForModule = useCallback(async (moduleId, force = false) => {
    console.debug(":::::::::::::::::::", moduleId, force);

    if (!moduleId) return null;

    try {
      console.debug(
        "[AuthContext] requesting permission for moduleId",
        moduleId,
        "force=",
        force
      );
      const res = await roleModuleService.getPermissionForModule(moduleId);
      console.debug(
        "[AuthContext] permission response for moduleId",
        moduleId,
        res
      );
      const payload = res?.result || res?.data || res;
      const perms = payload
        ? {
          can_create: !!payload.can_create,
          can_read: !!payload.can_read,
          can_update: !!payload.can_update,
          can_delete: !!payload.can_delete,
        }
        : {
          can_create: false,
          can_read: false,
          can_update: false,
          can_delete: false,
        };
      setModulePermissions((s) => ({ ...s, [moduleId]: perms }));
      return perms;
    } catch (err) {
      console.error("[AuthContext] fetchPermissionForModule error", err);
      // on error, return false perms but mark as error response so it can be retried
      const perms = {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
        _isErrorResponse: true, // Mark this as an error response so it won't be cached permanently
      };
      // Don't cache error responses - allow retry on next navigation
      // setModulePermissions((s) => ({ ...s, [moduleId]: perms }));
      return perms;
    }
  }, []); // Empty dependency array - function doesn't depend on any changing values

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        setUser,
        loading,
        modulePermissions,
        currentModuleId,
        setCurrentModuleId,
        fetchPermissionForModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
