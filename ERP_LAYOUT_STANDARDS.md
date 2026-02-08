# ERP-Level Layout Standards

This document outlines the standardized layout and component sizing for the Solar Management System to maximize space utilization and handle large numbers of fields and data.

## Design System (Tailwind + shadcn)

The app uses **Tailwind CSS v4** and **shadcn-ui** (radix-nova style) for layout and UI. Karebo-style layout conventions apply:

- **Container**: Use `@/components/container` for page content: `className="container mx-auto max-w-screen-2xl px-4 md:px-0"` (or pass custom `className` via `cn()`).
- **Spacing**: Prefer Tailwind spacing: `space-y-4`, `gap-4`, `p-4`, `mb-4`, etc.
- **Typography**: Use utility classes: `text-2xl font-bold` for titles, `text-sm text-muted-foreground` for descriptions, `text-xs font-semibold uppercase tracking-widest text-muted-foreground` for labels.
- **UI components**: Use `@/components/ui/*` (Button, Input, Label, Card, Dialog, Select, Badge, etc.) and `@/lib/utils` (`cn()`) for class merging.
- **Icons**: Use `@tabler/icons-react`; map names via `@/utils/iconMapper` (`getIcon(name)`).
- **Toasts**: Toasts appear **top-right**. Colors: **Green = success**, **Red = error**, **Yellow = warning**. Use the central utility `@/utils/toast`: `toastSuccess(message)`, `toastError(message)`, `toastWarning(message)`, `toastInfo(message)`. For API errors use `toastErrorFromApi(error, fallback)`. Toaster is in `@/components/providers` (Sonner with `position="top-right"` and `richColors`).
- **Confirmation dialogs**: Critical actions (delete, approve, reject, unapprove, post, receive) must show an **AlertDialog** confirmation before performing the action. Use `@/components/ui/alert-dialog` (AlertDialog, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction). Do **not** use native `confirm()` or `window.confirm()` for these actions.
- **Dashboard layout**: Sidebar + Header + main content use `@/components/layout/DashboardLayout`, `Sidebar`, `Header`; main content area uses `bg-content flex-1 overflow-y-auto py-2 lg:px-4`.

Existing pages may still use MUI during migration; new or converted pages should use Tailwind + shadcn only.

**Phase 5 (MUI removal):** Do **not** remove `@mui/material`, `@mui/icons-material`, `@emotion/react`, or `@emotion/styled` from `package.json` until no file in `src/` imports them. After full migration of all forms and list views to Tailwind + common/ui components, run a search for `from "@mui` in `src/`; when zero matches remain, remove those dependencies and run `npm install`. `src/theme.js` has been deleted (unused). **BottomBar** has been restyled with Tailwind and no longer uses MUI; it is not currently rendered in the dashboard layout but is available if needed.

## Global Theme Updates (legacy MUI)

### Default Component Sizes
All form components now default to `size="small"`:
- `TextField` - Small by default
- `FormControl` - Small by default
- `Select` - Small by default
- `Button` - Small by default
- `Chip` - Small by default
- `IconButton` - Small by default

### Typography
- Reduced font sizes for compact display:
  - `h5`: 1.25rem (was larger)
  - `h6`: 1.1rem (was larger)
  - `body1`: 0.875rem
  - `body2`: 0.8125rem
  - Form inputs: 0.875rem
  - Helper text: 0.75rem

### Spacing Standards
- **Grid spacing**: Use `COMPACT_FORM_SPACING` (from `@/utils/formConstants`) instead of `spacing={2}` or `spacing={3}`
- **Paper/Box padding**: Use `FORM_PADDING` or `p: 1.5` instead of `p: 2` or `p: 3`
- **Margins**: Use `COMPACT_SECTION_GAP_TOP` / `COMPACT_SECTION_GAP_BOTTOM` for section gaps; avoid large `mt`/`mb` (e.g. prefer 1 over 2 or 3)
- **Gaps**: Use `COMPACT_FORM_SPACING` or `gap: 1` instead of `gap: 2`

### Compact form standard
All forms with multiple sections should use:
- **FormGrid** (`@/components/common/FormGrid`) for field layout: responsive grid with `gap-2`; 1 col mobile, 2 cols md, 3 cols lg. Or use Tailwind `grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- **FormSection** (`@/components/common/FormSection`) for section blocks: pass `title` and children; uses **COMPACT_SECTION_HEADER_CLASS** from `@/utils/formConstants` for the section header (Tailwind class: bg #f5f5f5, compact padding, rounded top). Legacy: **COMPACT_SECTION_HEADER_STYLE** (sx object) is kept for gradual migration but new code should use COMPACT_SECTION_HEADER_CLASS or FormSection.
- **COMPACT_FORM_SPACING** (1) when using MUI Grid during migration; prefer FormGrid for new code.
- No hardcoded `spacing={2}` or large `mt`/`mb`; use `@/utils/formConstants` or FormGrid/FormSection.

### Standard form structure (Tailwind + common components only)
All add and edit form pages must use the same structure and design:

1. **Page (add/edit)**: Use **AddEditPageShell** (`@/components/common/AddEditPageShell`) with `title`, `listHref`, `listLabel`, and the form as `children`. No MUI Box/Paper/Typography/Stack/Button in the page shell.
2. **Form component**: Use **FormContainer** as root; inside the scrollable area, a `<form>` with `onSubmit`; one or more **FormSection** + **FormGrid** for layout; fields from `@/components/common` only (Input, Select, DateField, AutocompleteField, SearchInput, Checkbox, FormField); **FormActions** as sibling with Cancel + Submit using `Button` from `@/components/ui`.
3. **Section headers**: Use **COMPACT_SECTION_HEADER_CLASS** from `@/utils/formConstants` (Tailwind class) or **FormSection** with a `title` prop. Do not use `sx={COMPACT_SECTION_HEADER_STYLE}` in new code; use the class for Tailwind-only layout.
4. **Loading/error**: Use **Loader** from `@/components/common` for loading; use Tailwind + destructive color for server/validation errors (no MUI CircularProgress or Alert).
5. **Icons**: Use `@tabler/icons-react` only (e.g. IconHome, IconList) in form and shell code.

### Add/Edit page shell
All add and edit pages that render a form must use **AddEditPageShell**:
- Import: `import AddEditPageShell from "@/components/common/AddEditPageShell";`
- Usage: `<AddEditPageShell title="Add New Inquiry" listHref="/inquiry" listLabel="Inquiry">{formComponent}</AddEditPageShell>`
- AddEditPageShell renders: Container (flex flex-col gap-4), header (h1 + Home button + List button using `@/components/ui` Button and `@tabler/icons-react`), then children. Form component rendered directly as children; no extra Paper/Box wrapper unless the form needs a Card.

### Listing pages and tables
All listing pages and tables use compact ERP style:
- **Listing page header**: Same pattern as add/edit (Box, Typography h5, optional actions). Use **LIST_HEADER_MB** (1) for margin below header; do not use `fontWeight: 700` on the title.
- **TableLayout**: Uses LIST_HEADER_MB and compact title (no bold).
- **PaginatedTable / PaginatedList**: Use **TABLE_SEARCH_PADDING** and **TABLE_PAGINATION_PADDING** (1) for search bar and pagination bar; TableContainer uses thin scrollbar (6px) to match FormContainer.
- Theme: MuiTableCell head padding 8px 12px; MuiTablePagination compact padding.

### Minimum page padding
- **AppLayout** main content uses **PAGE_PADDING** (1) from `@/utils/formConstants` for `p` and `pb`, so all listing and form pages have minimum padding.
- Avoid extra `p: 2` or `p: 3` on page-level wrappers unless needed; use PAGE_PADDING or FORM_PADDING.

### Listing with filters and details
For listing pages that need URL-synced filters and view-details-on-click:
- **useListingQueryState** (`@/hooks/useListingQueryState`): Use for URL-driven state: `page`, `limit`, `q`, `sortBy`, `sortOrder`, and configurable `filterKeys`. Filters are shareable and browser back/forward work.
- **ListingPageContainer** (`@/components/common/ListingPageContainer`): Common shell with header (title + Add), optional FilterBar, and main content slot. Use **PAGE_PADDING** and **LIST_HEADER_MB**.
- **FilterBar** (`@/components/common/FilterBar`): Config-driven filters (search, text, date, select) with `filterConfig`, `values`, and `onChange`; optional "Clear filters". Use **TABLE_SEARCH_PADDING** and **COMPACT_FORM_SPACING**.
- **DetailsSidebar** (`@/components/common/DetailsSidebar`): Right-hand MUI Drawer for view-on-click. Page owns sidebar state and content; move existing View Dialog content into sidebar children. Width ~360–400px on desktop; **FORM_PADDING** inside.
- **PaginatedTable** in controlled mode: Pass `page`, `limit`, `q`, `sortBy`, `sortOrder`, `filterParams`, and callbacks `onPageChange`, `onRowsPerPageChange`, `onQChange`, `onSortChange`. Add **onRowClick(row)** for view-on-click; set **showSearch={false}** when search is in FilterBar.
- **Table height**: Use `height="calc(100vh - 200px)"` (or ~180–200px offset) so the table body scrolls and shows maximum rows. Use **PaginationControls** (optional) below the table for a compact "Showing X to Y of Z" + Previous/Next + rows-per-page when pagination is outside the table.
- **Actions column**: In **PaginatedTable**, the column with `isActionColumn: true` (or `field === "actions"`) is always sticky when the table has horizontal overflow: sticky on the **left** when it is the first column (e.g. Inquiry, Inventory Ledger) and sticky on the **right** when it is the last column (e.g. Supplier, Product), so Edit/Delete/View stay visible while scrolling.

### FormContainer Component
- Maximized height: `calc(100vh - 180px)` (reduced from 250px)
- Compact padding: `p: 1.5`
- Thinner scrollbar: 6px (was 8px)

### FormActions Component
- Compact padding: `p: 1.5`
- Compact gap: `gap: 1.5`

### Dialog / modal sizing
Form modals (Add/Edit in dialogs) must use viewport-relative sizing so all fields are visible and pop-ups scale with screen size. Use the constants from `@/utils/formConstants` on `DialogContent`:

- **DIALOG_FORM_XL**: Forms with tables or many rows (e.g. Bill of Material Add/Edit). Use `className={DIALOG_FORM_XL}`. Largest viewport usage (`max-h-[95vh]`, wide breakpoints up to `2xl:max-w-[90vw]`).
- **DIALOG_FORM_LARGE**: Forms with many fields (e.g. Product, Stock Adjustment Add). Use `className={DIALOG_FORM_LARGE}`.
- **DIALOG_FORM_MEDIUM**: Forms with a moderate number of fields (e.g. User, Supplier, Project Price). Use `className={DIALOG_FORM_MEDIUM}`.
- **DIALOG_FORM_SMALL**: Confirmations and short forms (e.g. Approve, Receive, Delete). Use `className={DIALOG_FORM_SMALL}`.

All dialog size constants use viewport-relative max-width (`max-w-[95vw]` on small screens, then `sm:`/`lg:`/`xl:` breakpoints) and `max-h-[90vh]` (or `max-h-[95vh]` for XL, `max-h-[85vh]` for small). Use a **scrollable body** (e.g. a div with `flex-1 min-h-0 overflow-y-auto` wrapping the form) so the header stays fixed and only the form content scrolls; use a **sticky DialogFooter** for long forms so Cancel/Save stay visible when needed.

## Best Practices for New Forms

### 1. Use FormContainer
```jsx
import FormContainer, { FormActions } from "@/components/common/FormContainer";

<FormContainer>
  <Box sx={{ p: 1.5 }}>
    {/* Your form content */}
  </Box>
  <FormActions>
    <Button>Cancel</Button>
    <Button type="submit">Save</Button>
  </FormActions>
</FormContainer>
```

### 2. Grid Spacing
```jsx
// ✅ Correct - Compact spacing (use formConstants)
import { COMPACT_FORM_SPACING } from "@/utils/formConstants";
<Grid container spacing={COMPACT_FORM_SPACING}>
  <Grid item size={{ xs: 12, md: 4 }}>
    <Input name="field" label="Field" />
  </Grid>
</Grid>

// ❌ Avoid - Hardcoded or large spacing
<Grid container spacing={2}>
  ...
</Grid>
```

### 3. Paper/Box Padding
```jsx
// ✅ Correct - Compact padding
<Paper sx={{ p: 1.5, mb: 1.5 }}>
  {/* Content */}
</Paper>

// ❌ Avoid - Large padding
<Paper sx={{ p: 2, mb: 2 }}>
  {/* Content */}
</Paper>
```

### 4. Form Fields - Use Standardized Components Only

**IMPORTANT:** All form fields must use components from `@/components/common`. Do not use raw MUI or raw `@/components/ui` primitives (Input, Select) for form fields.

**Allowed in forms:** From `@/components/common`: Input, Select, MenuItem, DateField, AutocompleteField, SearchInput, FormField, FormContainer, FormActions, FormSection, FormGrid, Checkbox, Loader, AddEditPageShell. From `@/components/ui`: Button, Card, Dialog, Label, Badge, Tabs (where no common wrapper exists—prefer common for fields). From `@/utils/formConstants`: COMPACT_SECTION_HEADER_CLASS, spacing/gap/field size classes. Icons: `@tabler/icons-react`.

**Not allowed in forms:** `@mui/material` (Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText, Checkbox, FormControlLabel, Grid, Stack, Paper, etc.). `@mui/icons-material`. Raw `@/components/ui/input` or `@/components/ui/select` for form fields (use common/Input, common/Select instead).

### 5. Required field indicators

Required fields must show a **single red asterisk** (`*`) next to the label. Do not put asterisks in the label text (e.g. `"Name *"` or `"Name **"`).

- **Common components** (Input, Select, DateField, AutocompleteField, Checkbox): Pass `required` and use a plain label (e.g. `label="Customer Name"`). The component renders the red asterisk via `text-destructive` when `required` is true.
- **MUI forms** (during migration): Use a red asterisk in the label, e.g. `<InputLabel>Document Type <Box component="span" sx={{ color: "error.main" }}>*</Box></InputLabel>`, and keep the label text without an asterisk.

```jsx
// ✅ Correct - required prop, no asterisk in label
<Input name="customer_name" label="Customer Name" required value={value} onChange={onChange} />
<Select name="branch_id" label="Branch" required value={value} onChange={onChange}>...</Select>

// ❌ Avoid - asterisk in label string
<Input name="customer_name" label="Customer Name *" ... />
<Select name="branch_id" label="Branch **" ... />
```

```jsx
// ✅ Correct - Use standardized components from common
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import SearchInput from "@/components/common/SearchInput";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";

<Input
  name="field_name"
  label="Field Label"
  value={value}
  onChange={handleChange}
  error={!!errors.field_name}
  helperText={errors.field_name}
/>

<Select
  name="field_name"
  label="Select Option"
  value={value}
  onChange={handleChange}
  error={!!errors.field_name}
  helperText={errors.field_name}
>
  <MenuItem value="option1">Option 1</MenuItem>
</Select>

<DateField
  name="date_field"
  label="Date"
  value={dateValue}
  onChange={handleChange}
/>

// ❌ Avoid - Don't use raw MUI components
<TextField fullWidth size="small" />
<FormControl fullWidth>
  <InputLabel>Select Option</InputLabel>
  <Select>...</Select>
</FormControl>
```

### 5. Button Standardization

Use **one** Button API: `@/components/ui/button` (shadcn-style CVA). Do not use MUI Button or IconButton on ERP screens.

**ERP default size:** Use `size="sm"` for form and table actions (Cancel, Save, Export, Add). Use `size="icon"` or `size="icon-sm"` for icon-only buttons (row actions, dialog close).

**Variants and when to use:**

| Variant | Usage | Examples |
|---------|--------|----------|
| **default** (primary) | Single main CTA per form or dialog | Save, Submit, Create, Update |
| **outline** (secondary) | Cancel, Back, neutral escape | Cancel, Back, Close, Export, Reset |
| **destructive** | Destructive confirmation | Delete, Remove (confirm in AlertDialog) |
| **success** | Positive workflow confirmation | Approve, Receive, Post |
| **ghost** | Tertiary / inline / table actions | View, Edit, Delete (icon), row actions, dialog close (X) |
| **link** | Low emphasis, in-text | Table cell links, "Learn more" |

**Loading state:** Use the `loading` prop for submit/async actions. When `loading={true}`, the button shows a spinner, is disabled, and keeps the label (e.g. "Save" or "Approve"). Do not use text-only loading ("Saving...") without the spinner.

**Icon rules:** Icon + label: use `size="sm"` and rely on CVA gap; put icon left of label. Icon-only: use `variant="ghost"` and `size="icon"` or `size="icon-sm"`. For destructive row action (e.g. Delete icon), use `variant="ghost"` with `className="text-destructive hover:text-destructive"` or the destructive variant as appropriate.

**Consistency checklist:** Same action type must use the same variant and size everywhere (e.g. all Cancel = outline sm; all Save = default sm; all Delete confirm = destructive sm). Dialog footer: Cancel = outline sm, Submit/Save = default sm with `loading` when submitting. Table header: Add = default sm with icon; Export = outline sm with icon.

```jsx
// ✅ Form/dialog footer
<Button type="button" variant="outline" size="sm">Cancel</Button>
<Button type="button" size="sm" loading={submitting}>Save</Button>

// ✅ Success action (Approve, Receive, Post)
<Button variant="success" size="sm" loading={approving} onClick={handleApprove}>Approve</Button>

// ✅ Destructive confirm
<AlertDialogAction variant="destructive" size="sm" onClick={handleDeleteConfirm} disabled={deleting}>Delete</AlertDialogAction>

// ✅ Icon-only (row action, dialog close)
<Button variant="ghost" size="icon-sm" aria-label="close" onClick={onClose}><IconX className="size-4" /></Button>
```

## Space Maximization

### Layout Padding
- Main content area: `p: 1.5` (reduced from `p: 2`)
- Form containers: `p: 1.5`
- Dialog content: Compact padding

### Table Cells
- Compact padding: `8px 16px`
- Smaller font: `0.875rem`

### Scrollbars
- Thinner: 6px width (was 8px)
- More space for content

## Migration Guide

### For Existing Forms

1. **Replace TextField with Input**:
   ```jsx
   // Change from:
   <TextField fullWidth size="small" name="field" label="Field" />
   // To:
   import Input from "@/components/common/Input";
   <Input name="field" label="Field" />
   ```

2. **Replace FormControl + Select with Select component**:
   ```jsx
   // Change from:
   <FormControl fullWidth size="small" error={!!errors.field}>
     <InputLabel>Field</InputLabel>
     <Select name="field" value={value} onChange={handleChange} label="Field">
       <MenuItem value="option1">Option 1</MenuItem>
     </Select>
     {errors.field && <FormHelperText>{errors.field}</FormHelperText>}
   </FormControl>
   // To:
   import Select from "@/components/common/Select";
   <Select
     name="field"
     label="Field"
     value={value}
     onChange={handleChange}
     error={!!errors.field}
     helperText={errors.field}
   >
     <MenuItem value="option1">Option 1</MenuItem>
   </Select>
   ```

3. **Replace date TextField with DateField**:
   ```jsx
   // Change from:
   <TextField type="date" fullWidth InputLabelProps={{ shrink: true }} />
   // To:
   import DateField from "@/components/common/DateField";
   <DateField name="date" label="Date" />
   ```

4. **Replace search TextField with SearchInput**:
   ```jsx
   // Change from:
   <TextField
     size="small"
     placeholder="Search..."
     InputProps={{ startAdornment: <SearchIcon /> }}
   />
   // To:
   import SearchInput from "@/components/common/SearchInput";
   <SearchInput placeholder="Search..." />
   ```

5. **Update Grid spacing**:
   ```jsx
   // Change from:
   <Grid container spacing={2}>
   // To:
   import { COMPACT_FORM_SPACING } from "@/utils/formConstants";
   <Grid container spacing={COMPACT_FORM_SPACING}>
   ```

6. **Update Paper/Box padding**:
   ```jsx
   // Change from:
   <Paper sx={{ p: 2 }}>
   // To:
   import { FORM_PADDING } from "@/utils/formConstants";
   <Paper sx={{ p: FORM_PADDING }}>
   ```

## Standardized Component Library

All form components have been standardized to ensure consistent heights, widths, and styling. See `src/components/common/README.md` for complete documentation.

### Available Components
- **AddEditPageShell** - Standard shell for add/edit pages (Container + title + Home/List buttons)
- **FormContainer** / **FormActions** - Scrollable form area + sticky action buttons
- **FormSection** - Section block with title using COMPACT_SECTION_HEADER_CLASS
- **FormGrid** - Responsive grid for fields (gap-2, 1/2/3 cols)
- **Input** - Standardized text input (40px height)
- **Select** / **MenuItem** - Standardized dropdown (40px height)
- **DateField** - Standardized date input (40px height)
- **SearchInput** - Standardized search input with icon
- **AutocompleteField** - Standardized autocomplete (40px height)
- **Checkbox** - Standardized checkbox with label, error, helperText
- **FormField** - Base wrapper for consistent field styling

### Component Standards
- **Height:** All components use 40px height for small size (default)
- **Border Radius:** 6px for all inputs
- **Font Size:** 0.875rem (14px) for input text and labels
- **Helper Text:** 0.75rem (12px)
- **Width:** `fullWidth` by default (can be overridden)

## Form Constants Utility

Use the constants file for consistency. Prefer Tailwind class **COMPACT_SECTION_HEADER_CLASS** for section headers in new code.
```jsx
import { 
  PAGE_PADDING,
  LIST_HEADER_MB,
  TABLE_SEARCH_PADDING,
  TABLE_PAGINATION_PADDING,
  COMPACT_FORM_SPACING,
  COMPACT_SECTION_HEADER_CLASS,
  COMPACT_SECTION_HEADER_STYLE,
  COMPACT_SECTION_GAP_TOP,
  COMPACT_SECTION_GAP_BOTTOM,
  FORM_PADDING, 
  FORM_SPACING,
  FIELD_SIZE,
  FIELD_HEIGHT_SMALL,
  FIELD_HEIGHT_CLASS_SMALL,
  FIELD_TEXT_SMALL,
  FIELD_BORDER_RADIUS 
} from "@/utils/formConstants";

// Page/layout (Tailwind)
<div className={cn("p-" + PAGE_PADDING)}>...</div>
<h1 className="text-2xl font-bold mb-2">List Title</h1>

// Forms - section header (Tailwind class)
<div className={COMPACT_SECTION_HEADER_CLASS}>Section Name</div>
// Or use FormSection: <FormSection title="Section Name">...</FormSection>

// Forms - grid: use FormGrid or grid + gap-2
<FormGrid><Input name="field" label="Field" /></FormGrid>
```

## Benefits

1. **More Fields Visible**: Compact spacing allows more fields on screen
2. **Better Data Density**: Smaller components show more information
3. **Consistent UX**: Standardized sizing across all forms
4. **Professional ERP Look**: Compact, data-dense layout typical of ERP systems
5. **Better Scrolling**: Thinner scrollbars and optimized heights

## Component Standardization Benefits

1. **Consistent Heights:** All form fields are exactly 40px tall (small size)
2. **Unified Styling:** Same border radius (6px), font sizes, and spacing
3. **Simplified API:** No need to wrap Select in FormControl manually
4. **Better Error Handling:** Standardized error display across all components
5. **Easier Maintenance:** Single source of truth for component styling

## Notes

- **Always use standardized components** - Don't use raw MUI TextField, Select, etc.
- All standardized components default to `fullWidth={true}` and `size="small"`
- Can override defaults when needed (e.g., `size="medium"` for important buttons)
- Theme changes apply globally to all components
- See `src/components/common/README.md` for complete component documentation

