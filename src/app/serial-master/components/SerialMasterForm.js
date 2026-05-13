"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import {
    Box,
    Alert,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { SERIAL_MASTER_CODE_OPTIONS, isKnownSerialMasterCode } from "@/constants/serialMasterCodes";

// ─── Configuration Maps ──────────────────────────────────────────────────────

const SERIAL_TYPES = [
    { value: "FIXED", label: "Fixed Text" },
    { value: "DATE", label: "Date" },
    { value: "FINANCIAL_YEAR", label: "Financial Year" },
    { value: "SERIAL", label: "Serial Number" },
    { value: "SEQUENTIALCHARACTER", label: "Sequential Character" },
];

const DATE_FORMATS = [
    { value: "DD", label: "DD (Day — 01-31)" },
    { value: "MM", label: "MM (Month — 01-12)" },
    { value: "YY", label: "YY (Year — 26)" },
    { value: "YYYY", label: "YYYY (Year — 2026)" },
    { value: "Mmm", label: "Mmm (Month — Jan)" },
    { value: "MMM", label: "MMM (Month — JAN)" },
];

const FY_FORMATS = [
    { value: "yyyy-YY", label: "yyyy-YY (2025-26)" },
    { value: "yyyy/YY", label: "yyyy/YY (2025/26)" },
    { value: "yyyyYY", label: "yyyyYY (202526)" },
    { value: "yy-YY", label: "yy-YY (25-26)" },
    { value: "yy/YY", label: "yy/YY (25/26)" },
    { value: "yyYY", label: "yyYY (2526)" },
];

const RESET_INTERVALS = [
    { value: "", label: "None" },
    { value: "DAILY", label: "Daily" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "YEARLY", label: "Yearly" },
];

// ─── Preview Helpers ─────────────────────────────────────────────────────────

function previewDateSegment(format) {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    switch (format) {
        case "DD": return String(d.getDate()).padStart(2, "0");
        case "MM": return String(d.getMonth() + 1).padStart(2, "0");
        case "YY": return String(d.getFullYear()).slice(-2);
        case "YYYY": return String(d.getFullYear());
        case "Mmm": return MONTHS[d.getMonth()];
        case "MMM": return MONTHS[d.getMonth()].toUpperCase();
        default: return "??";
    }
}

function previewFYSegment(format) {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const sY = month >= 4 ? year : year - 1;
    const eY = sY + 1;
    const replacements = { yyyy: sY, yy: String(sY).slice(-2), YY: String(eY).slice(-2) };
    return format.replace(/yyyy|yy|YY/g, (m) => replacements[m]);
}

function previewDetail(detail) {
    switch (detail.type) {
        case "FIXED": return detail.fixed_char || "";
        case "DATE": return detail.date_format ? previewDateSegment(detail.date_format) : "";
        case "FINANCIAL_YEAR": return detail.date_format ? previewFYSegment(detail.date_format) : "";
        case "SERIAL": {
            const w = parseInt(detail.width, 10) || 4;
            const lastGen = detail.last_generated;
            const startVal = parseInt(detail.start_value || "0", 10);
            // If already generated, show next; otherwise show start_value
            const num = lastGen ? parseInt(lastGen, 10) + 1 : startVal;
            return String(num).padStart(w, "0");
        }
        case "SEQUENTIALCHARACTER": return detail.fixed_char || "A";
        default: return "";
    }
}

// ─── Default detail row ──────────────────────────────────────────────────────

const makeEmptyRow = () => ({
    type: "FIXED",
    sort_order: 0,
    fixed_char: "",
    date_format: "",
    width: 4,
    start_value: "0",
    next_value: 1,
    reset_value: "",
    reset_interval: "",
});

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRow(row) {
    switch (row.type) {
        case "FIXED":
            if (!row.fixed_char || !row.fixed_char.trim()) return "Fixed text is required";
            break;
        case "DATE":
            if (!row.date_format) return "Date format is required";
            break;
        case "FINANCIAL_YEAR":
            if (!row.date_format) return "Financial year format is required";
            break;
        case "SERIAL":
            if (!row.width || parseInt(row.width, 10) < 1) return "Width must be at least 1";
            break;
        case "SEQUENTIALCHARACTER":
            if (!row.fixed_char || !row.fixed_char.trim()) return "Starting character is required";
            break;
        default:
            return "Invalid type";
    }
    return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SerialMasterForm = forwardRef(function SerialMasterForm(
    {
        defaultValues = {},
        onSubmit,
        loading,
        serverError = null,
        onClearServerError = () => { },
        viewMode = false,
    },
    ref
) {
    const [formData, setFormData] = useState(() => ({
        code: "",
        is_active: true,
        branch_id: "",
        ...defaultValues,
        branch_id:
            defaultValues?.branch_id ??
            defaultValues?.branch?.id ??
            "",
    }));

    const [details, setDetails] = useState(() => {
        if (defaultValues?.details?.length) {
            return defaultValues.details
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((d) => ({ ...makeEmptyRow(), ...d }));
        }
        return [];
    });

    // Editor state: "adding" = new row not yet in details, "editing" = modifying existing row
    const [editorMode, setEditorMode] = useState(null); // null | "adding" | "editing"
    const [editingIndex, setEditingIndex] = useState(null); // index when editing existing row
    const [editorData, setEditorData] = useState(null); // row data in editor
    const [editorError, setEditorError] = useState(null); // validation error
    const [formError, setFormError] = useState(null);
    const [serialCodeError, setSerialCodeError] = useState(null);
    const formRef = useRef(null);

    useEffect(() => {
        if (!defaultValues?.id) setSerialCodeError(null);
        const dv = defaultValues ?? {};
        if (defaultValues?.id || Object.keys(dv).length > 0) {
            setFormData({
                code: "",
                is_active: true,
                branch_id: "",
                ...dv,
                branch_id:
                    dv.branch_id ??
                    dv.branch?.id ??
                    "",
            });
            if (dv.details?.length) {
                setDetails(
                    dv.details
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((d) => ({ ...makeEmptyRow(), ...d }))
                );
            }
        }
    }, [defaultValues?.id]);

    const isEdit = Boolean(defaultValues?.id);

    /** Branch row from API when editing — used so the autocomplete shows a label immediately. */
    const branchAsyncDefaults = useMemo(() => {
        const b = defaultValues?.branch;
        if (!b?.id) return [];
        const name = b.name ?? b.label ?? "";
        return [{ id: b.id, name, label: name, source_name: name }];
    }, [defaultValues?.branch?.id, defaultValues?.branch?.name, defaultValues?.branch?.label]);

    const branchFieldValue = useMemo(() => {
        if (formData.branch_id === "" || formData.branch_id == null) return null;
        const id = Number(formData.branch_id);
        if (Number.isNaN(id)) return null;
        const b = defaultValues?.branch;
        if (b && Number(b.id) === id) {
            const name = b.name ?? b.label ?? "";
            return { id: b.id, name, label: name, source_name: name };
        }
        return { id };
    }, [formData.branch_id, defaultValues?.branch]);

    const getOptionLabel = (opt) =>
        opt?.label ?? opt?.name ?? opt?.source_name ?? (opt?.id != null ? String(opt.id) : "");

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        if (serverError) onClearServerError();
        if (name === "code") setSerialCodeError(null);
        setFormData((s) => ({ ...s, [name]: value }));
    };

    // ── Editor Actions ──

    const openAddEditor = () => {
        const row = makeEmptyRow();
        row.sort_order = details.length;
        setEditorData(row);
        setEditorMode("adding");
        setEditingIndex(null);
        setEditorError(null);
    };

    const openEditEditor = (index) => {
        setEditorData({ ...details[index] });
        setEditorMode("editing");
        setEditingIndex(index);
        setEditorError(null);
    };

    const closeEditor = () => {
        setEditorMode(null);
        setEditingIndex(null);
        setEditorData(null);
        setEditorError(null);
    };

    const saveEditor = () => {
        if (!editorData) return;

        const error = validateRow(editorData);
        if (error) {
            setEditorError(error);
            return;
        }

        if (editorMode === "adding") {
            setDetails((prev) => [...prev, { ...editorData, sort_order: prev.length }]);
        } else if (editorMode === "editing" && editingIndex !== null) {
            setDetails((prev) => {
                const copy = [...prev];
                copy[editingIndex] = { ...editorData };
                return copy;
            });
        }
        closeEditor();
    };

    const handleEditorFieldChange = (key, value) => {
        setEditorError(null);
        setEditorData((prev) => {
            const updated = { ...prev, [key]: value };
            // Reset type-specific fields when type changes
            if (key === "type") {
                updated.fixed_char = "";
                updated.date_format = "";
                updated.width = 4;
                updated.start_value = "0";
                updated.next_value = 1;
                updated.reset_value = "";
                updated.reset_interval = "";
                if (value === "SEQUENTIALCHARACTER") updated.fixed_char = "A";
            }
            return updated;
        });
    };

    // ── Detail Row Actions ──

    const deleteRow = (index) => {
        setDetails((prev) =>
            prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sort_order: i }))
        );
        // If editing this row, close editor
        if (editorMode === "editing" && editingIndex === index) {
            closeEditor();
        }
        // Adjust editing index if deleting a row before the one being edited
        if (editorMode === "editing" && editingIndex !== null && index < editingIndex) {
            setEditingIndex((prev) => prev - 1);
        }
    };

    const moveRow = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= details.length) return;
        setDetails((prev) => {
            const copy = [...prev];
            [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
            return copy.map((d, i) => ({ ...d, sort_order: i }));
        });
    };

    // ── Live Preview ──

    const preview = useMemo(() => {
        const rows = editorMode === "adding"
            ? [...details, editorData].filter(Boolean)
            : editorMode === "editing" && editingIndex !== null
                ? details.map((d, i) => (i === editingIndex ? editorData : d))
                : details;
        if (rows.length === 0) return "—";
        const result = rows.map((d) => previewDetail(d)).join("");
        return result || "—";
    }, [details, editorData, editorMode, editingIndex]);

    // ── Submission ──

    const handleSubmit = (e) => {
        e.preventDefault();
        if (viewMode) return;
        if (!isEdit) {
            const c = String(formData.code || "").trim();
            if (!c) {
                setSerialCodeError("Serial code is required");
                return;
            }
        }
        setSerialCodeError(null);
        const hasExplicitBranch =
            formData.branch_id !== "" &&
            formData.branch_id != null &&
            !Number.isNaN(parseInt(String(formData.branch_id), 10));
        const branchPayload = hasExplicitBranch ? parseInt(String(formData.branch_id), 10) : null;
        setFormError(null);
        const payload = {
            code: formData.code,
            is_active: formData.is_active,
            branch_id: branchPayload,
            details: details.map((d, i) => {
                const row = {
                    type: d.type,
                    sort_order: i,
                    fixed_char: d.type === "FIXED" || d.type === "SEQUENTIALCHARACTER" ? d.fixed_char || null : null,
                    date_format: d.type === "DATE" || d.type === "FINANCIAL_YEAR" ? d.date_format || null : null,
                    width: d.type === "SERIAL" ? parseInt(d.width, 10) || 4 : null,
                    start_value: d.type === "SERIAL" ? d.start_value || "0" : null,
                    next_value: d.type === "SERIAL" ? parseInt(d.next_value, 10) || 1 : null,
                    reset_value: d.type === "SERIAL" ? d.reset_value || null : null,
                    reset_interval: d.type === "SERIAL" && d.reset_interval ? d.reset_interval : null,
                };
                if (d.last_generated != null && String(d.last_generated).trim() !== "") {
                    row.last_generated = String(d.last_generated);
                }
                if (d.last_reset_at != null && d.last_reset_at !== "") {
                    row.last_reset_at = d.last_reset_at;
                }
                return row;
            }),
        };
        onSubmit(payload);
    };

    useImperativeHandle(ref, () => ({
        requestSubmit: () => formRef.current?.requestSubmit(),
    }));

    // ── Type Labels / Colors ──

    const typeLabel = (type) => SERIAL_TYPES.find((st) => st.value === type)?.label || type;

    const typeColor = (type) => {
        switch (type) {
            case "FIXED": return "default";
            case "DATE": return "primary";
            case "FINANCIAL_YEAR": return "secondary";
            case "SERIAL": return "success";
            case "SEQUENTIALCHARACTER": return "warning";
            default: return "default";
        }
    };

    const describeDetail = (d) => {
        switch (d.type) {
            case "FIXED": return d.fixed_char ? `"${d.fixed_char}"` : "—";
            case "DATE": return DATE_FORMATS.find((f) => f.value === d.date_format)?.label || d.date_format || "—";
            case "FINANCIAL_YEAR": return FY_FORMATS.find((f) => f.value === d.date_format)?.label || d.date_format || "—";
            case "SERIAL": {
                const parts = [`Width: ${d.width || 4}`];
                if (d.start_value && d.start_value !== "0") parts.push(`Start: ${d.start_value}`);
                if (d.reset_interval) parts.push(`Reset: ${d.reset_interval}`);
                if (d.reset_value) parts.push(`Max: ${d.reset_value}`);
                return parts.join(" · ");
            }
            case "SEQUENTIALCHARACTER": return `Start: ${d.fixed_char || "A"}`;
            default: return "—";
        }
    };

    // ── Editor Panel ──

    const renderEditor = () => {
        if (!editorData) return null;
        const t = editorData.type;
        const isAdding = editorMode === "adding";

        return (
            <Paper variant="outlined" sx={{ mb: 1.5, p: 2, bgcolor: "grey.50", border: "2px solid", borderColor: "primary.light" }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    {isAdding ? "Add New Segment" : `Edit Segment #${editingIndex + 1}`}
                </Typography>
                {editorError && (
                    <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{editorError}</Alert>
                )}
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <Box sx={{ width: 180 }}>
                        <Select
                            name="type"
                            label="Type"
                            value={editorData.type}
                            onChange={(e) => handleEditorFieldChange("type", e.target.value)}
                            disabled={viewMode}
                            required
                            size="small"
                        >
                            {SERIAL_TYPES.map((st) => (
                                <MenuItem key={st.value} value={st.value}>{st.label}</MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {t === "FIXED" && (
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Input
                                name="fixed_char"
                                label="Fixed Text"
                                value={editorData.fixed_char || ""}
                                onChange={(e) => handleEditorFieldChange("fixed_char", e.target.value)}
                                disabled={viewMode}
                                required
                                placeholder='e.g. PO-, /, -'
                            />
                        </Box>
                    )}

                    {t === "DATE" && (
                        <Box sx={{ width: 240 }}>
                            <Select
                                name="date_format"
                                label="Date Format"
                                value={editorData.date_format || ""}
                                onChange={(e) => handleEditorFieldChange("date_format", e.target.value)}
                                disabled={viewMode}
                                required
                            >
                                {DATE_FORMATS.map((df) => (
                                    <MenuItem key={df.value} value={df.value}>{df.label}</MenuItem>
                                ))}
                            </Select>
                        </Box>
                    )}

                    {t === "FINANCIAL_YEAR" && (
                        <Box sx={{ width: 260 }}>
                            <Select
                                name="date_format"
                                label="FY Format"
                                value={editorData.date_format || ""}
                                onChange={(e) => handleEditorFieldChange("date_format", e.target.value)}
                                disabled={viewMode}
                                required
                            >
                                {FY_FORMATS.map((fy) => (
                                    <MenuItem key={fy.value} value={fy.value}>{fy.label}</MenuItem>
                                ))}
                            </Select>
                        </Box>
                    )}

                    {t === "SERIAL" && (
                        <>
                            <Box sx={{ width: 90 }}>
                                <Input
                                    name="width"
                                    label="Width"
                                    type="number"
                                    value={editorData.width}
                                    onChange={(e) => handleEditorFieldChange("width", e.target.value)}
                                    disabled={viewMode}
                                    required
                                    inputProps={{ min: 1, max: 20, step: 1 }}
                                />
                            </Box>
                            <Box sx={{ width: 100 }}>
                                <Input
                                    name="start_value"
                                    label="Start"
                                    value={editorData.start_value || "0"}
                                    onChange={(e) => handleEditorFieldChange("start_value", e.target.value)}
                                    disabled={viewMode}
                                />
                            </Box>
                            <Box sx={{ width: 100 }}>
                                <Input
                                    name="reset_value"
                                    label="Reset At"
                                    value={editorData.reset_value || ""}
                                    onChange={(e) => handleEditorFieldChange("reset_value", e.target.value)}
                                    disabled={viewMode}
                                    placeholder="9999"
                                />
                            </Box>
                            <Box sx={{ width: 160 }}>
                                <Select
                                    name="reset_interval"
                                    label="Reset Interval"
                                    value={editorData.reset_interval || ""}
                                    onChange={(e) => handleEditorFieldChange("reset_interval", e.target.value)}
                                    disabled={viewMode}
                                >
                                    {RESET_INTERVALS.map((ri) => (
                                        <MenuItem key={ri.value} value={ri.value}>{ri.label}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        </>
                    )}

                    {t === "SEQUENTIALCHARACTER" && (
                        <Box sx={{ width: 140 }}>
                            <Input
                                name="fixed_char"
                                label="Start Char"
                                value={editorData.fixed_char || "A"}
                                onChange={(e) => handleEditorFieldChange("fixed_char", e.target.value.toUpperCase())}
                                disabled={viewMode}
                                inputProps={{ maxLength: 3 }}
                                placeholder="A"
                            />
                        </Box>
                    )}
                </Box>

                {/* Editor preview */}
                <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Segment preview:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {previewDetail(editorData) || "—"}
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Button type="button" size="sm" onClick={saveEditor} disabled={viewMode}>
                        {isAdding ? "Add" : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={closeEditor}>
                        Cancel
                    </Button>
                </Box>
            </Paper>
        );
    };

    // ── Render ──

    return (
        <>
            {serverError ? <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert> : null}

            <Box component="form" ref={formRef} onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", gap: 1.5, mb: 1, pt: 1, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <Box sx={{ flex: "1 1 180px", minWidth: 160 }}>
                        {!isEdit && !viewMode ? (
                            <Select
                                name="code"
                                label="Serial Code"
                                value={formData.code || ""}
                                onChange={handleFieldChange}
                                required
                                clearable={false}
                                placeholder="Select serial code..."
                                error={Boolean(serialCodeError)}
                                helperText={serialCodeError}
                            >
                                {SERIAL_MASTER_CODE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        ) : (
                            <Box sx={{ pb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>
                                    Serial Code
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                                    {formData.code || "—"}
                                </Typography>
                                {isEdit && !viewMode && !isKnownSerialMasterCode(formData.code) ? (
                                    <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5, maxWidth: 360 }}>
                                        Legacy code — not in standard list. To use a standard code, add a new Serial Master.
                                    </Typography>
                                ) : null}
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ width: 140 }}>
                        <Select
                            name="is_active"
                            label="Status"
                            value={formData.is_active === true || formData.is_active === "true" ? "true" : "false"}
                            onChange={(e) => handleFieldChange({ target: { name: "is_active", value: e.target.value === "true" } })}
                            disabled={viewMode}
                        >
                            <MenuItem value="true">Active</MenuItem>
                            <MenuItem value="false">Inactive</MenuItem>
                        </Select>
                    </Box>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                    <AutocompleteField
                        name="branch_id"
                        label="Branch"
                        required={false}
                        disabled={viewMode}
                        error={Boolean(formError)}
                        helperText={formError || undefined}
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                        asyncDefaultOptions={branchAsyncDefaults}
                        referenceModel="company_branch.model"
                        getOptionLabel={getOptionLabel}
                        value={branchFieldValue}
                        onChange={(e, newValue) => {
                            if (serverError) onClearServerError();
                            setFormError(null);
                            setFormData((s) => ({
                                ...s,
                                branch_id: newValue?.id ?? "",
                            }));
                        }}
                        placeholder="Search branch..."
                        variant="minimal"
                        size="small"
                    />
                </Box>

                {/* Live Preview */}
                <Box
                    sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: "grey.50",
                        border: "1px dashed",
                        borderColor: "grey.300",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Preview:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: "monospace", fontSize: "1rem", letterSpacing: 1 }}>
                        {preview}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Serial Segments ({details.length})
                    </Typography>
                    {!viewMode && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={openAddEditor}
                            disabled={editorMode !== null}
                        >
                            <AddIcon sx={{ fontSize: 18, mr: 0.5 }} /> Add Segment
                        </Button>
                    )}
                </Box>

                {/* Editor Panel */}
                {editorMode && renderEditor()}

                {/* Detail rows table */}
                <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 60 }}>#</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Configuration</TableCell>
                                <TableCell sx={{ width: 120 }}>Preview</TableCell>
                                {!viewMode && <TableCell align="center" sx={{ width: 140 }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {details.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={viewMode ? 4 : 5} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            No segments added. Click &quot;Add Segment&quot; to configure your serial format.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                details.map((d, index) => {
                                    const isBeingEdited = editorMode === "editing" && editingIndex === index;
                                    return (
                                        <TableRow
                                            key={`${index}-${d.type}`}
                                            sx={{
                                                bgcolor: isBeingEdited ? "action.selected" : undefined,
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, mr: 0.5 }}>
                                                        {index + 1}
                                                    </Typography>
                                                    {!viewMode && details.length > 1 && (
                                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveRow(index, -1)}
                                                                disabled={index === 0 || editorMode !== null}
                                                                sx={{ p: 0 }}
                                                            >
                                                                <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveRow(index, 1)}
                                                                disabled={index === details.length - 1 || editorMode !== null}
                                                                sx={{ p: 0 }}
                                                            >
                                                                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={typeLabel(d.type)} color={typeColor(d.type)} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{describeDetail(d)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                                                    {previewDetail(d) || "—"}
                                                </Typography>
                                            </TableCell>
                                            {!viewMode && (
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openEditEditor(index)}
                                                        disabled={editorMode !== null}
                                                        color="primary"
                                                        title="Edit"
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => deleteRow(index)}
                                                        disabled={editorMode !== null}
                                                        color="error"
                                                        title="Delete"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </>
    );
});

export default SerialMasterForm;
