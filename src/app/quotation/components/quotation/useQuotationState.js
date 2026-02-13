/**
 * Quotation form state: formData, updates, normalization, validation.
 */
import { useState, useEffect, useCallback } from "react";
import { getInitialFormData } from "./quotationConfig";
import { validateQuotation } from "./quotationValidation";
import { validateE164Phone, validateEmail } from "@/utils/validators";

const toNumber = (v) =>
    v === "" || v === null || v === undefined ? null : Number(v);

/**
 * @param {{ user: { id?: string } | null; defaultValues?: Record<string, unknown> }}
 * @returns {{
 *   formData: Record<string, unknown>;
 *   setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
 *   errors: Record<string, string>;
 *   setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
 *   handleChange: (e: { target: { name: string; value: unknown; type?: string; checked?: boolean } }) => void;
 *   handleAutocompleteChange: (name: string, value: unknown[]) => void;
 *   patchForm: (patch: Record<string, unknown>) => void;
 *   validate: () => Record<string, string>;
 *   buildPayload: () => Record<string, unknown>;
 * }}
 */
export function useQuotationState({ user, defaultValues = {} }) {
    const [formData, setFormData] = useState(() =>
        getInitialFormData(user, {})
    );
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!defaultValues || Object.keys(defaultValues).length === 0) return;
        const cleanedValues = Object.fromEntries(
            Object.entries(defaultValues).map(([key, value]) => [
                key,
                value === null || value === undefined ? "" : value,
            ])
        );
        setFormData((prev) => ({ ...prev, ...cleanedValues }));
    }, [defaultValues]);

    const handleChange = useCallback(
        (e) => {
            const { name, value, type, checked } = e.target;
            const normalizedValue =
                type === "checkbox" ? checked : value === undefined ? "" : value;

            if (name === "mobile_number" && normalizedValue && String(normalizedValue).trim() !== "") {
                const phoneValidation = validateE164Phone(String(normalizedValue), { required: true });
                if (!phoneValidation.isValid) {
                    setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
                } else {
                    setErrors((prev) => {
                        const next = { ...prev };
                        delete next[name];
                        return next;
                    });
                }
            } else if (name === "email" && normalizedValue && String(normalizedValue).trim() !== "") {
                const emailValidation = validateEmail(String(normalizedValue));
                if (!emailValidation.isValid) {
                    setErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
                } else {
                    setErrors((prev) => {
                        const next = { ...prev };
                        delete next[name];
                        return next;
                    });
                }
            } else if (errors[name]) {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
            }

            setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
        },
        [errors]
    );

    const handleAutocompleteChange = useCallback((name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const patchForm = useCallback((patch) => {
        setFormData((prev) => ({ ...prev, ...patch }));
    }, []);

    const validate = useCallback(() => {
        const validationErrors = validateQuotation(formData);
        setErrors(validationErrors);
        return validationErrors;
    }, [formData]);

    const buildPayload = useCallback(() => {
        return {
            ...formData,
            user_id: toNumber(formData.user_id),
            branch_id: toNumber(formData.branch_id),
            inquiry_id: toNumber(formData.inquiry_id),
            customer_id: toNumber(formData.customer_id),
            state_id: toNumber(formData.state_id),
            order_type_id: toNumber(formData.order_type_id),
            project_scheme_id: toNumber(formData.project_scheme_id),
            project_price_id: toNumber(formData.project_price_id),
            project_capacity: toNumber(formData.project_capacity),
            price_per_kw: toNumber(formData.price_per_kw),
            total_project_value: toNumber(formData.total_project_value),
            structure_amount: toNumber(formData.structure_amount),
            subsidy_amount: toNumber(formData.subsidy_amount),
            state_subsidy_amount: toNumber(formData.state_subsidy_amount),
            netmeter_amount: toNumber(formData.netmeter_amount),
            stamp_charges: toNumber(formData.stamp_charges),
            state_government_amount: toNumber(formData.state_government_amount),
            discount: toNumber(formData.discount),
            gst_rate: toNumber(formData.gst_rate),
            additional_cost_amount_1: toNumber(formData.additional_cost_amount_1),
            additional_cost_amount_2: toNumber(formData.additional_cost_amount_2),
            panel_quantity: toNumber(formData.panel_quantity),
            inverter_quantity: toNumber(formData.inverter_quantity),
            hybrid_inverter_quantity: toNumber(formData.hybrid_inverter_quantity),
            battery_quantity: toNumber(formData.battery_quantity),
            acdb_quantity: toNumber(formData.acdb_quantity),
            dcdb_quantity: toNumber(formData.dcdb_quantity),
            system_warranty_years: toNumber(formData.system_warranty_years),
            graph_price_per_unit: toNumber(formData.graph_price_per_unit),
            graph_per_day_generation: toNumber(formData.graph_per_day_generation),
            graph_yearly_increment_price: toNumber(formData.graph_yearly_increment_price),
            graph_yearly_decrement_generation: toNumber(formData.graph_yearly_decrement_generation),
            project_cost: toNumber(formData.project_cost),
            total_payable: toNumber(formData.total_payable),
            effective_cost: toNumber(formData.effective_cost),
            structure_product: toNumber(formData.structure_product),
            panel_product: toNumber(formData.panel_product),
            inverter_product: toNumber(formData.inverter_product),
            battery_product: toNumber(formData.battery_product),
            hybrid_inverter_product: toNumber(formData.hybrid_inverter_product),
            acdb_product: toNumber(formData.acdb_product),
            dcdb_product: toNumber(formData.dcdb_product),
            cable_ac_product: toNumber(formData.cable_ac_product),
            cable_dc_product: toNumber(formData.cable_dc_product),
            earthing_product: toNumber(formData.earthing_product),
            la_product: toNumber(formData.la_product),
        };
    }, [formData]);

    return {
        formData,
        setFormData,
        errors,
        setErrors,
        handleChange,
        handleAutocompleteChange,
        patchForm,
        validate,
        buildPayload,
    };
}
