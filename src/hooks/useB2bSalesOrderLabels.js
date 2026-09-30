"use client"

import { useEffect, useMemo, useState } from "react"
import {
  DEFAULT_B2B_SO_LABELS,
  buildB2bSalesOrderPhrases,
  fetchB2bSalesOrderLabels,
} from "@/utils/b2bSalesOrderLabels"

export const useB2bSalesOrderLabels = () => {
  const [labels, setLabels] = useState(DEFAULT_B2B_SO_LABELS)

  useEffect(() => {
    let cancelled = false
    fetchB2bSalesOrderLabels().then((next) => {
      if (!cancelled) setLabels(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const phrases = useMemo(() => buildB2bSalesOrderPhrases(labels), [labels])
  return phrases
}
