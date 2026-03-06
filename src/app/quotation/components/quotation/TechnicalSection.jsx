"use client";

import { Grid, Button } from "@mui/material";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import MakeAutocomplete from "./MakeAutocomplete";

const COMPACT_FORM_SPACING = 0.5;

function toId(v) {
    if (v === "" || v === null || v === undefined) return "";
    return String(v);
}

function normalizeType(v) {
    return (v || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
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
    const want = normalizeType(typeName);
    return list.filter((p) => normalizeType(p?.productType?.name || p?.productTypeName || "") === want);
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

    const getMakeNameByProductId = (productId) => {
        const id = productId != null && productId !== "" ? Number(productId) : null;
        if (!id) return "";
        const p = products.find((pp) => pp.id == id);
        return p?.product_make_name ?? p?.productMake?.name ?? "";
    };

    const coerceItems = (items, fallbackSingle) => {
        if (Array.isArray(items) && items.length > 0) return items;
        if (!fallbackSingle) return [];
        const pid = fallbackSingle.product_id ?? "";
        const qty = fallbackSingle.quantity ?? "";
        const desc = fallbackSingle.description ?? "";
        if (pid === "" && qty === "" && desc === "") return [];
        return [{ product_id: pid, quantity: qty, description: desc }];
    };

    const updateItems = (field, nextItems, scalarMap) => {
        const clean = Array.isArray(nextItems) ? nextItems : [];
        const patch = { [field]: clean };
        if (scalarMap) {
            const first = clean[0] || { product_id: "", quantity: "", description: "" };
            Object.assign(patch, scalarMap(first));
        }
        patchForm(patch);
    };

    const renderMultiRows = ({ field, typeName, labelBase, qtyLabel, makeLabel, descLabel, scalarMap, fallbackSingle, allowMultiple = true, onPickProduct }) => {
        const items = coerceItems(formData[field], fallbackSingle);
        const baseItems = items.length > 0 ? items : (disabled ? [] : [{ product_id: "", quantity: "", description: "" }]);
        const showItems = allowMultiple ? baseItems : baseItems.slice(0, 1);
        const typeProducts = getProducts(products, typeName);

        return (
            <>
                {showItems.map((item, idx) => {
                    const namePrefix = field.replace(/_items$/, "");
                    const productId = item?.product_id ?? "";
                    const makeName = getMakeNameByProductId(productId);
                    return (
                        <Grid container spacing={COMPACT_FORM_SPACING} key={`${field}-${idx}`} sx={{ mb: 0.5 }}>
                            <Grid item size={{ xs: 12, md: 3 }}>
                                <AutocompleteField
                                    fullWidth
                                    name={`${namePrefix}_${idx}_product`}
                                    label={idx === 0 ? labelBase : `${labelBase} ${idx + 1}`}
                                    options={typeProducts}
                                    getOptionLabel={(p) => p?.product_name ?? ""}
                                    value={typeProducts.find((p) => p.id == productId) || (productId ? { id: productId } : null)}
                                    onChange={(e, newValue) => {
                                        const next = [...showItems];
                                        const picked = newValue || null;
                                        const base = { ...(next[idx] || {}), product_id: toId(picked?.id ?? "") };
                                        next[idx] = typeof onPickProduct === "function" ? onPickProduct(base, picked) : base;
                                        updateItems(field, next, scalarMap);
                                    }}
                                    placeholder="Type to search..."
                                    disabled={disabled}
                                    sx={disabledSx}
                                />
                            </Grid>
                            <Grid item size={{ xs: 12, md: 2 }}>
                                <Input
                                    fullWidth
                                    label={qtyLabel}
                                    name={`${namePrefix}_${idx}_quantity`}
                                    value={item?.quantity ?? ""}
                                    onChange={(e) => {
                                        const next = [...showItems];
                                        next[idx] = { ...(next[idx] || {}), quantity: e.target.value ?? "" };
                                        updateItems(field, next, scalarMap);
                                    }}
                                    disabled={disabled}
                                    sx={disabledSx}
                                />
                            </Grid>
                            <Grid item size={{ xs: 12, md: 2 }}>
                                <Input
                                    fullWidth
                                    label={makeLabel}
                                    name={`${namePrefix}_${idx}_make`}
                                    value={makeName}
                                    InputProps={{ readOnly: true }}
                                    disabled
                                    sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }}
                                />
                            </Grid>
                            <Grid item size={{ xs: 12, md: 4 }}>
                                <Input
                                    fullWidth
                                    label={descLabel}
                                    name={`${namePrefix}_${idx}_description`}
                                    value={item?.description ?? ""}
                                    onChange={(e) => {
                                        const next = [...showItems];
                                        next[idx] = { ...(next[idx] || {}), description: e.target.value ?? "" };
                                        updateItems(field, next, scalarMap);
                                    }}
                                    disabled={disabled}
                                    sx={disabledSx}
                                    multiline
                                    rows={1}
                                />
                            </Grid>
                            {allowMultiple && !disabled && (
                                <Grid item size={{ xs: 12, md: 1 }} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                                    <Button
                                        type="button"
                                        variant="text"
                                        size="small"
                                        onClick={() => {
                                            const next = showItems.filter((_, i) => i !== idx);
                                            updateItems(field, next.length > 0 ? next : [{ product_id: "", quantity: "", description: "" }], scalarMap);
                                        }}
                                        sx={{ minWidth: 0, px: 1, py: 0.5 }}
                                        disabled={showItems.length <= 1}
                                    >
                                        Remove
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    );
                })}

                {allowMultiple && !disabled && (
                    <Grid container spacing={COMPACT_FORM_SPACING} sx={{ mb: 0.5 }}>
                        <Grid item size={{ xs: 12 }}>
                            <Button
                                type="button"
                                variant="text"
                                size="small"
                                onClick={() => {
                                    updateItems(field, [...showItems, { product_id: "", quantity: "", description: "" }], scalarMap);
                                }}
                                sx={{ minWidth: 0, px: 1, py: 0.5 }}
                            >
                                Add
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </>
        );
    };

    switch (section.key) {
        case "structure":
            return (
                <>
                    {renderMultiRows({
                        field: "structure_items",
                        typeName: "structure",
                        labelBase: "Structure",
                        qtyLabel: "Height",
                        makeLabel: "Make",
                        descLabel: "Material",
                        fallbackSingle: {
                            product_id: formData.structure_product ?? "",
                            quantity: formData.structure_height ?? "",
                            description: formData.structure_material ?? "",
                        },
                        onPickProduct: (item, picked) => ({
                            ...item,
                            description:
                                item.description && String(item.description).trim() !== ""
                                    ? item.description
                                    : picked?.properties?.structure?.material ?? picked?.product_name ?? "",
                        }),
                        scalarMap: (first) => ({
                            structure_product: first.product_id ? Number(first.product_id) : "",
                            structure_height: first.quantity ?? "",
                            structure_material: first.description ?? "",
                        }),
                    })}
                </>
            );

        case "panel":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <AutocompleteField
                            fullWidth
                            name="panel_product"
                            label="Product"
                            options={getProducts(products, "panel")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "panel").find((p) => p.id == formData.panel_product) || (formData.panel_product ? { id: formData.panel_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    panel_product: findProduct?.id ?? "",
                                    panel_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    panel_size: findProduct?.capacity ?? "",
                                    panel_type: findProduct?.properties?.panel?.type ?? "",
                                    panel_warranty: findProduct?.properties?.panel?.warranty ?? "",
                                    panel_performance_warranty: findProduct?.properties?.panel?.performance_warranty ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                            disabled
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
                        <AutocompleteField
                            fullWidth
                            name="inverter_product"
                            label="Product"
                            options={getProducts(products, "inverter")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "inverter").find((p) => p.id == formData.inverter_product) || (formData.inverter_product ? { id: formData.inverter_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    inverter_product: findProduct?.id ?? "",
                                    inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    inverter_size: findProduct?.capacity ?? "",
                                    inverter_warranty: findProduct?.properties?.inverter?.warranty ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                            disabled
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
                        <AutocompleteField
                            fullWidth
                            name="battery_product"
                            label="Product"
                            options={getProducts(products, "battery")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "battery").find((p) => p.id == formData.battery_product) || (formData.battery_product ? { id: formData.battery_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    battery_product: findProduct?.id ?? "",
                                    battery_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    battery_size: findProduct?.capacity ?? "",
                                    battery_type: findProduct?.properties?.battery?.type ?? "",
                                    battery_warranty: findProduct?.properties?.battery?.warranty ?? "",
                                    battery_description_text: findProduct?.product_description ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                            disabled
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
                        <AutocompleteField
                            fullWidth
                            name="hybrid_inverter_product"
                            label="Product"
                            options={getProducts(products, "hybrid inverter")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "hybrid inverter").find((p) => p.id == formData.hybrid_inverter_product) || (formData.hybrid_inverter_product ? { id: formData.hybrid_inverter_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    hybrid_inverter_product: findProduct?.id ?? "",
                                    hybrid_inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    hybrid_inverter_size: findProduct?.capacity ?? "",
                                    hybrid_inverter_warranty: findProduct?.properties?.hybrid_inverter?.warranty ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                        <AutocompleteField
                            fullWidth
                            name="acdb_product"
                            label="Product"
                            options={getProducts(products, "acdb")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "acdb").find((p) => p.id == formData.acdb_product) || (formData.acdb_product ? { id: formData.acdb_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    acdb_product: findProduct?.id ?? "",
                                    acdb_quantity: findProduct?.properties?.acdb?.quantity ?? "",
                                    acdb_description: findProduct?.properties?.acdb?.description ?? findProduct?.product_description ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                        <AutocompleteField
                            fullWidth
                            name="dcdb_product"
                            label="Product"
                            options={getProducts(products, "dcdb")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "dcdb").find((p) => p.id == formData.dcdb_product) || (formData.dcdb_product ? { id: formData.dcdb_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    dcdb_product: findProduct?.id ?? "",
                                    dcdb_quantity: findProduct?.properties?.dcdb?.quantity ?? "",
                                    dcdb_description: findProduct?.properties?.dcdb?.description ?? findProduct?.product_description ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                <>
                    {renderMultiRows({
                        field: "cable_ac_items",
                        typeName: "ac cable",
                        labelBase: "AC Cable",
                        qtyLabel: "AC Quantity",
                        makeLabel: "AC Make",
                        descLabel: "AC Description",
                        allowMultiple: false,
                        fallbackSingle: {
                            product_id: formData.cable_ac_product ?? "",
                            quantity: formData.cable_ac_quantity ?? "",
                            description: formData.cable_ac_description ?? "",
                        },
                        scalarMap: (first) => ({
                            cable_ac_product: first.product_id ? Number(first.product_id) : "",
                            cable_ac_quantity: first.quantity ?? "",
                            cable_ac_description: first.description ?? "",
                            cable_ac_make_ids: first.product_id ? (() => {
                                const p = products.find((pp) => pp.id == first.product_id);
                                const makeId = p?.product_make_id ?? p?.productMake?.id;
                                return makeId != null ? [Number(makeId)] : [];
                            })() : [],
                        }),
                    })}

                    {renderMultiRows({
                        field: "cable_dc_items",
                        typeName: "dc cable",
                        labelBase: "DC Cable",
                        qtyLabel: "DC Quantity",
                        makeLabel: "DC Make",
                        descLabel: "DC Description",
                        allowMultiple: false,
                        fallbackSingle: {
                            product_id: formData.cable_dc_product ?? "",
                            quantity: formData.cable_dc_quantity ?? "",
                            description: formData.cable_dc_description ?? "",
                        },
                        scalarMap: (first) => ({
                            cable_dc_product: first.product_id ? Number(first.product_id) : "",
                            cable_dc_quantity: first.quantity ?? "",
                            cable_dc_description: first.description ?? "",
                            cable_dc_make_ids: first.product_id ? (() => {
                                const p = products.find((pp) => pp.id == first.product_id);
                                const makeId = p?.product_make_id ?? p?.productMake?.id;
                                return makeId != null ? [Number(makeId)] : [];
                            })() : [],
                        }),
                    })}

                    {renderMultiRows({
                        field: "cable_la_items",
                        typeName: "la cable",
                        labelBase: "LA Cable",
                        qtyLabel: "LA Quantity",
                        makeLabel: "LA Make",
                        descLabel: "LA Description",
                        allowMultiple: false,
                    })}

                    {renderMultiRows({
                        field: "cable_earthing_items",
                        typeName: "earthing cable",
                        labelBase: "Earthing Cable",
                        qtyLabel: "Earthing Quantity",
                        makeLabel: "Earthing Make",
                        descLabel: "Earthing Description",
                        allowMultiple: false,
                    })}
                </>
            );

        case "earthing":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            fullWidth
                            name="earthing_product"
                            label="Product"
                            options={getProducts(products, "earthing")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "earthing").find((p) => p.id == formData.earthing_product) || (formData.earthing_product ? { id: formData.earthing_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    earthing_product: findProduct?.id ?? "",
                                    earthing_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    earthing_quantity: findProduct?.properties?.earthing?.quantity ?? "",
                                    earthing_description: findProduct?.product_description ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                            disabled
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Description" name="earthing_description" value={formData.earthing_description} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>
            );

        case "accessories":
            return (
                <>
                    {renderMultiRows({
                        field: "accessories_items",
                        typeName: "accessories",
                        labelBase: "Accessories",
                        qtyLabel: "Quantity",
                        makeLabel: "Make",
                        descLabel: "Description",
                    })}
                </>
            );

        case "la":
            return (
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            fullWidth
                            name="la_product"
                            label="Product"
                            options={getProducts(products, "la")}
                            getOptionLabel={(p) => p?.product_name ?? ""}
                            value={getProducts(products, "la").find((p) => p.id == formData.la_product) || (formData.la_product ? { id: formData.la_product } : null)}
                            onChange={(e, newValue) => {
                                const findProduct = newValue;
                                patchForm({
                                    la_product: findProduct?.id ?? "",
                                    la_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    la_quantity: findProduct?.properties?.la?.quantity ?? "",
                                    la_description: findProduct?.product_description ?? "",
                                });
                            }}
                            placeholder="Type to search..."
                            disabled={disabled}
                            sx={disabledSx}
                        />
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
                            disabled
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
