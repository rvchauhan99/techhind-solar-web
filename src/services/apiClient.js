// Re-export global axios instance. Use @/lib/api/axios for new imports.
// Use this for all protected API calls so the Bearer token is sent (client-side only; server-side must forward token if needed).
export { default } from "@/lib/api/axios";
export { getAssetBaseUrl, resolveDocumentUrl } from "@/lib/api/axios";
