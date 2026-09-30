"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { navigateToList, resolveReturnTo } from "@/utils/listNavigation";

/**
 * Form/detail pages: return to the listing with preserved page/filters via returnTo.
 * @param {string} fallbackPath - e.g. "/purchase-orders"
 */
export function useListReturnNavigation(fallbackPath) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnPath = useMemo(
    () => resolveReturnTo(searchParams, fallbackPath),
    [searchParams, fallbackPath]
  );

  const goToList = useCallback(() => {
    navigateToList(router, {
      fallbackPath,
      returnTo: searchParams.get("returnTo"),
    });
  }, [router, searchParams, fallbackPath]);

  return { goToList, returnPath };
}

export default useListReturnNavigation;
