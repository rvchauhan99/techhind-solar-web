/**
 * Centralized quotation validation. Returns structured error object.
 */
import { validateE164Phone, validateEmail } from "@/utils/validators";

/**
 * @param {Record<string, unknown>} formData
 * @returns {Record<string, string>} field name -> error message
 */
export function validateQuotation(formData) {
    const errors = {};

    if (!formData.quotation_date) errors.quotation_date = "Quotation Date is required";
    if (!formData.valid_till) errors.valid_till = "Valid Till is required";
    if (!formData.user_id) errors.user_id = "Quotation By (User) is required";
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
    if (!formData.project_capacity) errors.project_capacity = "Project Capacity is required";
    if (!formData.price_per_kw) errors.price_per_kw = "Price Per KW is required";
    if (!formData.total_project_value) errors.total_project_value = "Total Project Value is required";

    return errors;
}
