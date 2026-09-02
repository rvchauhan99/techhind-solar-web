"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Box,
    MenuItem,
    Alert,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { FORM_PADDING } from "@/utils/formConstants";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const COST_TYPE_OPTIONS = [
    { value: "LABOUR", label: "Labour" },
    { value: "MACHINE", label: "Machine" },
    { value: "OVERHEAD", label: "Overhead" },
    { value: "SUBCONTRACT", label: "Subcontract" },
    { value: "OTHER", label: "Other" },
];

const DENSE_TABLE_SX = {
    "& th": { py: 0.5, px: 0.75, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
    "& td": { py: 0.5, px: 0.75, fontSize: 12 },
};

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

/** Component qty including expected wastage, mirroring the API cost rollup. */
const effectiveQuantity = (line) =>
    round(toNumber(line.quantity_per) * (1 + toNumber(line.scrap_percent) / 100), 4);

const operationCost = (line) =>
    round(toNumber(line.fixed_cost) + (toNumber(line.std_time_minutes) / 60) * toNumber(line.rate_per_hour), 2);

const emptyComponent = {
    component_product_id: "",
    product_name: "",
    tracking_type: "LOT",
    serial_required: false,
    measurement_unit_name: "",
    quantity_per: "",
    scrap_percent: "0",
    std_rate: "",
    is_optional: "false",
    remarks: "",
};

const emptyOperation = {
    operation_name: "",
    cost_type: "LABOUR",
    std_time_minutes: "",
    rate_per_hour: "",
    fixed_cost: "",
    remarks: "",
};

export default function ProductionBomForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
    isEdit = false,
}) {
    const [formData, setFormData] = useState({
        bom_name: "",
        fg_product_id: "",
        fg_product_name: "",
        fg_measurement_unit_name: "",
        output_quantity: "1",
        effective_from: "",
        effective_to: "",
        bom_description: "",
        components: [],
        operations: [],
    });

    const [formErrors, setFormErrors] = useState({});
    const [componentErrors, setComponentErrors] = useState({});
    const [operationErrors, setOperationErrors] = useState({});
    const [currentComponent, setCurrentComponent] = useState(emptyComponent);
    const [currentOperation, setCurrentOperation] = useState(emptyOperation);
    const [loadingRecord, setLoadingRecord] = useState(false);

    useEffect(() => {
        if (!defaultValues || Object.keys(defaultValues).length === 0) return;
        setLoadingRecord(true);
        setFormData({
            bom_name: defaultValues.bom_name ?? "",
            fg_product_id: defaultValues.fg_product_id != null ? String(defaultValues.fg_product_id) : "",
            fg_product_name: defaultValues.fg_product_name ?? "",
            fg_measurement_unit_name: defaultValues.fg_measurement_unit_name ?? "",
            output_quantity: defaultValues.output_quantity != null ? String(defaultValues.output_quantity) : "1",
            effective_from: defaultValues.effective_from ?? "",
            effective_to: defaultValues.effective_to ?? "",
            bom_description: defaultValues.bom_description ?? "",
            components: defaultValues.components ?? [],
            operations: defaultValues.operations ?? [],
        });
        setLoadingRecord(false);
    }, [defaultValues]);

    const costSummary = useMemo(() => {
        const material = formData.components.reduce(
            (sum, line) => sum + effectiveQuantity(line) * toNumber(line.std_rate),
            0
        );
        const operation = formData.operations.reduce((sum, line) => sum + operationCost(line), 0);
        const outputQuantity = Math.max(1, toNumber(formData.output_quantity, 1));
        const total = round(material, 2) + round(operation, 2);
        return {
            material: round(material, 2),
            operation: round(operation, 2),
            total: round(total, 2),
            perUnit: round(total / outputQuantity, 2),
        };
    }, [formData.components, formData.operations, formData.output_quantity]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
        if (serverError) onClearServerError();
    };

    const handleComponentChange = (e) => {
        const { name, value } = e.target;
        setCurrentComponent((prev) => ({ ...prev, [name]: value }));
        if (componentErrors[name]) {
            setComponentErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleOperationChange = (e) => {
        const { name, value } = e.target;
        setCurrentOperation((prev) => ({ ...prev, [name]: value }));
        if (operationErrors[name]) {
            setOperationErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleAddComponent = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        const productId = parseInt(currentComponent.component_product_id, 10);
        if (!productId) errs.component_product_id = "Component product is required";
        if (productId && String(productId) === String(formData.fg_product_id)) {
            errs.component_product_id = "The finished good cannot be its own component";
        }
        if (formData.components.some((line) => line.component_product_id === productId)) {
            errs.component_product_id = "This component is already on the BOM";
        }
        if (!currentComponent.quantity_per || toNumber(currentComponent.quantity_per) <= 0) {
            errs.quantity_per = "Quantity per must be greater than 0";
        }
        const scrapPercent = toNumber(currentComponent.scrap_percent);
        if (scrapPercent < 0 || scrapPercent >= 100) {
            errs.scrap_percent = "Scrap % must be between 0 and 99.99";
        }

        if (Object.keys(errs).length > 0) {
            setComponentErrors(errs);
            return;
        }

        setFormData((prev) => ({
            ...prev,
            components: [
                ...prev.components,
                {
                    component_product_id: productId,
                    product_name: currentComponent.product_name,
                    tracking_type: currentComponent.tracking_type,
                    serial_required: currentComponent.serial_required,
                    measurement_unit_name: currentComponent.measurement_unit_name,
                    quantity_per: toNumber(currentComponent.quantity_per),
                    scrap_percent: scrapPercent,
                    std_rate: toNumber(currentComponent.std_rate),
                    is_optional: currentComponent.is_optional === "true",
                    remarks: currentComponent.remarks || "",
                },
            ],
        }));
        setCurrentComponent(emptyComponent);
        setComponentErrors({});
        if (formErrors.components) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next.components;
                return next;
            });
        }
    };

    const handleAddOperation = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        if (!String(currentOperation.operation_name || "").trim()) {
            errs.operation_name = "Operation name is required";
        }
        const cost = operationCost(currentOperation);
        if (cost <= 0) {
            errs.fixed_cost = "Enter a fixed cost, or time and rate per hour";
        }

        if (Object.keys(errs).length > 0) {
            setOperationErrors(errs);
            return;
        }

        setFormData((prev) => ({
            ...prev,
            operations: [
                ...prev.operations,
                {
                    operation_name: String(currentOperation.operation_name).trim(),
                    cost_type: currentOperation.cost_type,
                    std_time_minutes: toNumber(currentOperation.std_time_minutes),
                    rate_per_hour: toNumber(currentOperation.rate_per_hour),
                    fixed_cost: toNumber(currentOperation.fixed_cost),
                    remarks: currentOperation.remarks || "",
                },
            ],
        }));
        setCurrentOperation(emptyOperation);
        setOperationErrors({});
    };

    const handleRemoveComponent = (index) => {
        setFormData((prev) => ({
            ...prev,
            components: prev.components.filter((_, i) => i !== index),
        }));
    };

    const handleRemoveOperation = (index) => {
        setFormData((prev) => ({
            ...prev,
            operations: prev.operations.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const errs = {};
        if (!String(formData.bom_name || "").trim()) errs.bom_name = "BOM name is required";
        if (!formData.fg_product_id) errs.fg_product_id = "Finished good is required";
        if (!formData.output_quantity || parseInt(formData.output_quantity, 10) <= 0) {
            errs.output_quantity = "Output quantity must be at least 1";
        }
        if (formData.components.length === 0) errs.components = "At least one component is required";
        if (
            formData.effective_from &&
            formData.effective_to &&
            formData.effective_to < formData.effective_from
        ) {
            errs.effective_to = "Effective to cannot be before effective from";
        }

        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        setFormErrors({});

        onSubmit({
            bom_name: String(formData.bom_name).trim(),
            fg_product_id: parseInt(formData.fg_product_id, 10),
            output_quantity: parseInt(formData.output_quantity, 10),
            effective_from: formData.effective_from || null,
            effective_to: formData.effective_to || null,
            bom_description: formData.bom_description || null,
            components: formData.components.map((line, index) => ({
                component_product_id: line.component_product_id,
                line_no: index + 1,
                quantity_per: line.quantity_per,
                scrap_percent: line.scrap_percent,
                std_rate: line.std_rate,
                is_optional: line.is_optional,
                remarks: line.remarks || null,
            })),
            operations: formData.operations.map((line, index) => ({
                sequence_no: index + 1,
                operation_name: line.operation_name,
                cost_type: line.cost_type,
                std_time_minutes: line.std_time_minutes,
                rate_per_hour: line.rate_per_hour,
                fixed_cost: line.fixed_cost,
                remarks: line.remarks || null,
            })),
        });
    };

    if (loadingRecord) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <FormContainer className="flex-1 min-h-0 flex flex-col">
            <form
                id="production-bom-form"
                onSubmit={handleSubmit}
                onKeyDown={preventEnterSubmit}
                className="mx-auto w-full max-w-[1280px] flex flex-col flex-1 min-h-0"
                noValidate
            >
                <Box sx={{ p: FORM_PADDING }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    <FormGrid cols={2} className="lg:grid-cols-4">
                        <Input
                            name="bom_name"
                            label="BOM Name *"
                            value={formData.bom_name}
                            onChange={handleChange}
                            required
                            error={!!formErrors.bom_name}
                            helperText={formErrors.bom_name}
                        />
                        <AutocompleteField
                            label="Finished Good *"
                            placeholder="Type to search..."
                            options={[]}
                            usePortal
                            disabled={isEdit}
                            asyncLoadOptions={async (q) => {
                                const res = await productService.getProducts({
                                    q: q || undefined,
                                    limit: 20,
                                    visibility: "active",
                                });
                                const data = res?.result?.data ?? res?.data ?? [];
                                return Array.isArray(data) ? data : [];
                            }}
                            resolveOptionById={async (id) => {
                                if (id == null || id === "") return null;
                                const p = await productService.getProductById(id);
                                const row = p?.result ?? p;
                                return row
                                    ? {
                                        id: row.id,
                                        product_name: row.product_name,
                                        model_number: row.model_number ?? null,
                                        tracking_type: row.tracking_type ?? "LOT",
                                        serial_required: row.serial_required,
                                        measurement_unit_name: row.measurement_unit_name ?? null,
                                    }
                                    : null;
                            }}
                            getOptionLabel={(p) => formatProductAutocompleteLabel(p) || String(p?.id ?? "")}
                            value={formData.fg_product_id ? { id: parseInt(formData.fg_product_id, 10) } : null}
                            onChange={(e, newValue) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    fg_product_id: newValue?.id ?? "",
                                    fg_product_name: newValue?.product_name ?? "",
                                    fg_measurement_unit_name: newValue?.measurement_unit_name ?? "",
                                }));
                                if (formErrors.fg_product_id) {
                                    setFormErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.fg_product_id;
                                        return next;
                                    });
                                }
                            }}
                            required
                            error={!!formErrors.fg_product_id}
                            helperText={
                                formErrors.fg_product_id ||
                                (isEdit ? "Finished good cannot change; clone as a new version instead" : "")
                            }
                        />
                        <Input
                            name="output_quantity"
                            label={
                                formData.fg_measurement_unit_name
                                    ? `Output Qty * (${formData.fg_measurement_unit_name})`
                                    : "Output Qty *"
                            }
                            type="number"
                            value={formData.output_quantity}
                            onChange={handleChange}
                            inputProps={{ min: 1 }}
                            required
                            error={!!formErrors.output_quantity}
                            helperText={formErrors.output_quantity || "Component quantities are per this output"}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <DateField
                                name="effective_from"
                                label="Effective From"
                                value={formData.effective_from}
                                onChange={handleChange}
                            />
                            <DateField
                                name="effective_to"
                                label="Effective To"
                                value={formData.effective_to}
                                onChange={handleChange}
                                error={!!formErrors.effective_to}
                                helperText={formErrors.effective_to}
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-4">
                            <Input
                                name="bom_description"
                                label="Description"
                                value={formData.bom_description}
                                onChange={handleChange}
                                multiline
                                rows={2}
                            />
                        </div>
                    </FormGrid>

                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/40 p-1.5 text-xs sm:grid-cols-4">
                        <div>
                            <span className="block text-muted-foreground">Std Material Cost</span>
                            <span className="font-semibold">{costSummary.material.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Std Operation Cost</span>
                            <span className="font-semibold">{costSummary.operation.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Std Total Cost</span>
                            <span className="font-semibold">{costSummary.total.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Cost / Unit</span>
                            <span className="font-semibold text-primary">{costSummary.perUnit.toFixed(2)}</span>
                        </div>
                    </div>

                    <FormSection title="Components" className="mt-1.5">
                        {formErrors.components && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {formErrors.components}
                            </Alert>
                        )}

                        <Paper sx={{ p: 0.75, mb: 0.75, overflow: "visible" }}>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
                                <AutocompleteField
                                    label="Component *"
                                    placeholder="Type to search..."
                                    options={[]}
                                    usePortal
                                    asyncLoadOptions={async (q) => {
                                        const res = await productService.getProducts({
                                            q: q || undefined,
                                            limit: 20,
                                            visibility: "active",
                                        });
                                        const data = res?.result?.data ?? res?.data ?? [];
                                        return Array.isArray(data) ? data : [];
                                    }}
                                    getOptionLabel={(p) => formatProductAutocompleteLabel(p) || String(p?.id ?? "")}
                                    value={
                                        currentComponent.component_product_id
                                            ? { id: currentComponent.component_product_id, product_name: currentComponent.product_name }
                                            : null
                                    }
                                    onChange={(e, newValue) => {
                                        setCurrentComponent((prev) => ({
                                            ...prev,
                                            component_product_id: newValue?.id ?? "",
                                            product_name: newValue?.product_name ?? "",
                                            tracking_type: newValue?.tracking_type ?? "LOT",
                                            serial_required: !!newValue?.serial_required,
                                            measurement_unit_name: newValue?.measurement_unit_name ?? "",
                                            std_rate:
                                                newValue?.avg_purchase_price != null
                                                    ? String(newValue.avg_purchase_price)
                                                    : prev.std_rate,
                                        }));
                                        if (componentErrors.component_product_id) {
                                            setComponentErrors((prev) => {
                                                const next = { ...prev };
                                                delete next.component_product_id;
                                                return next;
                                            });
                                        }
                                    }}
                                    error={!!componentErrors.component_product_id}
                                    helperText={componentErrors.component_product_id}
                                />
                                <Input
                                    name="quantity_per"
                                    label={
                                        currentComponent.measurement_unit_name
                                            ? `Qty / Output * (${currentComponent.measurement_unit_name})`
                                            : "Qty / Output *"
                                    }
                                    type="number"
                                    value={currentComponent.quantity_per}
                                    onChange={handleComponentChange}
                                    inputProps={{ min: 0, step: "0.0001" }}
                                    error={!!componentErrors.quantity_per}
                                    helperText={componentErrors.quantity_per}
                                />
                                <Input
                                    name="scrap_percent"
                                    label="Scrap %"
                                    type="number"
                                    value={currentComponent.scrap_percent}
                                    onChange={handleComponentChange}
                                    inputProps={{ min: 0, max: 99.99, step: "0.01" }}
                                    error={!!componentErrors.scrap_percent}
                                    helperText={componentErrors.scrap_percent}
                                />
                                <Input
                                    name="std_rate"
                                    label="Std Rate"
                                    type="number"
                                    value={currentComponent.std_rate}
                                    onChange={handleComponentChange}
                                    inputProps={{ min: 0, step: "0.01" }}
                                    helperText="Blank uses product avg purchase price"
                                />
                                <Select
                                    name="is_optional"
                                    label="Optional"
                                    value={currentComponent.is_optional}
                                    onChange={handleComponentChange}
                                    clearable={false}
                                >
                                    <MenuItem value="false">Mandatory</MenuItem>
                                    <MenuItem value="true">Optional</MenuItem>
                                </Select>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddComponent}
                                        className="w-full lg:w-auto"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </Paper>

                        {formData.components.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small" sx={DENSE_TABLE_SX}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>Component</TableCell>
                                            <TableCell align="right">Qty / Output</TableCell>
                                            <TableCell align="right">Scrap %</TableCell>
                                            <TableCell align="right">Effective Qty</TableCell>
                                            <TableCell align="right">Std Rate</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.components.map((line, index) => {
                                            const effective = effectiveQuantity(line);
                                            return (
                                                <TableRow key={`${line.component_product_id}-${index}`}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>
                                                        {line.product_name || `#${line.component_product_id}`}
                                                        {line.serial_required && (
                                                            <Chip label="Serial" size="small" color="primary" sx={{ ml: 0.75, height: 18 }} />
                                                        )}
                                                        {line.is_optional && (
                                                            <Chip label="Optional" size="small" sx={{ ml: 0.75, height: 18 }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">{toNumber(line.quantity_per)}</TableCell>
                                                    <TableCell align="right">{toNumber(line.scrap_percent)}</TableCell>
                                                    <TableCell align="right">{effective}</TableCell>
                                                    <TableCell align="right">{toNumber(line.std_rate).toFixed(2)}</TableCell>
                                                    <TableCell align="right">
                                                        {round(effective * toNumber(line.std_rate), 2).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>{line.measurement_unit_name || line.tracking_type || "-"}</TableCell>
                                                    <TableCell align="right">
                                                        <IconButton size="small" color="error" onClick={() => handleRemoveComponent(index)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </FormSection>

                    <FormSection title="Operations & Labour Costing" className="mt-1.5">
                        <Paper sx={{ p: 0.75, mb: 0.75, overflow: "visible" }}>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
                                <Input
                                    name="operation_name"
                                    label="Operation *"
                                    value={currentOperation.operation_name}
                                    onChange={handleOperationChange}
                                    error={!!operationErrors.operation_name}
                                    helperText={operationErrors.operation_name}
                                />
                                <Select
                                    name="cost_type"
                                    label="Cost Type"
                                    value={currentOperation.cost_type}
                                    onChange={handleOperationChange}
                                    clearable={false}
                                >
                                    {COST_TYPE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Input
                                    name="std_time_minutes"
                                    label="Std Minutes"
                                    type="number"
                                    value={currentOperation.std_time_minutes}
                                    onChange={handleOperationChange}
                                    inputProps={{ min: 0, step: "0.01" }}
                                />
                                <Input
                                    name="rate_per_hour"
                                    label="Rate / Hour"
                                    type="number"
                                    value={currentOperation.rate_per_hour}
                                    onChange={handleOperationChange}
                                    inputProps={{ min: 0, step: "0.01" }}
                                />
                                <Input
                                    name="fixed_cost"
                                    label="Fixed Cost"
                                    type="number"
                                    value={currentOperation.fixed_cost}
                                    onChange={handleOperationChange}
                                    inputProps={{ min: 0, step: "0.01" }}
                                    error={!!operationErrors.fixed_cost}
                                    helperText={operationErrors.fixed_cost || `Line cost ${operationCost(currentOperation).toFixed(2)}`}
                                />
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddOperation}
                                        className="w-full lg:w-auto"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </Paper>

                        {formData.operations.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small" sx={DENSE_TABLE_SX}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Seq</TableCell>
                                            <TableCell>Operation</TableCell>
                                            <TableCell>Cost Type</TableCell>
                                            <TableCell align="right">Std Minutes</TableCell>
                                            <TableCell align="right">Rate / Hour</TableCell>
                                            <TableCell align="right">Fixed Cost</TableCell>
                                            <TableCell align="right">Std Cost</TableCell>
                                            <TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.operations.map((line, index) => (
                                            <TableRow key={`${line.operation_name}-${index}`}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{line.operation_name}</TableCell>
                                                <TableCell>{line.cost_type}</TableCell>
                                                <TableCell align="right">{toNumber(line.std_time_minutes)}</TableCell>
                                                <TableCell align="right">{toNumber(line.rate_per_hour).toFixed(2)}</TableCell>
                                                <TableCell align="right">{toNumber(line.fixed_cost).toFixed(2)}</TableCell>
                                                <TableCell align="right">{operationCost(line).toFixed(2)}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveOperation(index)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </FormSection>
                </Box>
            </form>

            <FormActions>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton type="submit" form="production-bom-form" loading={loading} className="min-w-[120px]">
                    {isEdit ? "Update" : "Create"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
