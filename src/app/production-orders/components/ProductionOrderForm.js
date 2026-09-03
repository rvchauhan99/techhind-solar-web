"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Box,
    MenuItem,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
} from "@mui/material";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import stockService from "@/services/stockService";
import productionBomService from "@/services/productionBomService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { AP } from "@/utils/assemblyProductionLabels";
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
import { getApiErrorMessage } from "@/utils/toast";

const PRIORITY_OPTIONS = [
    { value: "LOW", label: "Low" },
    { value: "NORMAL", label: "Normal" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
];

const DENSE_TABLE_SX = {
    "& th": { py: 0.5, px: 0.75, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
    "& td": { py: 0.5, px: 0.75, fontSize: 12 },
};

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const round = (value, decimals = 4) => {
    const factor = 10 ** decimals;
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

/** Mirrors productionOrder.service.componentRequiredQuantity. */
const requiredQuantity = ({ quantity_per, scrap_percent, plannedQuantity, outputQuantity }) => {
    const perOutput = toNumber(quantity_per) * (1 + toNumber(scrap_percent) / 100);
    const output = Math.max(1, toNumber(outputQuantity, 1));
    return round((perOutput * toNumber(plannedQuantity)) / output, 4);
};

export default function ProductionOrderForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
    isEdit = false,
}) {
    const [formData, setFormData] = useState({
        warehouse_id: "",
        fg_product_id: "",
        fg_product_name: "",
        fg_tracking_type: "LOT",
        planned_quantity: "1",
        planned_start_date: new Date().toISOString().split("T")[0],
        planned_end_date: "",
        priority: "NORMAL",
        remarks: "",
    });

    const [formErrors, setFormErrors] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [bom, setBom] = useState(null);
    const [bomError, setBomError] = useState(null);
    const [loadingBom, setLoadingBom] = useState(false);
    const [stockByProduct, setStockByProduct] = useState({});

    useEffect(() => {
        const loadWarehouses = async () => {
            setLoadingOptions(true);
            try {
                const profileRes = await companyService.getCompanyProfile();
                const companyId = (profileRes?.result || profileRes?.data || profileRes)?.id;
                if (!companyId) {
                    setWarehouses([]);
                    return;
                }
                const res = await companyService.listWarehouses(parseInt(companyId, 10));
                const list = res?.result || res?.data || res || [];
                setWarehouses(Array.isArray(list) ? list : []);
            } catch (error) {
                console.error("Failed to load warehouses", error);
                setWarehouses([]);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadWarehouses();
    }, []);

    useEffect(() => {
        if (!defaultValues || Object.keys(defaultValues).length === 0) return;
        setFormData({
            warehouse_id: defaultValues.warehouse_id != null ? String(defaultValues.warehouse_id) : "",
            fg_product_id: defaultValues.fg_product_id != null ? String(defaultValues.fg_product_id) : "",
            fg_product_name: defaultValues.fg_product_name ?? "",
            fg_tracking_type: defaultValues.fg_tracking_type ?? "LOT",
            planned_quantity:
                defaultValues.planned_quantity != null ? String(defaultValues.planned_quantity) : "1",
            planned_start_date: defaultValues.planned_start_date ?? "",
            planned_end_date: defaultValues.planned_end_date ?? "",
            priority: defaultValues.priority ?? "NORMAL",
            remarks: defaultValues.remarks ?? "",
        });
    }, [defaultValues]);

    // Active default BOM for the chosen finished good drives the requirement panel.
    useEffect(() => {
        const productId = formData.fg_product_id;
        if (!productId) {
            setBom(null);
            setBomError(null);
            return;
        }
        let cancelled = false;
        const loadBom = async () => {
            setLoadingBom(true);
            setBomError(null);
            try {
                const response = await productionBomService.getActiveBomByProduct(productId);
                const result = response?.result || response;
                if (cancelled) return;
                if (!result) {
                    setBom(null);
                    setBomError(
                        "No ACTIVE production BOM exists for this finished good. Create and activate one first."
                    );
                    return;
                }
                setBom(result);
            } catch (error) {
                if (cancelled) return;
                setBom(null);
                setBomError(getApiErrorMessage(error, "Failed to load the active BOM"));
            } finally {
                if (!cancelled) setLoadingBom(false);
            }
        };
        loadBom();
        return () => {
            cancelled = true;
        };
    }, [formData.fg_product_id]);

    // Warehouse availability for the shortage panel.
    useEffect(() => {
        const warehouseId = formData.warehouse_id;
        if (!warehouseId) {
            setStockByProduct({});
            return;
        }
        let cancelled = false;
        const loadStocks = async () => {
            try {
                const response = await stockService.getStocksByWarehouse(warehouseId);
                const data = Array.isArray(response?.result)
                    ? response.result
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];
                if (cancelled) return;
                const map = {};
                data.forEach((stock) => {
                    map[parseInt(stock.product_id, 10)] = stock;
                });
                setStockByProduct(map);
            } catch (error) {
                console.error("Failed to load warehouse stock", error);
                if (!cancelled) setStockByProduct({});
            }
        };
        loadStocks();
        return () => {
            cancelled = true;
        };
    }, [formData.warehouse_id]);

    const shortageLines = useMemo(() => {
        if (!bom?.components?.length) return [];
        const plannedQuantity = toNumber(formData.planned_quantity);
        return bom.components.map((line) => {
            const required = requiredQuantity({
                quantity_per: line.quantity_per,
                scrap_percent: line.scrap_percent,
                plannedQuantity,
                outputQuantity: bom.output_quantity,
            });
            const stock = stockByProduct[line.component_product_id];
            const onHand = toNumber(stock?.quantity_on_hand);
            return {
                id: line.id,
                product_name: line.product?.product_name || `#${line.component_product_id}`,
                serial_required: !!line.product?.serial_required,
                is_optional: !!line.is_optional,
                unit: line.measurementUnit?.unit || "",
                quantity_per: toNumber(line.quantity_per),
                scrap_percent: toNumber(line.scrap_percent),
                required_quantity: required,
                quantity_on_hand: onHand,
                quantity_available: toNumber(stock?.quantity_available ?? onHand),
                shortage_quantity: round(Math.max(0, required - onHand), 4),
            };
        });
    }, [bom, formData.planned_quantity, stockByProduct]);

    const hasShortage = shortageLines.some((line) => !line.is_optional && line.shortage_quantity > 0);

    const plannedCost = useMemo(() => {
        if (!bom) return null;
        const plannedQuantity = toNumber(formData.planned_quantity);
        const output = Math.max(1, toNumber(bom.output_quantity, 1));
        const scale = plannedQuantity / output;
        return {
            material: round(toNumber(bom.std_material_cost) * scale, 2),
            operation: round(toNumber(bom.std_operation_cost) * scale, 2),
            total: round(toNumber(bom.std_total_cost) * scale, 2),
            perUnit: round(toNumber(bom.std_total_cost) / output, 2),
        };
    }, [bom, formData.planned_quantity]);

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

    const handleSubmit = (e) => {
        e.preventDefault();

        const errs = {};
        if (!formData.warehouse_id) errs.warehouse_id = "Production warehouse is required";
        if (!formData.fg_product_id) errs.fg_product_id = "Finished good is required";
        if (!formData.planned_quantity || parseInt(formData.planned_quantity, 10) <= 0) {
            errs.planned_quantity = "Planned quantity must be at least 1";
        }
        if (!bom) errs.fg_product_id = bomError || "An ACTIVE production BOM is required";
        if (
            formData.planned_start_date &&
            formData.planned_end_date &&
            formData.planned_end_date < formData.planned_start_date
        ) {
            errs.planned_end_date = "Planned end cannot be before planned start";
        }

        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        setFormErrors({});

        onSubmit({
            warehouse_id: parseInt(formData.warehouse_id, 10),
            fg_product_id: parseInt(formData.fg_product_id, 10),
            production_bom_id: bom.id,
            planned_quantity: parseInt(formData.planned_quantity, 10),
            planned_start_date: formData.planned_start_date || null,
            planned_end_date: formData.planned_end_date || null,
            priority: formData.priority,
            remarks: formData.remarks || null,
        });
    };

    if (loadingOptions) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    const isSerializedFg = String(formData.fg_tracking_type || "").toUpperCase() === "SERIAL";

    return (
        <FormContainer className="flex-1 min-h-0 flex flex-col">
            <form
                id="production-order-form"
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
                        <AutocompleteField
                            label="Production Warehouse *"
                            placeholder="Type to search..."
                            options={warehouses}
                            getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                            value={
                                warehouses.find((w) => w.id === parseInt(formData.warehouse_id, 10)) ||
                                (formData.warehouse_id
                                    ? { id: parseInt(formData.warehouse_id, 10), name: "" }
                                    : null)
                            }
                            onChange={(e, newValue) =>
                                handleChange({ target: { name: "warehouse_id", value: newValue?.id ?? "" } })
                            }
                            required
                            error={!!formErrors.warehouse_id}
                            helperText={
                                formErrors.warehouse_id || "Components are consumed and the finished good received here"
                            }
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
                                    fg_tracking_type: newValue?.tracking_type ?? "LOT",
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
                                (isEdit ? "Finished good cannot change after creation" : "")
                            }
                        />
                        <Input
                            name="planned_quantity"
                            label="Planned Qty *"
                            type="number"
                            value={formData.planned_quantity}
                            onChange={handleChange}
                            inputProps={{ min: 1 }}
                            required
                            error={!!formErrors.planned_quantity}
                            helperText={
                                formErrors.planned_quantity ||
                                (isSerializedFg ? "Serialized finished good: one unit per booking" : "")
                            }
                        />
                        <Select
                            name="priority"
                            label="Priority"
                            value={formData.priority}
                            onChange={handleChange}
                            clearable={false}
                        >
                            {PRIORITY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <DateField
                            name="planned_start_date"
                            label="Planned Start"
                            value={formData.planned_start_date}
                            onChange={handleChange}
                        />
                        <DateField
                            name="planned_end_date"
                            label="Planned End"
                            value={formData.planned_end_date}
                            onChange={handleChange}
                            error={!!formErrors.planned_end_date}
                            helperText={formErrors.planned_end_date}
                        />
                        <div className="md:col-span-2">
                            <Input
                                name="remarks"
                                label="Remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                multiline
                                rows={1}
                            />
                        </div>
                    </FormGrid>

                    {bomError && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            {bomError}
                        </Alert>
                    )}

                    {bom && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/40 p-1.5 text-xs">
                            <span>
                                <span className="text-muted-foreground">BOM </span>
                                <span className="font-semibold">
                                    {bom.bom_code || `#${bom.id}`} v{bom.version_no}
                                </span>
                            </span>
                            <span>
                                <span className="text-muted-foreground">Output </span>
                                {bom.output_quantity} {bom.measurementUnit?.unit || ""}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Std cost / unit </span>
                                <span className="font-semibold">{plannedCost?.perUnit?.toFixed(2)}</span>
                            </span>
                            <span>
                                <span className="text-muted-foreground">Planned material </span>
                                {plannedCost?.material?.toFixed(2)}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Planned operations </span>
                                {plannedCost?.operation?.toFixed(2)}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Planned total </span>
                                <span className="font-semibold text-primary">{plannedCost?.total?.toFixed(2)}</span>
                            </span>
                        </div>
                    )}

                    <FormSection title="Component Requirement & Warehouse Availability" className="mt-1.5">
                        {loadingBom && (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                <CircularProgress size={22} />
                            </Box>
                        )}

                        {!loadingBom && shortageLines.length === 0 && (
                            <p className="py-2 text-xs text-muted-foreground">
                                Select a finished good with an ACTIVE BOM to see the component requirement.
                            </p>
                        )}

                        {!loadingBom && shortageLines.length > 0 && (
                            <>
                                {hasShortage && (
                                    <Alert severity="warning" sx={{ mb: 0.75 }}>
                                        Some mandatory components are short at this warehouse. The {AP.orders.singular.toLowerCase()} can still be
                                        created, but posting a booking will be blocked until stock is available.
                                    </Alert>
                                )}
                                <TableContainer component={Paper}>
                                    <Table size="small" sx={DENSE_TABLE_SX}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>#</TableCell>
                                                <TableCell>Component</TableCell>
                                                <TableCell align="right">Qty / Output</TableCell>
                                                <TableCell align="right">Scrap %</TableCell>
                                                <TableCell align="right">Required</TableCell>
                                                <TableCell align="right">On Hand</TableCell>
                                                <TableCell align="right">Available</TableCell>
                                                <TableCell align="right">Shortage</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {shortageLines.map((line, index) => (
                                                <TableRow
                                                    key={line.id}
                                                    sx={
                                                        line.shortage_quantity > 0 && !line.is_optional
                                                            ? { bgcolor: "error.light", opacity: 0.95 }
                                                            : undefined
                                                    }
                                                >
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>
                                                        {line.product_name}
                                                        {line.serial_required && (
                                                            <Chip
                                                                label="Serial"
                                                                size="small"
                                                                color="primary"
                                                                sx={{ ml: 0.75, height: 18 }}
                                                            />
                                                        )}
                                                        {line.is_optional && (
                                                            <Chip label="Optional" size="small" sx={{ ml: 0.75, height: 18 }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">{line.quantity_per}</TableCell>
                                                    <TableCell align="right">{line.scrap_percent}</TableCell>
                                                    <TableCell align="right">
                                                        {line.required_quantity} {line.unit}
                                                    </TableCell>
                                                    <TableCell align="right">{line.quantity_on_hand}</TableCell>
                                                    <TableCell align="right">{line.quantity_available}</TableCell>
                                                    <TableCell align="right">
                                                        {line.shortage_quantity > 0 ? (
                                                            <span className="font-semibold text-destructive">
                                                                {line.shortage_quantity}
                                                            </span>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
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
                <LoadingButton
                    type="submit"
                    form="production-order-form"
                    loading={loading}
                    className="min-w-[120px]"
                >
                    {isEdit ? "Update" : "Create"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
