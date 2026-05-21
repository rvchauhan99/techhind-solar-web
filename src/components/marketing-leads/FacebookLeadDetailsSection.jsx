"use client";

import { Badge } from "@/components/ui/badge";
import { IconBrandFacebook } from "@tabler/icons-react";

function normalizeTags(tags) {
  if (!tags || Array.isArray(tags)) return null;
  if (typeof tags === "object" && tags.fb_lead_id) return tags;
  return null;
}

function getFormResponses(tags) {
  if (!tags) return [];
  if (Array.isArray(tags.form_responses) && tags.form_responses.length > 0) {
    return tags.form_responses;
  }
  const raw = tags.raw_field_data;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      const label = f?.name ? String(f.name).trim() : "Unknown";
      const value = Array.isArray(f?.values)
        ? f.values.filter((v) => v != null && String(v).trim() !== "").join(", ")
        : "";
      return { label, value };
    })
    .filter((r) => r.value);
}

function formatSubmittedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(iso);
  }
}

function MetaCell({ label, value }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs break-words">{value}</p>
    </div>
  );
}

/**
 * Compact Facebook Lead Ads details for marketing lead view / drawers.
 */
export default function FacebookLeadDetailsSection({ lead }) {
  const tags = normalizeTags(lead?.tags);
  if (!tags?.fb_lead_id) return null;

  const responses = getFormResponses(tags);
  const meta = tags.fb_metadata || {};
  const submitted = formatSubmittedAt(tags.fb_created_time);

  return (
    <div className="rounded-md border border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/20 p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="h-5 gap-1 bg-[#1877F2] hover:bg-[#1877F2] text-white text-[10px] px-1.5">
          <IconBrandFacebook className="size-3" />
          Facebook Lead
        </Badge>
        {submitted && (
          <span className="text-[10px] text-muted-foreground">Submitted {submitted}</span>
        )}
        <span className="text-[10px] text-muted-foreground font-mono">ID {tags.fb_lead_id}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <MetaCell label="Page" value={tags.fb_page_name || tags.fb_page_id} />
        <MetaCell label="Form" value={tags.fb_form_name || tags.fb_form_id} />
        <MetaCell label="Ad" value={tags.fb_ad_name || meta.ad_name} />
        <MetaCell label="Campaign" value={tags.fb_campaign_name || meta.campaign_name} />
        <MetaCell label="Platform" value={meta.platform} />
        {meta.is_organic != null && (
          <MetaCell label="Organic" value={meta.is_organic ? "Yes" : "No"} />
        )}
      </div>

      {responses.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Form responses
          </p>
          <div className="border border-border/60 rounded overflow-hidden bg-background/80">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-2 py-1 font-semibold text-muted-foreground w-[40%]">Field</th>
                  <th className="px-2 py-1 font-semibold text-muted-foreground">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {responses.map((row, idx) => (
                  <tr key={`${row.label}-${idx}`} className="align-top">
                    <td className="px-2 py-1 text-muted-foreground whitespace-normal">{row.label}</td>
                    <td className="px-2 py-1 font-medium break-words">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function isFacebookMarketingLead(lead) {
  const tags = normalizeTags(lead?.tags);
  return Boolean(tags?.fb_lead_id);
}
