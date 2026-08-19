/**
 * Centralized quotation validation. Returns structured error object.
 */
import { validateE164Phone, validateEmail, validatePostalCode } from "@/utils/validators";
import { isIndiaCountry } from "@/components/common/AddressFields";

/**
 * @param {Record<string, unknown>} formData
 * @returns {Record<string, string>} field name -> error message
 */
export function validateQuotation(formData) {
    const errors = {};
    const india = isIndiaCountry(formData.country);

    if (!formData.quotation_date) errors.quotation_date = "Quotation Date is required";
    if (!formData.valid_till) errors.valid_till = "Valid Till is required";
    if (!formData.user_id) errors.user_id = "Quotation By (User) is required";
    if (!formData.branch_id) errors.branch_id = "Branch is required";
    if (!formData.customer_name) errors.customer_name = "Customer Name is required";

    if (!formData.mobile_number) {
        errors.mobile_number = "Mobile Number is required";
    } else {
        const phoneValidation = validateE164Phone(String(formData.mobile_number), { required: true });
        if (!phoneValidation.isValid) errors.mobile_number = phoneValidation.message;
    }

    if (formData.email && String(formData.email).trim() !== "") {
        const emailValidation = validateEmail(String(formData.email));
        if (!emailValidation.isValid) errors.email = emailValidation.message;
    }

    if (!formData.state_id) errors.state_id = "State is required";
    if (india) {
        if (!formData.city_id) errors.city_id = "City is required";
    }
    if (!formData.pin_code || String(formData.pin_code).trim() === "") {
        errors.pin_code = "Postal code is required";
    } else {
        const postal = validatePostalCode(formData.pin_code, formData.country);
        if (!postal.isValid) errors.pin_code = postal.message;
    }
    if (!formData.taluka || String(formData.taluka).trim() === "") {
        errors.taluka = "Taluka is required";
    }
    if (!formData.project_capacity) errors.project_capacity = "Project Capacity is required";
    if (!formData.price_per_kw) errors.price_per_kw = "Price Per KW is required";
    if (!formData.total_project_value) errors.total_project_value = "Total Project Value is required";

    if (formData.add_extra_materials) {
        const rows = Array.isArray(formData.extra_materials) ? formData.extra_materials : [];
        if (rows.length === 0) {
            errors.add_extra_materials = "Add at least one Extra Materials item or uncheck the option";
        }
        rows.forEach((row, idx) => {
            if (!row?.product_id) {
                errors[`extra_materials_${idx}_product`] = "Product is required";
            }
            const qty = Number(row?.quantity);
            if (!Number.isFinite(qty) || qty <= 0) {
                errors[`extra_materials_${idx}_quantity`] = "Quantity must be greater than 0";
            }
            const last = Number(row?.last_purchase_price);
            if (!Number.isFinite(last) || last <= 0) {
                errors[`extra_materials_${idx}_last_purchase`] = "Last purchase price is required";
            }
        });
    }

    return errors;
}
