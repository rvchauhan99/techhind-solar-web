/**
 * Maps BOM API response to form patch and fallback product-by-section.
 * Component should NOT manually loop BOM; use this hook.
 */

import {
    syncTotalFromCapacityAndRate,
    roundToRupee,
    roundToPaise,
    toWholeRupeeOrEmpty,
} from "./quotationCalculations";
import { getProjectDrivenResetPatch } from "./quotationConfig";

/**
 * Normalize product with make id and name for Autocomplete fallback (from API).
 * @param {Record<string, unknown>} product
 * @returns {Record<string, unknown> | null}
 */
function withMakeName(product) {
    if (!product) return null;
    const makeId = product.product_make_id ?? product.productMake?.id ?? null;
    const makeName =
        product.product_make_name ?? product.productMake?.name ?? null;
    return { ...product, product_make_id: makeId, product_make_name: makeName };
}

/**
 * Maps project-price-bom-details response to:
 * - formPatch: object to merge into formData in one atomic setState
 * - bomProductBySection: { panel?, inverter?, ... } for MakeAutocomplete fallback
 *
 * @param {Record<string, unknown>} response - API response (result/data)
 * @returns {{ formPatch: Record<string, unknown>; bomProductBySection: Record<string, unknown> }}
 */
export function mapBomResponseToForm(response) {
    const datas = response?.result ?? response?.data ?? response;
    const formPatch = {};
    const bomProductBySection = {};

    if (!datas || typeof datas !== "object") {
        return { formPatch, bomProductBySection };
    }

    const bomDetails = Array.isArray(datas.billOfMaterial?.bom_detail)
        ? datas.billOfMaterial.bom_detail
        : [];

    let project_capacity = 0;

    const normType = (v) =>
        (v || "")
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
    const toBomItem = (element, product) => ({
        product_id: product?.id ?? "",
        quantity: element?.quantity ?? "",
        description: element?.description ?? product?.product_description ?? "",
    });

    // Initialize all BOM-driven fields from shared project reset
    Object.assign(formPatch, getProjectDrivenResetPatch(), {
        project_price_id: datas.id ?? "",
        price_per_kw: datas.price_per_kwa != null ? roundToPaise(datas.price_per_kwa) : "",
        // total_project_value set from master after capacity (see below)
        netmeter_amount: datas.netmeter_amount ?? 0,
        structure_amount: datas.structure_amount ?? "",
        subsidy_amount: toWholeRupeeOrEmpty(datas.subsidy_amount),
        state_subsidy_amount: toWholeRupeeOrEmpty(datas.state_subsidy),
        system_warranty_years: datas.system_warranty ?? "",
    });

    for (let i = 0; i < bomDetails.length; i++) {
        const element = bomDetails[i];
        const product = element?.product;
        const properties = product?.properties || null;
        const prodType = normType(product?.productType?.name || "");
        const productWithMakeName = withMakeName(product);

        // Multi-item collections by productType (case-insensitive)
        if (prodType === "structure") {
            formPatch.structure_items.push(toBomItem(element, product));
            if (!formPatch.structure_product) {
                formPatch.structure_product = product?.id ?? "";
                formPatch.structure_height = element.quantity ?? "";
                // Use BOM description if provided, else product structure material, else product name.
                formPatch.structure_material =
                    element?.description ??
                    product?.properties?.structure?.material ??
                    product?.product_name ??
                    "";
            }
        } else if (prodType === "ac cable") {
            formPatch.cable_ac_items.push(toBomItem(element, product));
            if (!formPatch.cable_ac_product) {
                formPatch.cable_ac_product = product?.id ?? "";
                formPatch.cable_ac_quantity = element.quantity ?? "";
                const makeId = product?.product_make_id ?? product?.productMake?.id;
                formPatch.cable_ac_make_ids = makeId != null ? [Number(makeId)] : [];
                formPatch.cable_ac_description = element?.description ?? "";
            }
            if (productWithMakeName) bomProductBySection.cable_ac = productWithMakeName;
        } else if (prodType === "dc cable") {
            formPatch.cable_dc_items.push(toBomItem(element, product));
            if (!formPatch.cable_dc_product) {
                formPatch.cable_dc_product = product?.id ?? "";
                formPatch.cable_dc_quantity = element.quantity ?? "";
                const makeId = product?.product_make_id ?? product?.productMake?.id;
                formPatch.cable_dc_make_ids = makeId != null ? [Number(makeId)] : [];
                formPatch.cable_dc_description = element?.description ?? "";
            }
            if (productWithMakeName) bomProductBySection.cable_dc = productWithMakeName;
        } else if (prodType === "la cable") {
            formPatch.cable_la_items.push(toBomItem(element, product));
        } else if (prodType === "earthing cable") {
            formPatch.cable_earthing_items.push(toBomItem(element, product));
        } else if (prodType === "accessories" || prodType === "accessory") {
            formPatch.accessories_items.push(toBomItem(element, product));
        }

        if (properties?.structure) {
            // Backward compatibility: keep scalar fields populated when the BOM uses properties
            if (!formPatch.structure_product) {
                formPatch.structure_material = properties.structure.material ?? "";
                formPatch.structure_height = element.quantity ?? "";
                formPatch.structure_product = product?.id ?? "";
            }
        } else if (properties?.panel) {
            formPatch.panel_product = product?.id ?? "";
            formPatch.panel_size = product?.capacity ?? 0;
            formPatch.panel_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.panel_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.panel_type = properties.panel?.type ?? "";
            formPatch.panel_warranty = properties?.additional?.warranty ?? properties.panel?.warranty ?? "";
            formPatch.panel_performance_warranty = properties?.additional?.performance_warranty ?? properties.panel?.performance_warranty ?? "";
            project_capacity = (((product?.capacity ?? 0) * (element?.quantity ?? 0)) / 1000).toFixed(2);
            if (productWithMakeName) bomProductBySection.panel = productWithMakeName;
        } else if (properties?.inverter) {
            formPatch.inverter_product = product?.id ?? "";
            formPatch.inverter_size = product?.capacity ?? 0;
            formPatch.inverter_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.inverter_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.inverter_warranty = properties?.additional?.warranty ?? properties.inverter?.warranty ?? "";
            if (productWithMakeName) bomProductBySection.inverter = productWithMakeName;
        } else if (properties?.hybrid_inverter) {
            formPatch.hybrid_inverter_product = product?.id ?? "";
            formPatch.hybrid_inverter_size = product?.capacity ?? 0;
            formPatch.hybrid_inverter_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.hybrid_inverter_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.hybrid_inverter_warranty = properties?.additional?.warranty ?? properties.hybrid_inverter?.warranty ?? "";
            if (productWithMakeName) bomProductBySection.hybridInverter = productWithMakeName;
        } else if (properties?.battery) {
            formPatch.battery_product = product?.id ?? "";
            formPatch.battery_size = product?.capacity ?? 0;
            formPatch.battery_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.battery_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.battery_type = properties.battery?.type ?? "";
            formPatch.battery_warranty = properties?.additional?.warranty ?? properties.battery?.warranty ?? "";
            formPatch.battery_description_text = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.battery = productWithMakeName;
        } else if (properties?.ac_cable) {
            // Backward compatibility: keep scalar fields populated when the BOM uses properties
            if (!formPatch.cable_ac_product) {
                formPatch.cable_ac_product = product?.id ?? "";
                formPatch.cable_ac_quantity = element.quantity ?? "";
                const makeId = product?.product_make_id ?? product?.productMake?.id;
                formPatch.cable_ac_make_ids = makeId != null ? [Number(makeId)] : [];
                formPatch.cable_ac_description = element?.description ?? "";
                if (productWithMakeName) bomProductBySection.cable_ac = productWithMakeName;
            }
        } else if (properties?.dc_cable) {
            // Backward compatibility: keep scalar fields populated when the BOM uses properties
            if (!formPatch.cable_dc_product) {
                formPatch.cable_dc_product = product?.id ?? "";
                formPatch.cable_dc_quantity = element.quantity ?? "";
                const makeId = product?.product_make_id ?? product?.productMake?.id;
                formPatch.cable_dc_make_ids = makeId != null ? [Number(makeId)] : [];
                formPatch.cable_dc_description = element?.description ?? "";
                if (productWithMakeName) bomProductBySection.cable_dc = productWithMakeName;
            }
        }

        if (prodType === "acdb") {
            formPatch.acdb_product = product?.id ?? "";
            formPatch.acdb_quantity = element.quantity ?? "";
            formPatch.acdb_description = element?.description ?? "";
        }
        if (prodType === "dcdb") {
            formPatch.dcdb_product = product?.id ?? "";
            formPatch.dcdb_quantity = element.quantity ?? "";
            formPatch.dcdb_description = element?.description ?? "";
        }
        if (prodType === "la") {
            formPatch.la_product = product?.id ?? "";
            formPatch.la_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.la_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.la_description = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.la = productWithMakeName;
        }
        if (prodType === "earthing") {
            formPatch.earthing_product = product?.id ?? "";
            formPatch.earthing_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.earthing_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.earthing_description = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.earthing = productWithMakeName;
        }
    }

    formPatch.project_capacity = project_capacity;

    // Prefer master total (rupee-rounded) so quotation matches project price exactly.
    // Fallback to rate × capacity only when master total is missing.
    if (datas.total_project_value != null && datas.total_project_value !== "") {
        formPatch.total_project_value = roundToRupee(datas.total_project_value);
    } else {
        const syncedTotal = syncTotalFromCapacityAndRate({
            project_capacity,
            price_per_kw: formPatch.price_per_kw,
        });
        formPatch.total_project_value = syncedTotal != null ? syncedTotal : "";
    }

    return { formPatch, bomProductBySection };
}
