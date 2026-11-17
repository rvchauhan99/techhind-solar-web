"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import Textarea from "@/components/common/Textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * HTML letter/template body with insert-token chips + live preview.
 * Dense CRM chrome — no CKEditor dependency.
 */
export default function HtmlTemplateField({
  name = "content",
  label = "Content",
  value = "",
  onChange,
  placeholders = {},
  error = false,
  helperText = null,
  required = false,
  disabled = false,
  minRows = 10,
  className,
}) {
  const ref = useRef(null);
  const tokens = useMemo(() => Object.keys(placeholders || {}), [placeholders]);

  const insertToken = (token) => {
    if (disabled) return;
    const el = ref.current;
    const current = value == null ? "" : String(value);
    if (!el || typeof el.selectionStart !== "number") {
      onChange?.({ target: { name, value: `${current}${token}` } });
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = current.slice(0, start) + token + current.slice(end);
    onChange?.({ target: { name, value: next } });
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch {
        /* ignore */
      }
    });
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <Textarea
        ref={ref}
        name={name}
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        minRows={minRows}
        placeholder="HTML body with {placeholders}"
      />
      {tokens.length > 0 ? (
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Insert placeholder
          </Label>
          <div className="flex flex-wrap gap-1">
            {tokens.map((token) => (
              <Button
                key={token}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs font-mono"
                disabled={disabled}
                title={placeholders[token] || token}
                onClick={() => insertToken(token)}
              >
                {token}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Preview</Label>
        <div
          className="min-h-[120px] max-h-[280px] overflow-auto rounded-md border bg-muted/30 px-3 py-2 text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: value?.trim()
              ? String(value)
              : "<p class='text-muted-foreground'>Nothing to preview yet.</p>",
          }}
        />
      </div>
    </div>
  );
}
