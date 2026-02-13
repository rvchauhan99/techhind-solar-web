"use client";

import { Grid, MenuItem } from "@mui/material";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { COMPACT_FORM_SPACING } from "@/utils/formConstants";
import MakeAutocomplete from "./MakeAutocomplete";

function productTypeMatches(product, typeName) {
    const name = (product?.productType?.name || product?.productTypeName || "").toString().toLowerCase();
    return name === (typeName || "").toLowerCase();
}

/** Build fallback display object from API product: { id: product_make_id, name: product_make_name }. Do not depend on options. */
function toFallbackMake(product) {
    if (!product) return null;
    const id = product.product_make_id ?? product.productMake?.id;
    if (id == null) return null;
    const name = product.product_make_name ?? product.productMake?.name ?? "";
    return { id, name };
}

function getProducts(products, typeName) {
    const list = Array.isArray(products) ? products : [];
    return list.filter((p) => productTypeMatches(p, typeName));
}

export default function TechnicalSection({
    section,
    formData,
    options,
    productMakes,
    fallbackBySection,
    disabled: projectPriceDisabled,
    handleChange,
    handleAutocompleteChange,
    patchForm,
}) {
    const products = options?.products || [];
    const getFallback = (key) => fallbackBySection?.[key] ?? null;
    /** Fallback for display: BOM product first, else currently selected product (manual flow). */
    const getFallbackMake = (sectionKey, selectedProductId) => {
        const fromBom = toFallbackMake(getFallback(sectionKey));
        if (fromBom) return fromBom;
        const selected = products.find((p) => p.id == selectedProductId);
        return toFallbackMake(selected) ?? null;
    };
    const disabled = !!projectPriceDisabled;
    const disabledSx = disabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined;

    switch (section.key) {
        case "structure":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="structure_product"
                            label="Product"
                            value={formData.structure_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    structure_material: findProduct?.properties?.structure?.material ?? "",
                                    structure_product: e.target.value,
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "structure").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Height" name="structure_height" value={formData.structure_height} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Material" name="structure_material" value={formData.structure_material} onChange={handleChange} />
                    </Grid>
                </Grid>
            );

        case "panel":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="panel_product"
                            label="Product"
                            value={formData.panel_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    panel_product: e.target.value,
                                    panel_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    panel_size: findProduct?.capacity ?? "",
                                    panel_type: findProduct?.properties?.panel?.type ?? "",
                                    panel_warranty: findProduct?.properties?.panel?.warranty ?? "",
                                    panel_performance_warranty: findProduct?.properties?.panel?.performance_warranty ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "panel").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Size" name="panel_size" value={formData.panel_size} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input
                            fullWidth
                            type="number"
                            label="Quantity"
                            name="panel_quantity"
                            value={formData.panel_quantity}
                            onChange={(e) => {
                                handleChange(e);
                                const findProduct = products.find((p) => p.id == formData.panel_product);
                                const qty = e.target.value;
                                patchForm({
                                    panel_quantity: qty,
                                    project_capacity: (((findProduct?.capacity ?? 0) * (qty ?? 0)) / 1000).toFixed(2),
                                });
                            }}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <MakeAutocomplete
                            label="Panel Make"
                            valueIds={formData.panel_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("panel", formData.panel_product)}
                            onChange={(ids) => handleAutocompleteChange("panel_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Type" name="panel_type" value={formData.panel_type} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Warranty" name="panel_warranty" value={formData.panel_warranty} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Performance Warranty" name="panel_performance_warranty" value={formData.panel_performance_warranty} onChange={handleChange} />
                    </Grid>
                </Grid>
            );

        case "inverter":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="inverter_product"
                            label="Product"
                            value={formData.inverter_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    inverter_product: e.target.value,
                                    inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    inverter_size: findProduct?.capacity ?? "",
                                    inverter_warranty: findProduct?.properties?.inverter?.warranty ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "inverter").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Size" name="inverter_size" value={formData.inverter_size} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth type="number" label="Quantity" name="inverter_quantity" value={formData.inverter_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <MakeAutocomplete
                            label="Inverter Make"
                            valueIds={formData.inverter_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("inverter", formData.inverter_product)}
                            onChange={(ids) => handleAutocompleteChange("inverter_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Warranty" name="inverter_warranty" value={formData.inverter_warranty} onChange={handleChange} />
                    </Grid>
                </Grid>
            );

        case "battery":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="battery_product"
                            label="Product"
                            value={formData.battery_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    battery_product: e.target.value,
                                    battery_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    battery_size: findProduct?.capacity ?? "",
                                    battery_type: findProduct?.properties?.battery?.type ?? "",
                                    battery_warranty: findProduct?.properties?.battery?.warranty ?? "",
                                    battery_description_text: findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "battery").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Size" name="battery_size" value={formData.battery_size} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth type="number" label="Quantity" name="battery_quantity" value={formData.battery_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <MakeAutocomplete
                            label="Battery Make"
                            valueIds={formData.battery_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("battery", formData.battery_product)}
                            onChange={(ids) => handleAutocompleteChange("battery_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Type" name="battery_type" value={formData.battery_type} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Warranty" name="battery_warranty" value={formData.battery_warranty} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Battery Description Text" name="battery_description_text" value={formData.battery_description_text} onChange={handleChange} multiline rows={2} />
                    </Grid>
                </Grid>
            );

        case "hybridInverter":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="hybrid_inverter_product"
                            label="Product"
                            value={formData.hybrid_inverter_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    hybrid_inverter_product: e.target.value,
                                    hybrid_inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    hybrid_inverter_size: findProduct?.capacity ?? "",
                                    hybrid_inverter_warranty: findProduct?.properties?.hybrid_inverter?.warranty ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "hybrid inverter").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Size" name="hybrid_inverter_size" value={formData.hybrid_inverter_size} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth type="number" label="Quantity" name="hybrid_inverter_quantity" value={formData.hybrid_inverter_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <MakeAutocomplete
                            label="Hybrid Inverter Make"
                            valueIds={formData.hybrid_inverter_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("hybridInverter", formData.hybrid_inverter_product)}
                            onChange={(ids) => handleAutocompleteChange("hybrid_inverter_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Warranty" name="hybrid_inverter_warranty" value={formData.hybrid_inverter_warranty} onChange={handleChange} />
                    </Grid>
                </Grid>
            );

        case "acdb":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="acdb_product"
                            label="Product"
                            value={formData.acdb_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    acdb_product: e.target.value,
                                    acdb_quantity: findProduct?.properties?.acdb?.quantity ?? "",
                                    acdb_description: findProduct?.properties?.acdb?.description ?? findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "acdb").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Quantity" name="acdb_quantity" value={formData.acdb_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Description" name="acdb_description" value={formData.acdb_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "dcdb":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Select
                            fullWidth
                            name="dcdb_product"
                            label="Product"
                            value={formData.dcdb_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    dcdb_product: e.target.value,
                                    dcdb_quantity: findProduct?.properties?.dcdb?.quantity ?? "",
                                    dcdb_description: findProduct?.properties?.dcdb?.description ?? findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "dcdb").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Quantity" name="dcdb_quantity" value={formData.dcdb_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Description" name="dcdb_description" value={formData.dcdb_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "cable":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            fullWidth
                            name="cable_ac_product"
                            label="Ac Cable"
                            value={formData.cable_ac_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    cable_ac_product: e.target.value,
                                    cable_ac_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    cable_ac_quantity: findProduct?.properties?.ac_cable?.ac_quantity ?? "",
                                    cable_ac_description: findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "ac cable").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="AC Quantity" name="cable_ac_quantity" value={formData.cable_ac_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <MakeAutocomplete
                            label="AC Make"
                            valueIds={formData.cable_ac_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("cable_ac", formData.cable_ac_product)}
                            onChange={(ids) => handleAutocompleteChange("cable_ac_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="AC Description" name="cable_ac_description" value={formData.cable_ac_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            fullWidth
                            name="cable_dc_product"
                            label="Product"
                            value={formData.cable_dc_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    cable_dc_product: e.target.value,
                                    cable_dc_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    cable_dc_quantity: findProduct?.properties?.dc_cable?.dc_quantity ?? "",
                                    cable_dc_description: findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "dc cable").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="DC Quantity" name="cable_dc_quantity" value={formData.cable_dc_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <MakeAutocomplete
                            label="DC Make"
                            valueIds={formData.cable_dc_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("cable_dc", formData.cable_dc_product)}
                            onChange={(ids) => handleAutocompleteChange("cable_dc_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="DC Description" name="cable_dc_description" value={formData.cable_dc_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "earthing":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            fullWidth
                            name="earthing_product"
                            label="Product"
                            value={formData.earthing_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    earthing_product: e.target.value,
                                    earthing_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    earthing_quantity: findProduct?.properties?.earthing?.quantity ?? "",
                                    earthing_description: findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "earthing").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Quantity" name="earthing_quantity" value={formData.earthing_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <MakeAutocomplete
                            label="Earthing Make"
                            valueIds={formData.earthing_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("earthing", formData.earthing_product)}
                            onChange={(ids) => handleAutocompleteChange("earthing_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Description" name="earthing_description" value={formData.earthing_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "la":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            fullWidth
                            name="la_product"
                            label="Product"
                            value={formData.la_product || ""}
                            disabled={disabled}
                            onChange={(e) => {
                                const findProduct = products.find((p) => p.id == e.target.value);
                                patchForm({
                                    la_product: e.target.value,
                                    la_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    la_quantity: findProduct?.properties?.la?.quantity ?? "",
                                    la_description: findProduct?.product_description ?? "",
                                });
                            }}
                            sx={disabledSx}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {getProducts(products, "la").map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.product_name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Quantity" name="la_quantity" value={formData.la_quantity} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <MakeAutocomplete
                            label="LA Make"
                            valueIds={formData.la_make_ids || []}
                            options={productMakes}
                            fallbackMake={getFallbackMake("la", formData.la_product)}
                            onChange={(ids) => handleAutocompleteChange("la_make_ids", ids)}
                            disabled={false}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Description" name="la_description" value={formData.la_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "additionalDescriptions":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Input fullWidth label="MIS Description" name="mis_description" value={formData.mis_description} onChange={handleChange} multiline rows={2} />
                    </Grid>
                </Grid>
            );

        default:
            return null;
    }
}
