import { getReferenceOptionsSearch } from "@/services/mastersService"

export const B2B_SO_LABELS_CONFIG_KEY = "ui.b2b_sales_order.labels"

export const DEFAULT_B2B_SO_LABELS = {
  singular: "Sales Order",
  plural: "Sales Orders",
  short: "SO",
  document_title: "SALES ORDER",
}

export const normalizeB2bSalesOrderLabels = (raw) => {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : DEFAULT_B2B_SO_LABELS
  return {
    singular:
      String(source.singular || DEFAULT_B2B_SO_LABELS.singular).trim() ||
      DEFAULT_B2B_SO_LABELS.singular,
    plural:
      String(source.plural || DEFAULT_B2B_SO_LABELS.plural).trim() ||
      DEFAULT_B2B_SO_LABELS.plural,
    short:
      String(source.short || DEFAULT_B2B_SO_LABELS.short).trim() ||
      DEFAULT_B2B_SO_LABELS.short,
    document_title:
      String(source.document_title || DEFAULT_B2B_SO_LABELS.document_title).trim() ||
      DEFAULT_B2B_SO_LABELS.document_title,
  }
}

export const buildB2bSalesOrderPhrases = (labelsInput) => {
  const labels = normalizeB2bSalesOrderLabels(labelsInput)
  return {
    ...labels,
    menu: `B2B ${labels.plural}`,
    listTitle: `B2B ${labels.plural}`,
    addTitle: `Add B2B ${labels.singular}`,
    addScheduledTitle: `Add Scheduled ${labels.singular}`,
    addScheduledShort: `Add Scheduled ${labels.short}`,
    createScheduledShort: `Create Scheduled ${labels.short}`,
    editTitle: `Edit B2B ${labels.singular}`,
    createdToast: `B2B ${labels.singular} created`,
    createdFromQuoteToast: `B2B ${labels.singular} created from quote`,
    updatedToast: `B2B ${labels.singular} updated`,
    linesReportTitle: `B2B ${labels.singular} Lines Report`,
    linesReportHeader: `${labels.singular} Lines`,
    relatedSection: `Related ${labels.plural}`,
    relatedEmpty: (scope) =>
      `No ${scope ? `${scope} ` : ""}${labels.plural.toLowerCase()} found`,
    convertDialogBody: `This will create a new ${labels.singular.toLowerCase()} from this quote with the selected warehouse and remarks. The quote will be marked as converted.`,
    sourceType: labels.singular,
    serialMasterLabel: `B2BSALESORDER — B2B ${labels.singular}`,
    companyProfileSection: `B2B ${labels.singular.toLowerCase()} PDF contact (optional)`,
    linesReportLoadError: `Failed to load B2B ${labels.singular.toLowerCase()} lines report`,
    scheduledLinkedAlert: (planId) =>
      `Scheduled ${labels.singular} linked to plan #${planId}. Confirming adds this order to`,
    planningHelpSuffix: `Linked ${labels.plural.toLowerCase()} are not`,
  }
}

export const parseB2bSalesOrderLabelsFromConfigRows = (rows) => {
  const row = Array.isArray(rows) ? rows[0] : null
  const raw = row?.config_value ?? row?.value ?? null
  if (raw == null || raw === "") return normalizeB2bSalesOrderLabels(null)
  if (typeof raw === "object") return normalizeB2bSalesOrderLabels(raw)
  try {
    return normalizeB2bSalesOrderLabels(JSON.parse(String(raw)))
  } catch {
    return normalizeB2bSalesOrderLabels(null)
  }
}

export const fetchB2bSalesOrderLabels = async () => {
  try {
    const rows = await getReferenceOptionsSearch("platform_config.model", {
      config_key: B2B_SO_LABELS_CONFIG_KEY,
      is_active: true,
      limit: 1,
    })
    return parseB2bSalesOrderLabelsFromConfigRows(rows)
  } catch {
    return normalizeB2bSalesOrderLabels(null)
  }
}
