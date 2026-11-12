"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

function findModule(modules, key) {
  for (const m of modules || []) {
    if (!m) continue;
    if (m.key === key) return m;
    if (m.submodules?.length) {
      const hit = findModule(m.submodules, key);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Resolve a module's permission (can_create/read/update/delete) by module key,
 * fetching it once. Replaces per-page findModule + fetchPermissionForModule boilerplate.
 */
export default function useModulePermission(moduleKey) {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModule(user?.modules || [], moduleKey),
    [user?.modules, moduleKey]
  );
  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);
  return modulePermissions?.[permModule?.id] || {};
}
