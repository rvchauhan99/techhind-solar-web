/**
 * Maps BOM API response to form patch and fallback product-by-section.
 * Component should NOT manually loop BOM; use this hook.
 */

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

    // Initialize all BOM-driven fields
    Object.assign(formPatch, {
        project_price_id: datas.id ?? "",
        price_per_kw: datas.price_per_kwa != null ? Number(datas.price_per_kwa).toFixed(2) : "",
        total_project_value: datas.total_project_value ?? "",
        netmeter_amount: datas.netmeter_amount ?? 0,
        structure_amount: datas.structure_amount ?? "",
        subsidy_amount: datas.subsidy_amount ?? "",
        state_subsidy_amount: datas.state_subsidy ?? "",
        structure_height: "",
        structure_material: "",
        structure_product: "",
        panel_size: "",
        panel_quantity: "",
        panel_make_ids: [],
        panel_type: "",
        panel_warranty: "",
        panel_performance_warranty: "",
        panel_product: "",
        inverter_size: "",
        inverter_quantity: "",
        inverter_make_ids: [],
        inverter_warranty: "",
        inverter_product: "",
        hybrid_inverter_size: "",
        hybrid_inverter_quantity: "",
        hybrid_inverter_make_ids: [],
        hybrid_inverter_warranty: "",
        hybrid_inverter_product: "",
        battery_size: "",
        battery_quantity: "",
        battery_make_ids: [],
        battery_type: "",
        battery_warranty: "",
        battery_product: "",
        battery_description_text: "",
        acdb_quantity: "",
        acdb_description: "",
        acdb_product: "",
        dcdb_quantity: "",
        dcdb_description: "",
        dcdb_product: "",
        cable_ac_quantity: "",
        cable_ac_make_ids: [],
        cable_ac_description: "",
        cable_ac_product: "",
        cable_dc_quantity: "",
        cable_dc_make_ids: [],
        cable_dc_description: "",
        cable_dc_product: "",
        earthing_quantity: "",
        earthing_make_ids: [],
        earthing_description: "",
        earthing_product: "",
        earthing_description_text: "",
        la_quantity: "",
        la_make_ids: [],
        la_description: "",
        la_product: "",
        lightening_arrester_description_text: "",
    });

    for (let i = 0; i < bomDetails.length; i++) {
        const element = bomDetails[i];
        const product = element?.product;
        const properties = product?.properties || null;
        const prodType = (product?.productType?.name || "").toLowerCase();
        const productWithMakeName = withMakeName(product);

        if (properties?.structure) {
            formPatch.structure_material = properties.structure.material ?? "";
            formPatch.structure_height = element.quantity ?? "";
            formPatch.structure_product = product?.id ?? "";
        } else if (properties?.panel) {
            formPatch.panel_product = product?.id ?? "";
            formPatch.panel_size = product?.capacity ?? 0;
            formPatch.panel_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.panel_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.panel_type = properties.panel?.type ?? "";
            formPatch.panel_warranty = properties.panel?.warranty ?? properties?.additional?.warranty ?? "";
            formPatch.panel_performance_warranty = properties?.additional?.performance_warranty ?? "";
            project_capacity = (((product?.capacity ?? 0) * (element?.quantity ?? 0)) / 1000).toFixed(2);
            if (productWithMakeName) bomProductBySection.panel = productWithMakeName;
        } else if (properties?.inverter) {
            formPatch.inverter_product = product?.id ?? "";
            formPatch.inverter_size = product?.capacity ?? 0;
            formPatch.inverter_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.inverter_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.inverter_warranty = properties.inverter?.warranty ?? "";
            if (productWithMakeName) bomProductBySection.inverter = productWithMakeName;
        } else if (properties?.hybrid_inverter) {
            formPatch.hybrid_inverter_product = product?.id ?? "";
            formPatch.hybrid_inverter_size = product?.capacity ?? 0;
            formPatch.hybrid_inverter_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.hybrid_inverter_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.hybrid_inverter_warranty = properties.hybrid_inverter?.warranty ?? "";
            if (productWithMakeName) bomProductBySection.hybridInverter = productWithMakeName;
        } else if (properties?.battery) {
            formPatch.battery_product = product?.id ?? "";
            formPatch.battery_size = product?.capacity ?? 0;
            formPatch.battery_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.battery_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.battery_type = properties.battery?.type ?? "";
            formPatch.battery_warranty = properties.battery?.warranty ?? "";
            formPatch.battery_description_text = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.battery = productWithMakeName;
        } else if (properties?.ac_cable) {
            formPatch.cable_ac_product = product?.id ?? "";
            formPatch.cable_ac_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.cable_ac_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.cable_ac_description = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.cable_ac = productWithMakeName;
        } else if (properties?.dc_cable) {
            formPatch.cable_dc_product = product?.id ?? "";
            formPatch.cable_dc_quantity = element.quantity ?? "";
            const makeId = product?.product_make_id ?? product?.productMake?.id;
            formPatch.cable_dc_make_ids = makeId != null ? [Number(makeId)] : [];
            formPatch.cable_dc_description = element?.description ?? "";
            if (productWithMakeName) bomProductBySection.cable_dc = productWithMakeName;
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

    return { formPatch, bomProductBySection };
}
