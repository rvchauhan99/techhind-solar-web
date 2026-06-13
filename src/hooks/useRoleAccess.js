"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isRoleAllowedByKey } from "@/lib/platformRoleAccess";

export function useRoleAccess(configKey) {
  const { user, rbacConfigs } = useAuth();
  const roleName = user?.role?.name;

  return useMemo(
    () => isRoleAllowedByKey(roleName, rbacConfigs, configKey),
    [roleName, rbacConfigs, configKey]
  );
}
