# Standardized Form Components Library

This directory contains standardized form components that ensure consistent design, sizing, and behavior across the entire application.

**Rule:** All form fields must use components from `@/components/common`. Do not use raw MUI components or raw `@/components/ui` primitives (Input, Select) for form fields in forms. Use common/Input, common/Select, common/DateField, common/AutocompleteField, common/SearchInput, common/Checkbox, and common/FormField.

## Components

### AddEditPageShell
Standard shell for add and edit form pages. Renders Container, header (title + Home + List buttons), and children.

**Location:** `AddEditPageShell.js`

**Usage:**
```jsx
import AddEditPageShell from "@/components/common/AddEditPageShell";

<AddEditPageShell title="Add New Inquiry" listHref="/inquiry" listLabel="Inquiry">
  <InquiryForm ... />
</AddEditPageShell>
```

**Props:** `title`, `listHref`, `listLabel`, `children`, `className`

### FormSection
Section block for forms. Renders a section title with compact ERP styling (COMPACT_SECTION_HEADER_CLASS) and children.

**Location:** `FormSection.js`

**Usage:**
```jsx
import FormSection from "@/components/common/FormSection";

<FormSection title="Inquiry Details">
  <FormGrid>...</FormGrid>
</FormSection>
```

**Props:** `title`, `children`, `className`

### FormGrid
Responsive grid for form fields. Uses gap-2; 1 col mobile, 2 cols md, 3 cols lg.

**Location:** `FormGrid.js`

**Usage:**
```jsx
import FormGrid from "@/components/common/FormGrid";

<FormGrid>
  <Input name="field1" label="Field 1" ... />
  <Select name="field2" label="Field 2" ... />
</FormGrid>
```

**Props:** `children`, `className`, `cols` (1, 2, or 3, default 3)

### Checkbox
Standardized checkbox with label, error, and helperText. Replaces MUI FormControlLabel + Checkbox.

**Location:** `Checkbox.js`

**Usage:**
```jsx
import Checkbox from "@/components/common/Checkbox";

<Checkbox
  name="do_not_send_message"
  label="Do not send message"
  checked={formData.do_not_send_message}
  onChange={handleChange}
  error={!!errors.do_not_send_message}
  helperText={errors.do_not_send_message}
/>
```

**Props:** `name`, `label`, `checked`, `onChange`, `error`, `helperText`, `disabled`, `required`, `className`

### Input
Standardized text input component with consistent height (40px), styling, and error handling.

**Location:** `Input.js`

**Usage:**
```jsx
import Input from "@/components/common/Input";

<Input
  name="field_name"
  label="Field Label"
  value={value}
  onChange={handleChange}
  error={!!errors.field_name}
  helperText={errors.field_name}
/>
```

**Props:**
- All standard TextField props are supported
- `fullWidth` defaults to `true`
- `size` defaults to `"small"` (40px height)

### Select
Standardized select dropdown component with FormControl pattern, consistent height matching Input.

**Location:** `Select.js`

**Usage:**
```jsx
import Select from "@/components/common/Select";

// Single select
<Select
  name="field_name"
  label="Select Option"
  value={value}
  onChange={handleChange}
  error={!!errors.field_name}
  helperText={errors.field_name}
>
  <MenuItem value="option1">Option 1</MenuItem>
  <MenuItem value="option2">Option 2</MenuItem>
</Select>

// Multiple select
<Select
  multiple
  name="field_name"
  label="Select Options"
  value={value}
  onChange={handleChange}
  renderValue={(selected) => selected.join(", ")}
>
  <MenuItem value="option1">Option 1</MenuItem>
  <MenuItem value="option2">Option 2</MenuItem>
</Select>
```

**Props:**
- `name` - Field name (required)
- `label` - Label text (required)
- `value` - Selected value(s)
- `onChange` - Change handler
- `error` - Boolean error state
- `helperText` - Error message text
- `multiple` - Enable multiple selection
- `required` - Mark as required
- `disabled` - Disable the field
- `fullWidth` - Defaults to `true`
- `size` - Defaults to `"small"`

### SearchInput
Standardized search input component with consistent styling and icon adornments.

**Location:** `SearchInput.js`

**Usage:**
```jsx
import SearchInput from "@/components/common/SearchInput";

<SearchInput
  placeholder="Search..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

// With custom max width
<SearchInput
  placeholder="Search..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  maxWidth="320px"
/>
```

**Props:**
- `placeholder` - Placeholder text (default: "Search...")
- `value` - Search query value
- `onChange` - Change handler
- `maxWidth` - Maximum width constraint
- `fullWidth` - Use full width (default: `false`)
- All standard TextField props are supported

### AutocompleteField
Standardized autocomplete component with consistent height and styling.

**Location:** `AutocompleteField.js`

**Usage:**
```jsx
import AutocompleteField from "@/components/common/AutocompleteField";

// Single select
<AutocompleteField
  options={options}
  getOptionLabel={(option) => option.label}
  value={value}
  onChange={(e, newValue) => setValue(newValue)}
  label="Select Option"
/>

// Multiple select
<AutocompleteField
  multiple
  options={options}
  getOptionLabel={(option) => option.label}
  value={value}
  onChange={(e, newValue) => setValue(newValue)}
  label="Select Options"
/>
```

**Props:**
- `options` - Array of options
- `getOptionLabel` - Function to get option label
- `value` - Selected value(s)
- `onChange` - Change handler `(event, newValue) => void`
- `label` - Label text
- `multiple` - Enable multiple selection
- `error` - Boolean error state
- `helperText` - Error message text
- All standard Autocomplete props are supported

### DateField
Standardized date input component with consistent styling.

**Location:** `DateField.js`

**Usage:**
```jsx
import DateField from "@/components/common/DateField";

<DateField
  name="date_field"
  label="Date"
  value={dateValue}
  onChange={handleChange}
  error={!!errors.date_field}
  helperText={errors.date_field}
/>
```

**Props:**
- `name` - Field name (required)
- `label` - Label text (required)
- `value` - Date value (YYYY-MM-DD format)
- `onChange` - Change handler
- `error` - Boolean error state
- `helperText` - Error message text
- `required` - Mark as required
- `disabled` - Disable the field
- `fullWidth` - Defaults to `true`
- `size` - Defaults to `"small"`

### FormField
Base wrapper component for consistent field styling and error states.

**Location:** `FormField.js`

**Usage:**
```jsx
import FormField from "@/components/common/FormField";

<FormField error={!!errors.field_name} helperText={errors.field_name}>
  <Input name="field_name" label="Field Label" />
</FormField>
```

## Design Standards

### Component Heights
- **Small (default):** `40px` - Standard for all form inputs
- **Medium:** `48px` - For important/primary actions (optional)
- **Large:** `56px` - For login/special pages (if needed)

### Spacing Standards
- **Grid spacing:** `1.5` - Use `FORM_SPACING` constant
- **Form padding:** `1.5` - Use `FORM_PADDING` constant
- **Section spacing:** `2` - Between form sections

### Border Radius
- **All inputs:** `6px` - Consistent across all field types

### Font Sizes
- **Input text:** `0.875rem` (14px)
- **Labels:** `0.875rem` (14px)
- **Helper text:** `0.75rem` (12px)

### Width Standards
- **Form fields:** `fullWidth` by default (can be overridden)
- **Search inputs:** Responsive with max-width constraints

## Constants

Import design constants from `@/utils/formConstants`:

```jsx
import { 
  FORM_SPACING, 
  FORM_PADDING, 
  FIELD_SIZE, 
  FIELD_HEIGHT_SMALL 
} from "@/utils/formConstants";
```

## Migration Guide

### Replacing TextField
```jsx
// Before
<TextField
  fullWidth
  size="small"
  name="field"
  label="Field"
  value={value}
  onChange={handleChange}
/>

// After
<Input
  name="field"
  label="Field"
  value={value}
  onChange={handleChange}
/>
```

### Replacing FormControl + Select
```jsx
// Before
<FormControl fullWidth size="small" error={!!errors.field}>
  <InputLabel>Field</InputLabel>
  <Select
    name="field"
    value={value}
    onChange={handleChange}
    label="Field"
  >
    <MenuItem value="option1">Option 1</MenuItem>
  </Select>
  {errors.field && <FormHelperText>{errors.field}</FormHelperText>}
</FormControl>

// After
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

### Replacing Autocomplete
```jsx
// Before
<Autocomplete
  size="small"
  options={options}
  getOptionLabel={(option) => option.label}
  value={value}
  onChange={(e, newValue) => setValue(newValue)}
  renderInput={(params) => <TextField {...params} label="Field" />}
/>

// After
<AutocompleteField
  options={options}
  getOptionLabel={(option) => option.label}
  value={value}
  onChange={(e, newValue) => setValue(newValue)}
  label="Field"
/>
```

## Best Practices

1. **Always use standardized components** - Use only common components (Input, Select, DateField, AutocompleteField, SearchInput, Checkbox, FormField, FormSection, FormGrid, FormContainer, FormActions, AddEditPageShell) for forms. Do not use raw MUI or raw ui primitives for form fields.
2. **Use AddEditPageShell for add/edit pages** - Every add and edit page should wrap its form in AddEditPageShell with title, listHref, listLabel.
3. **Use FormSection + FormGrid for form layout** - Prefer FormSection (title) and FormGrid (fields) instead of MUI Box/Grid.
4. **Use constants for spacing** - Import and use formConstants (e.g. COMPACT_SECTION_HEADER_CLASS, FIELD_HEIGHT_CLASS_SMALL).
5. **Consistent error handling** - Use `error` and `helperText` props consistently.
6. **Full width by default** - Field components default to `fullWidth={true}`.
7. **Small size by default** - All components default to `size="small"` (40px height).

