"use client";

import React, { useState } from "react";
import {
  IconCopy,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";

/* ─── Helpers ─────────────────────────────────────────────── */

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
        ? f.values
            .filter((v) => v != null && String(v).trim() !== "")
            .join(", ")
        : "";
      return { label, value };
    })
    .filter((r) => r.value);
}


const STANDARD_KEYS = new Set([
  "email",
  "full_name",
  "phone_number",
  "phone",
  "mobile_number",
  "city",
  "first_name",
  "last_name",
  "company_name",
  "company",
  "zip_code",
  "pin_code",
  "post_code",
]);

function isSurveyQuestion(label, key) {
  const k = String(key || label || "").toLowerCase().trim();
  if (STANDARD_KEYS.has(k)) return false;
  return (
    label.includes("?") ||
    label.includes("શું") ||
    label.includes("તમારે") ||
    label.includes("તમારું") ||
    label.includes("કેટલો") ||
    label.includes("કયો") ||
    label.includes("જણાવો") ||
    label.includes("આપો") ||
    label.length > 15
  );
}



/* ─── Copy-to-clipboard button ──────────────────────────── */
function CopyBtn({ text, id, copiedKey, onCopy }) {
  const copied = copiedKey === id;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCopy(text, id);
      }}
      className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <IconCheck className="size-3.5 text-green-500" />
      ) : (
        <IconCopy className="size-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function FacebookLeadDetailsSection({ lead }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const tags = normalizeTags(lead?.tags);
  if (!tags?.fb_lead_id) return null;

  const responses = getFormResponses(tags);

  const surveyQAs = responses.filter((r) => isSurveyQuestion(r.label, r.key));

  if (surveyQAs.length === 0) return null;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-xl border border-blue-100/80 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/60 via-white to-white dark:from-blue-950/10 dark:via-zinc-900 dark:to-zinc-900 shadow-sm overflow-hidden">
      <div className="p-3 space-y-3">
        {/* ── Pre-Screening Survey Q&As ─────────────────────── */}
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-blue-200/60 to-transparent dark:from-blue-900/30" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-600/70 dark:text-blue-400/60 whitespace-nowrap">
                Pre-Screening Survey ({surveyQAs.length})
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-blue-200/60 to-transparent dark:from-blue-900/30" />
            </div>

            {/* Grid of Q&A cards — 1 col */}
            <div className="grid grid-cols-1 gap-2">
              {surveyQAs.map((row, idx) => {
                const val = String(row.value).trim();
                const isYes =
                  val.startsWith("હા") ||
                  val.toLowerCase() === "yes" ||
                  val.startsWith("Yes");
                const isNo =
                  val.startsWith("ના") ||
                  val.toLowerCase() === "no" ||
                  val.startsWith("No");

                let bubbleCls =
                  "bg-blue-50/60 border-blue-100 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-200";
                let icon = null;

                if (isYes) {
                  bubbleCls =
                    "bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300";
                  icon = (
                    <IconCircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  );
                } else if (isNo) {
                  bubbleCls =
                    "bg-rose-50 border-rose-100 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-300";
                  icon = (
                    <IconCircleX className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  );
                }

                return (
                  <div
                    key={`${row.label}-${idx}`}
                    className="rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-2.5 space-y-1.5 hover:border-blue-100 dark:hover:border-zinc-700/50 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Question row */}
                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100/60 dark:border-blue-900/40 flex items-center justify-center text-[8px] font-extrabold text-blue-600/80 dark:text-blue-400">
                        Q
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                        {row.label}
                      </p>
                    </div>

                    {/* Answer bubble */}
                    <div
                      onClick={() => handleCopy(row.value, `qa-${idx}`)}
                      className={`group cursor-pointer rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs font-semibold leading-snug transition-all hover:scale-[1.005] ${bubbleCls}`}
                      title="Click to copy"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {icon}
                        <span className="break-words">{row.value}</span>
                      </div>
                      <CopyBtn
                        text={row.value}
                        id={`qa-${idx}`}
                        copiedKey={copiedKey}
                        onCopy={handleCopy}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </div>
  );
}

export function isFacebookMarketingLead(lead) {
  const tags = normalizeTags(lead?.tags);
  return Boolean(tags?.fb_lead_id);
}

export function hasFacebookSurvey(lead) {
  const tags = normalizeTags(lead?.tags);
  if (!tags?.fb_lead_id) return false;
  const responses = getFormResponses(tags);
  const surveyQAs = responses.filter((r) => isSurveyQuestion(r.label, r.key));
  return surveyQAs.length > 0;
}
