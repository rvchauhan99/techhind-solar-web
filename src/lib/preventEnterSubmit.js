/**
 * Attach to native `<form>` or MUI `Box component="form"` as `onKeyDown={preventEnterSubmit}`.
 * Blocks implicit form submission from Enter in typical fields; submit via explicit button or
 * `requestSubmit()` only. Honors `defaultPrevented` (e.g. AutocompleteField when list is open).
 */
export function preventEnterSubmit(e) {
  if (e.key !== "Enter" && e.key !== "NumpadEnter") return;
  if (e.defaultPrevented) return;

  const el = e.target;
  if (!el || typeof el !== "object") return;
  if (el.isContentEditable) return;

  const tag = el.tagName;
  if (tag === "TEXTAREA") return;
  if (tag === "SELECT") return;
  if (tag === "BUTTON") return;

  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (
      type === "submit" ||
      type === "button" ||
      type === "reset" ||
      type === "file"
    ) {
      return;
    }
  }

  e.preventDefault();
}

/** When the form root already has `onKeyDown`, merge: run `onKeyDown` first, then blocking logic. */
export function composePreventEnterSubmit(onKeyDown) {
  return (e) => {
    onKeyDown?.(e);
    preventEnterSubmit(e);
  };
}
