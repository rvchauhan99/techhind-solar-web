"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Grid,
    MenuItem,
    Typography,
    FormControlLabel,
    Checkbox,
    Divider,
    FormHelperText,
} from "@mui/material";
import mastersService from "@/services/mastersService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Loader from "@/components/common/Loader";
import { COMPACT_FORM_SPACING, FORM_PADDING } from "@/utils/formConstants";

/**
 * Build product name for Panel type: Make PanelType Technology Capacity WP
 * e.g. "ADANI DCR TOPCON 11 WP"
 */
function getPanelProductName(formData, options) {
    if (!options?.productTypes?.length) return "";
    const selectedType = options.productTypes.find((t) => String(t.id) === String(formData.product_type_id));
    const selectedTypeName = selectedType?.name?.toLowerCase() ?? "";
    if (selectedTypeName !== "panel") return "";

    const makeName = (options.productMakes?.find((m) => String(m.id) === String(formData.product_make_id))?.name ?? "").trim();
    const techOpt = options.panelTechnologies?.find((p) => String(p.id) === String(formData.panel_technology_id));
    const techLabel = (techOpt?.label ?? techOpt?.name ?? "").trim();
    const panelType = String(formData.panel_type ?? "").trim();
    const capacity = formData.capacity != null && formData.capacity !== "" ? String(formData.capacity).trim() : "";

    const parts = [];
    if (makeName) parts.push(makeName);
    if (panelType) parts.push(panelType);
    if (techLabel) parts.push(techLabel);
    if (capacity) parts.push(`${capacity} WP`);
    return parts.join(" ");
}

export default function ProductForm({ defaultValues = {}, onSubmit, loading, serverError = null, onClearServerError = () => { }, onCancel = null, hideActions = false }) {
    const [formData, setFormData] = useState({
        product_type_id: "",
        product_make_id: "",
        product_name: "",
        product_description: "",
        hsn_ssn_code: "",
        measurement_unit_id: "",
        capacity: "",
        is_active: true,
        purchase_price: "",
        selling_price: "",
        mrp: "",
        gst_percent: "",
        min_stock_quantity: "",
        tracking_type: "LOT",
        serial_required: false,
        material: "",
        // panel_size: "",
        panel_type: "",
        panel_technology_id: "",
        // extra_size: "",
        extra_type: "",
        extra_warranty: "",
        additional_type: "",
        additional_warranty: "",
        additional_performance_warranty: "",
        ac_quantity: "",
        ac_description: "",
        dc_quantity: "",
        dc_description: "",


    });
    const [errors, setErrors] = useState({});

    const [options, setOptions] = useState({
        productTypes: [],
        productMakes: [],
        measurementUnits: [],
        panelTechnologies: [],
    });
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            // Get product type from properties key
            const typeName = defaultValues?.properties
                ? Object.keys(defaultValues.properties)[0]
                : null;

            // Extract properties based on detected type
            // let extra_size = "";
            let extra_type = "";
            let extra_warranty = "";

            if (typeName && defaultValues.properties?.[typeName]) {
                const props = defaultValues.properties[typeName];

                // extra_size = props.size ?? "";
                extra_type = props.type ?? "";
                extra_warranty = props.warranty ?? "";
            }

            let ac_quantity = "";
            let ac_description = "";
            let dc_quantity = "";
            let dc_description = "";
            const additional_type = defaultValues.properties?.additional?.type ?? "";
            const additional_warranty =
                defaultValues.properties?.additional?.warranty ??
                defaultValues.properties?.panel?.warranty ??
                "";
            const additional_performance_warranty =
                defaultValues.properties?.additional?.performance_warranty ??
                defaultValues.properties?.panel?.performance_warranty ??
                "";
            // if (typeName === "cable" && defaultValues.properties?.cable) {
            //     const props = defaultValues.properties.cable;

            //     ac_quantity = props.ac_quantity ?? "";
            //     ac_description = props.ac_description ?? "";
            //     dc_quantity = props.dc_quantity ?? "";
            //     dc_description = props.dc_description ?? "";
            // }
            if (typeName == "ac_cable") {
                ac_quantity = defaultValues.properties.ac_cable.ac_quantity ?? "";
            }
            if (typeName == "dc_cable") {
                dc_quantity = defaultValues.properties.dc_cable.dc_quantity ?? ""
            }


            setFormData({
                product_type_id: defaultValues.product_type_id ?? "",
                product_make_id: defaultValues.product_make_id ?? "",
                product_name: defaultValues.product_name ?? "",
                product_description: defaultValues.product_description ?? "",
                hsn_ssn_code: defaultValues.hsn_ssn_code ?? "",
                measurement_unit_id: defaultValues.measurement_unit_id ?? "",
                capacity: defaultValues.capacity ?? "",
                is_active: defaultValues.is_active !== undefined ? defaultValues.is_active : true,
                purchase_price: defaultValues.purchase_price ?? "",
                selling_price: defaultValues.selling_price ?? "",
                mrp: defaultValues.mrp ?? "",
                gst_percent: defaultValues.gst_percent ?? "",
                min_stock_quantity: defaultValues.min_stock_quantity ?? "",
                tracking_type: defaultValues.tracking_type ? defaultValues.tracking_type.toUpperCase() : "LOT",
                serial_required: defaultValues.tracking_type ? defaultValues.tracking_type.toUpperCase() === "SERIAL" : false,
                material: defaultValues.properties?.structure?.material ?? "",
                warranty: defaultValues.properties?.structure?.warranty ?? "",
                // panel_size: defaultValues.properties?.panel?.size ?? "",
                panel_type: defaultValues.properties?.panel?.type ?? "",
                panel_technology_id: defaultValues.properties?.panel?.panel_technology_id ?? "",
                // extra_size,
                extra_type,
                extra_warranty,
                additional_type,
                additional_warranty,
                additional_performance_warranty,
                ac_quantity,
                ac_description,
                dc_quantity,
                dc_description,

            });
        }
    }, [defaultValues]);

    useEffect(() => {
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const [productTypesRes, measurementUnitsRes, panelTechnologiesRes] = await Promise.all([
                    mastersService.getReferenceOptions("product_type.model"),
                    mastersService.getReferenceOptions("measurement_unit.model"),
                    mastersService.getReferenceOptions("panel_technology.model"),
                ]);

                // Handle response structure - same as MasterForm
                // API returns { result: [...] } or direct array
                const productTypesData = productTypesRes?.result || productTypesRes?.data || productTypesRes || [];
                const measurementUnitsData = measurementUnitsRes?.result || measurementUnitsRes?.data || measurementUnitsRes || [];
                const panelTechnologiesData = panelTechnologiesRes?.result || panelTechnologiesRes?.data || panelTechnologiesRes || [];

                setOptions({
                    productTypes: Array.isArray(productTypesData) ? productTypesData : [],
                    productMakes: [], // Will be loaded when product_type_id is selected
                    measurementUnits: Array.isArray(measurementUnitsData) ? measurementUnitsData : [],
                    panelTechnologies: Array.isArray(panelTechnologiesData) ? panelTechnologiesData : [],
                });
            } catch (err) {
                console.error("Failed to load reference options", err);
            } finally {
                setLoadingOptions(false);
            }
        };

        loadOptions();
    }, []);

    // Load product makes when product type is selected (works for both new and edit mode)
    useEffect(() => {
        const loadProductMakes = async () => {
            // Use formData.product_type_id (from selection or defaultValues) or defaultValues.product_type_id (initial edit load)
            const productTypeId = formData.product_type_id || defaultValues?.product_type_id;

            if (!productTypeId) {
                setOptions((prev) => ({ ...prev, productMakes: [] }));
                if (!formData.product_type_id && !defaultValues?.product_type_id) {
                    setFormData((prev) => ({ ...prev, product_make_id: "" }));
                }
                return;
            }

            try {
                const response = await mastersService.getReferenceOptions("product_make.model");
                const raw = response?.result ?? response?.data ?? response;
                const allProductMakes = Array.isArray(raw) ? raw : [];
                const productTypeIdStr = String(productTypeId);
                const filteredMakes = allProductMakes.filter(
                    (make) => make != null && String(make.product_type_id) === productTypeIdStr
                );
                setOptions((prev) => ({ ...prev, productMakes: filteredMakes }));
            } catch (err) {
                console.error("Failed to load product makes", err);
                setOptions((prev) => ({ ...prev, productMakes: [] }));
            }
        };

        loadProductMakes();
    }, [formData.product_type_id, defaultValues?.product_type_id]);

    // Auto-generate product name for Panel type from Make, Panel Type, Panel Technology, Capacity
    useEffect(() => {
        const generatedName = getPanelProductName(formData, options);
        if (generatedName) {
            setFormData((prev) => ({ ...prev, product_name: generatedName }));
        }
    }, [
        formData.product_type_id,
        formData.product_make_id,
        formData.panel_type,
        formData.panel_technology_id,
        formData.capacity,
        options.productTypes,
        options.productMakes,
        options.panelTechnologies,
    ]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Handle tracking_type change - automatically set serial_required
        if (name === "tracking_type") {
            const normalizedTrackingType = value ? value.toUpperCase() : "LOT";
            setFormData((prev) => ({
                ...prev,
                tracking_type: normalizedTrackingType,
                serial_required: normalizedTrackingType === "SERIAL", // If SERIAL, set to true, else false
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            }));
        }

        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (serverError) {
            onClearServerError();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate required fields
        const selectedType = options.productTypes.find(
            (type) => String(type.id) === String(formData.product_type_id)
        );
        const selectedTypeName = selectedType?.name?.toLowerCase() ?? "";
        const validationErrors = {};
        if (!formData.product_type_id) validationErrors.product_type_id = "Product Type is required";
        if (!formData.product_make_id) validationErrors.product_make_id = "Product Make is required";
        if (!formData.product_name) validationErrors.product_name = "Product Name is required";
        if (!formData.measurement_unit_id) validationErrors.measurement_unit_id = "Measurement Unit is required";
        // if (!formData.purchase_price) validationErrors.purchase_price = "Purchase Price is required";
        // if (formData.purchase_price && Number(formData.purchase_price) <= 0) {
        //     validationErrors.purchase_price = "Purchase Price must be greater than 0";
        // }
        // if (!formData.selling_price) validationErrors.selling_price = "Selling Price is required";
        // if (formData.selling_price && Number(formData.selling_price) <= 0) {
        //     validationErrors.selling_price = "Selling Price must be greater than 0";
        // }
        // if (!formData.mrp) validationErrors.mrp = "MRP is required";
        // if (formData.mrp && Number(formData.mrp) <= 0) {
        //     validationErrors.mrp = "MRP must be greater than 0";
        // }
        if (!formData.gst_percent) validationErrors.gst_percent = "GST Percent is required";
        if (formData.gst_percent && Number(formData.gst_percent) < 0) {
            validationErrors.gst_percent = "GST Percent cannot be negative";
        }
        if (formData.min_stock_quantity && Number(formData.min_stock_quantity) < 0) {
            validationErrors.min_stock_quantity = "Min Stock Quantity cannot be negative";
        }
        if (selectedTypeName === "panel") {
            const panelTypeValue = formData.panel_type?.toUpperCase();
            if (!panelTypeValue) {
                validationErrors.panel_type = "Panel Type is required";
            } else if (!["DCR", "NON DCR"].includes(panelTypeValue)) {
                validationErrors.panel_type = "Panel Type must be DCR or NON DCR";
            }
        }

        // Validate tracking_type
        if (!formData.tracking_type) {
            validationErrors.tracking_type = "Tracking Type is required";
        } else {
            const normalizedTrackingType = formData.tracking_type.toUpperCase();
            if (normalizedTrackingType !== "LOT" && normalizedTrackingType !== "SERIAL") {
                validationErrors.tracking_type = "Tracking Type must be either LOT or SERIAL";
            } else {
                // Ensure serial_required matches tracking_type
                const expectedSerialRequired = normalizedTrackingType === "SERIAL";
                if (formData.serial_required !== expectedSerialRequired) {
                    // Auto-correct serial_required to match tracking_type
                    setFormData((prev) => ({
                        ...prev,
                        tracking_type: normalizedTrackingType,
                        serial_required: expectedSerialRequired,
                    }));
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});

        // Prepare payload
        const normalizedTrackingType = formData.tracking_type ? formData.tracking_type.toUpperCase() : "LOT";
        const payload = {
            ...formData,
            tracking_type: normalizedTrackingType,
            serial_required: normalizedTrackingType === "SERIAL", // Ensure consistency
            capacity: formData.capacity ? Number(formData.capacity) : null,
            purchase_price: Number(formData.purchase_price),
            selling_price: Number(formData.selling_price),
            mrp: Number(formData.mrp),
            gst_percent: Number(formData.gst_percent),
            min_stock_quantity: formData.min_stock_quantity ? Number(formData.min_stock_quantity) : 0,
        };

        // Add properties based on product type
        const payloadProperties = {};
        if (selectedTypeName === "structure") {
            payloadProperties.structure = {
                material: formData.material,
                warranty: formData.extra_warranty
            };
        } else if (selectedTypeName === "panel") {
            payloadProperties.panel = {
                // size: formData.panel_size ? Number(formData.panel_size) : null,
                type: formData.panel_type,
                panel_technology_id: formData.panel_technology_id ? Number(formData.panel_technology_id) : null,
            };
        }
        const typeName = selectedTypeName.replace(/\s+/g, "_");
        // Build properties object based on product type
        if (["inverter", "hybrid_inverter", "earthing", "acdb", "dcdb", "la"].includes(typeName)) {
            payloadProperties[typeName] = {
                // size: formData.extra_size ? Number(formData.extra_size) : null,
                warranty: formData.extra_warranty || null
            };
        }

        else if (typeName === "battery") {
            payloadProperties.battery = {
                // size: formData.extra_size ? Number(formData.extra_size) : null,
                type: formData.extra_type || null,
                warranty: formData.extra_warranty || null
            };
        } else if (typeName == "ac_cable") {
            payloadProperties.ac_cable = {
                ac_quantity: formData.ac_quantity ? Number(formData.ac_quantity) : null,
                warranty: formData.extra_warranty || null
            };
        } else if (typeName == "dc_cable") {
            payloadProperties.dc_cable = {
                dc_quantity: formData.dc_quantity ? Number(formData.dc_quantity) : null,
                warranty: formData.extra_warranty || null
            };
        }

        payloadProperties.additional = {
            type: formData.additional_type || null,
            warranty: formData.additional_warranty || null,
            performance_warranty: formData.additional_performance_warranty || null
        };

        payload.properties = payloadProperties;

        // else if (typeName === "cable") {
        //     payload.properties = {
        //         cable: {
        //             ac_quantity: formData.ac_quantity ? Number(formData.ac_quantity) : null,
        //             ac_description: formData.ac_description || "",
        //             dc_quantity: formData.dc_quantity ? Number(formData.dc_quantity) : null,
        //             dc_description: formData.dc_description || ""
        //         }
        //     };
        // }




        // Remove temporary fields
        delete payload.material;
        // delete payload.panel_size;
        delete payload.panel_type;
        delete payload.panel_technology_id;
        // delete payload.extra_size;
        delete payload.extra_type;
        delete payload.extra_warranty;
        delete payload.additional_type;
        delete payload.additional_warranty;
        delete payload.additional_performance_warranty;
        delete payload.ac_quantity;
        delete payload.ac_description;
        delete payload.dc_quantity;
        delete payload.dc_description;



        onSubmit(payload);
    };

    if (loadingOptions) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader />
            </div>
        );
    }

    const selectedType = options.productTypes.find(
        (type) => String(type.id) === String(formData.product_type_id)
    );
    const selectedTypeName = selectedType?.name?.toLowerCase() ?? "";

    return (
        <FormContainer>
            <Box component="form" id="product-form" onSubmit={handleSubmit} sx={{ p: FORM_PADDING }}>
                {serverError && (
                    <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2">
                        <span>{serverError}</span>
                        <button type="button" onClick={onClearServerError} className="shrink-0 text-destructive hover:underline" aria-label="Dismiss">×</button>
                    </div>
                )}

                <Grid container spacing={COMPACT_FORM_SPACING}>
                    {/* Product Type */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="product_type_id"
                            label="Product Type"
                            value={formData.product_type_id}
                            onChange={handleChange}
                            required
                            error={!!errors.product_type_id}
                            helperText={errors.product_type_id}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.productTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>

                    {/* Product Make */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="product_make_id"
                            label="Product Make"
                            value={formData.product_make_id}
                            onChange={handleChange}
                            required
                            disabled={!formData.product_type_id}
                            error={!!errors.product_make_id}
                            helperText={errors.product_make_id}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.productMakes.map((make) => (
                                <MenuItem key={make.id} value={make.id}>
                                    {make.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>

                    {/* Panel Type (Panel Only) */}
                    {selectedTypeName === "panel" && (
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                name="panel_type"
                                label="Panel Type"
                                value={formData.panel_type}
                                onChange={handleChange}
                                required
                                error={!!errors.panel_type}
                                helperText={errors.panel_type}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                <MenuItem value="DCR">DCR</MenuItem>
                                <MenuItem value="NON DCR">NON DCR</MenuItem>
                            </Select>
                        </Grid>
                    )}

                    {/* Product Technology (Panel Only) */}
                    {selectedTypeName === "panel" && (
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                name="panel_technology_id"
                                label="Product Technology"
                                value={formData.panel_technology_id}
                                onChange={handleChange}
                                error={!!errors.panel_technology_id}
                                helperText={errors.panel_technology_id}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.panelTechnologies.map((opt) => (
                                    <MenuItem key={opt.id} value={opt.id}>
                                        {opt.label ?? opt.name ?? opt.id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                    )}

                    {/* Capacity */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="capacity"
                            label="Capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={handleChange}
                            inputProps={{ min: 0, step: 0.01 }}
                            error={!!errors.capacity}
                            helperText={errors.capacity}
                        />
                    </Grid>

                    {/* Product Name */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="product_name"
                            label="Product Name"
                            value={formData.product_name}
                            onChange={handleChange}
                            required
                            error={!!errors.product_name}
                            helperText={errors.product_name}
                        />
                    </Grid>

                    {/* HSN/SSN Code */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="hsn_ssn_code"
                            label="HSN/SSN Code"
                            value={formData.hsn_ssn_code}
                            onChange={handleChange}
                            error={!!errors.hsn_ssn_code}
                            helperText={errors.hsn_ssn_code}
                        />
                    </Grid>


                    {/* Measurement Unit */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="measurement_unit_id"
                            label="Measurement Unit"
                            value={formData.measurement_unit_id}
                            onChange={handleChange}
                            required
                            error={!!errors.measurement_unit_id}
                            helperText={errors.measurement_unit_id}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.measurementUnits.map((unit) => (
                                <MenuItem key={unit.id} value={unit.id}>
                                    {unit.unit}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>

                    {/* Tracking Type */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="tracking_type"
                            label="Tracking Type"
                            value={formData.tracking_type}
                            onChange={handleChange}
                            required
                            error={!!errors.tracking_type}
                            helperText={errors.tracking_type}
                        >
                            <MenuItem value="LOT">LOT</MenuItem>
                            <MenuItem value="SERIAL">SERIAL</MenuItem>
                        </Select>
                    </Grid>

                    {/* Serial Required - Auto-set based on tracking_type, but show for visibility */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="serial_required"
                                    checked={formData.serial_required}
                                    disabled={true} // Disabled because it's auto-set based on tracking_type
                                    sx={{
                                        "&.Mui-disabled": {
                                            color: formData.tracking_type === "SERIAL" ? "primary.main" : "action.disabled"
                                        }
                                    }}
                                />
                            }
                            label={`Serial Required ${formData.tracking_type === "SERIAL" ? "(Auto)" : ""}`}
                        />
                        <FormHelperText sx={{ ml: 0, mt: 0.5 }}>
                            {formData.tracking_type === "SERIAL"
                                ? "Automatically enabled for SERIAL tracking"
                                : "Disabled for LOT tracking"}
                        </FormHelperText>
                    </Grid>

                    {/* Is Active */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                />
                            }
                            label="Is Active"
                        />
                    </Grid>



                    {/* <Grid item size={12}>
                    <Divider sx={{ my: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Price Details
                        </Typography>
                    </Divider>
                </Grid> */}

                    {/* Purchase Price */}
                    {/* <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        name="purchase_price"
                        label="Purchase Price"
                        type="number"
                        value={formData.purchase_price}
                        onChange={handleChange}
                        inputProps={{ min: 0, step: 0.01 }}
                        required
                        error={!!errors.purchase_price}
                        helperText={errors.purchase_price}
                    />
                </Grid> */}

                    {/* Selling Price */}
                    {/* <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        name="selling_price"
                        label="Selling Price"
                        type="number"
                        value={formData.selling_price}
                        onChange={handleChange}
                        inputProps={{ min: 0, step: 0.01 }}
                        required
                        error={!!errors.selling_price}
                        helperText={errors.selling_price}
                    />
                </Grid> */}

                    {/* MRP */}
                    {/* <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        name="mrp"
                        label="MRP"
                        type="number"
                        value={formData.mrp}
                        onChange={handleChange}
                        inputProps={{ min: 0, step: 0.01 }}
                        required
                        error={!!errors.mrp}
                        helperText={errors.mrp}
                    />
                </Grid> */}

                    {/* GST Percent */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="gst_percent"
                            label="GST Percent"
                            type="number"
                            value={formData.gst_percent}
                            onChange={handleChange}
                            inputProps={{ min: 0, step: 0.01 }}
                            required
                            error={!!errors.gst_percent}
                            helperText={errors.gst_percent}
                        />
                    </Grid>

                    {/* <Grid item size={12}>
                    <Divider sx={{ my: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Stock Details
                        </Typography>
                    </Divider>
                </Grid> */}

                    {/* Min Stock Quantity */}
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="min_stock_quantity"
                            label="Min Stock Quantity"
                            type="number"
                            value={formData.min_stock_quantity}
                            onChange={handleChange}
                            inputProps={{ min: 0 }}
                            error={!!errors.min_stock_quantity}
                            helperText={errors.min_stock_quantity}
                        />
                    </Grid>

                    {/* Product Description */}
                    <Grid item size={12}>
                        <Input
                            name="product_description"
                            label="Product Description"
                            value={formData.product_description}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            error={!!errors.product_description}
                            helperText={errors.product_description}
                        />
                    </Grid>

                    {/* Additional Details Section (All Products) */}
                    <Grid item size={12}>
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                Additional Details
                            </Typography>
                        </Divider>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="additional_type"
                            label="Type"
                            value={formData.additional_type}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="additional_warranty"
                            label="Warranty"
                            value={formData.additional_warranty}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            name="additional_performance_warranty"
                            label="Performance Warranty"
                            value={formData.additional_performance_warranty}
                            onChange={handleChange}
                        />
                    </Grid>

                    {/* Structure Details */}
                    {selectedTypeName === "structure" && (
                        <>
                            <Grid item size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Structure Details
                                    </Typography>
                                </Divider>
                            </Grid>
                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="material"
                                    label="Material"
                                    value={formData.material}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_warranty"
                                    label="Warranty"
                                    value={formData.extra_warranty}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </>
                    )}

                    {/* Inverter/Hybrid/Earthing/ACDB/DCDB/LA Details */}
                    {["inverter", "hybrid inverter", "earthing", "acdb", "dcdb", "la"].includes(
                        selectedTypeName
                    ) && (
                            <>
                                <Grid item size={12}>
                                    <Divider sx={{ my: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Type Details
                                        </Typography>
                                    </Divider>
                                </Grid>

                                {/* <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_size"
                                    label="Size"
                                    type="number"
                                    value={formData.extra_size}
                                    onChange={handleChange}
                                />
                            </Grid> */}

                                <Grid item size={{ xs: 12, md: 3 }}>
                                    <Input
                                        name="extra_warranty"
                                        label="Warranty"
                                        value={formData.extra_warranty}
                                        onChange={handleChange}
                                    />
                                </Grid>
                            </>
                        )}

                    {/* Battery Details */}
                    {selectedTypeName === "battery" && (
                        <>
                            <Grid item size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Battery Details
                                    </Typography>
                                </Divider>
                            </Grid>

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="extra_size"
                                label="Size"
                                type="number"
                                value={formData.extra_size}
                                onChange={handleChange}
                            />
                        </Grid> */}

                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_type"
                                    label="Type"
                                    value={formData.extra_type}
                                    onChange={handleChange}
                                />
                            </Grid>

                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_warranty"
                                    label="Warranty"
                                    value={formData.extra_warranty}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </>
                    )}

                    {/* AC Cable Details */}
                    {selectedTypeName === "ac cable" && (
                        <>
                            <Grid item size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        AC Cable Details
                                    </Typography>
                                </Divider>
                            </Grid>

                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="ac_quantity"
                                    label="AC Quantity"
                                    value={formData.ac_quantity}
                                    onChange={handleChange}
                                />
                            </Grid>

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="ac_description"
                                label="AC Description"
                                value={formData.ac_description}
                                onChange={handleChange}
                            />
                        </Grid> */}

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="dc_quantity"
                                label="DC Quantity"
                                value={formData.dc_quantity}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="dc_description"
                                label="DC Description"
                                value={formData.dc_description}
                                onChange={handleChange}
                            />
                        </Grid> */}
                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_warranty"
                                    label="Warranty"
                                    value={formData.extra_warranty}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </>
                    )}

                    {/* DC Cable Details */}
                    {selectedTypeName === "dc cable" && (
                        <>
                            <Grid item size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        DC Cable Details
                                    </Typography>
                                </Divider>
                            </Grid>

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="ac_quantity"
                                label="AC Quantity"
                                value={formData.ac_quantity}
                                onChange={handleChange}
                            />
                        </Grid> */}

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="ac_description"
                                label="AC Description"
                                value={formData.ac_description}
                                onChange={handleChange}
                            />
                        </Grid> */}

                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="dc_quantity"
                                    label="DC Quantity"
                                    value={formData.dc_quantity}
                                    onChange={handleChange}
                                />
                            </Grid>

                            {/* <Grid item size={{ xs: 12, md: 3 }}>
                            <Input
                                name="dc_description"
                                label="DC Description"
                                value={formData.dc_description}
                                onChange={handleChange}
                            />
                        </Grid> */}
                            <Grid item size={{ xs: 12, md: 3 }}>
                                <Input
                                    name="extra_warranty"
                                    label="Warranty"
                                    value={formData.extra_warranty}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </>
                    )}


                </Grid>
            </Box>

            {!hideActions && (
                <FormActions>
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <LoadingButton
                        type="submit"
                        form="product-form"
                        loading={loading}
                        className="min-w-[120px]"
                    >
                        {defaultValues?.id ? "Update" : "Add"}
                    </LoadingButton>
                </FormActions>
            )}
        </FormContainer>
    );
}

