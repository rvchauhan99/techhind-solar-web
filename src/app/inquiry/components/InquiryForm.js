"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import mastersService, { getReferenceOptionsSearch } from "@/services/mastersService";
import companyService from "@/services/companyService";
import { validatePhone, validateEmail, formatPhone, validateE164Phone } from "@/utils/validators";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import PhoneField from "@/components/common/PhoneField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";

export default function InquiryForm({ defaultValues = {}, onSubmit, loading }) {
    const router = useRouter();
    const [formData, setFormData] = useState(defaultValues);
    const [errors, setErrors] = useState({});

    const getOptionLabel = (opt) => opt?.label ?? opt?.name ?? opt?.source_name ?? (opt?.id != null ? String(opt.id) : "");

    const [options, setOptions] = useState({
        states: [],
        cities: [],
    });
    const [ratingOptions, setRatingOptions] = useState([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);

    const isEdit = useMemo(() => !!defaultValues?.id, [defaultValues]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            ...defaultValues,
            date_of_inquiry:
                defaultValues?.date_of_inquiry
                    ? moment(defaultValues.date_of_inquiry, ["YYYY-MM-DD", "DD-MM-YYYY"]).format("YYYY-MM-DD")
                    : moment().format("YYYY-MM-DD"),
            next_reminder_date:
                defaultValues?.next_reminder_date
                    ? moment(defaultValues.next_reminder_date, ["YYYY-MM-DD", "DD-MM-YYYY"]).format("YYYY-MM-DD")
                    : moment().format("YYYY-MM-DD"),
            capacity: defaultValues?.capacity !== undefined && defaultValues?.capacity !== null ? defaultValues.capacity : "",
            do_not_send_message: !!defaultValues?.do_not_send_message,
        }));
    }, [defaultValues]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [statesRes, citiesRes, constantsRes] = await Promise.all([
                    mastersService.getReferenceOptions("state.model"),
                    mastersService.getReferenceOptions("city.model"),
                    mastersService.getConstants(),
                ]);
                setOptions({
                    states: statesRes?.result || [],
                    cities: citiesRes?.result || [],
                });
                const payload = constantsRes?.result || constantsRes;
                setRatingOptions(payload?.ratings || []);
                setPaymentTypeOptions(payload?.paymentTypes || []);
            } catch (err) {
                console.error("Failed to load reference options", err);
            }
        };
        loadOptions();
    }, [isEdit]);

    // Auto-populate default branch for new inquiries (not editing)
    useEffect(() => {
        const loadDefaultBranch = async () => {
            if (!isEdit && !formData.branch_id) {
                try {
                    const defaultBranchRes = await companyService.getDefaultBranch();
                    const defaultBranch = defaultBranchRes?.result || defaultBranchRes?.data || defaultBranchRes;
                    if (defaultBranch?.id) {
                        setFormData((prev) => {
                            // Only set if branch_id is still not set
                            if (!prev.branch_id) {
                                return {
                                    ...prev,
                                    branch_id: defaultBranch.id,
                                };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error("Failed to load default branch:", err);
                    // Continue without default branch - user will need to select manually
                }
            }
        };

        loadDefaultBranch();
    }, [isEdit, formData.branch_id]);

    // Auto-populate default state for new inquiries (not editing)
    useEffect(() => {
        const loadDefaultState = async () => {
            if (!isEdit && !formData.state_id) {
                try {
                    const defaultStateRes = await mastersService.getDefaultState();
                    const defaultState = defaultStateRes?.result || defaultStateRes?.data || defaultStateRes;
                    if (defaultState?.id) {
                        setFormData((prev) => {
                            // Only set if state_id is still not set
                            if (!prev.state_id) {
                                return {
                                    ...prev,
                                    state_id: defaultState.id,
                                };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error("Failed to load default state:", err);
                    // Continue without default state - user will need to select manually
                }
            }
        };

        loadDefaultState();
    }, [isEdit, formData.state_id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let processedValue = type === "checkbox" ? checked : value;

        // If state changes, clear city selection
        if (name === "state_id") {
            setFormData((prev) => ({
                ...prev,
                [name]: processedValue,
                city_id: "", // Clear city when state changes
            }));
            return;
        }

        // For capacity field, ensure it's a valid number
        if (name === "capacity" && value !== "") {
            const numValue = Number(value);
            // Clear error if capacity is valid (> 0)
            if (!isNaN(numValue) && numValue > 0 && errors.capacity) {
                setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.capacity;
                    return updated;
                });
            }
        }

    // Validate phone numbers
    if (name === "mobile_number" || name === "phone_no") {
        if (value && value.trim() !== "") {
            // mobile_number uses international E.164; phone_no keeps legacy validation
            const phoneValidation =
                name === "mobile_number"
                    ? validateE164Phone(value, { required: true })
                    : validatePhone(value);
            if (!phoneValidation.isValid) {
                setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
            } else {
                setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated[name];
                    return updated;
                });
            }
        } else {
            // Clear error if field is empty
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    }

        // Validate email
        if (name === "email_id") {
            if (value && value.trim() !== "") {
                const emailValidation = validateEmail(value);
                if (!emailValidation.isValid) {
                    setErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
                } else {
                    setErrors((prev) => {
                        const updated = { ...prev };
                        delete updated[name];
                        return updated;
                    });
                }
            } else {
                // Clear error if field is empty
                setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated[name];
                    return updated;
                });
            }
        }

        setFormData({ ...formData, [name]: processedValue });
        if (errors[name] && name !== "mobile_number" && name !== "phone_no" && name !== "email_id") {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        // Keep existing formatting for now (adds spacing for readability)
        if ((name === "mobile_number" || name === "phone_no") && value && value.trim() !== "") {
            const formatted = formatPhone(value);
            setFormData((prev) => ({
                ...prev,
                [name]: formatted,
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!formData.inquiry_source_id) {
            newErrors.inquiry_source_id = "Inquiry Source is required";
        }
        if (!formData.date_of_inquiry) {
            newErrors.date_of_inquiry = "Date of Inquiry is required";
        }
        if (!formData.inquiry_by) {
            newErrors.inquiry_by = "Inquiry By is required";
        }
        if (!formData.handled_by) {
            newErrors.handled_by = "Handled By is required";
        }
        if (!formData.branch_id) {
            newErrors.branch_id = "Branch is required";
        }
        if (!formData.project_scheme_id) {
            newErrors.project_scheme_id = "Project Scheme is required";
        }
        // Validate capacity - must be provided and greater than 0
        const capacityValue = formData.capacity;
        if (capacityValue === null || capacityValue === undefined || capacityValue === "") {
            newErrors.capacity = "Capacity is required";
        } else {
            const capacityNum = Number(capacityValue);
            if (isNaN(capacityNum) || capacityNum <= 0) {
                newErrors.capacity = "Capacity must be greater than 0";
            }
        }
        if (!formData.order_type) {
            newErrors.order_type = "Order Type is required";
        }

        if (!formData.customer_name) {
            newErrors.customer_name = "Customer Name is required";
        }
        if (!formData.mobile_number) {
            newErrors.mobile_number = "Mobile Number is required";
        } else {
            // Validate mobile_number format (international E.164)
            const phoneValidation = validateE164Phone(formData.mobile_number, { required: true });
            if (!phoneValidation.isValid) {
                newErrors.mobile_number = phoneValidation.message;
            }
        }

        // Validate optional phone_no (keeps legacy Indian format)
        if (formData.phone_no && formData.phone_no.trim() !== "") {
            const phoneValidation = validatePhone(formData.phone_no);
            if (!phoneValidation.isValid) {
                newErrors.phone_no = phoneValidation.message;
            }
        }

        // Validate optional email_id
        if (formData.email_id && formData.email_id.trim() !== "") {
            const emailValidation = validateEmail(formData.email_id);
            if (!emailValidation.isValid) {
                newErrors.email_id = emailValidation.message;
            }
        }

        if (!formData.state_id) {
            newErrors.state_id = "State is required";
        }
        if (!formData.city_id) {
            newErrors.city_id = "City is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onSubmit(formData);
    };

    return (
        <FormContainer>
            <form
                id="inquiry-form"
                onSubmit={handleSubmit}
                className="mx-auto ml-2 pr-1 max-w-full"
                noValidate
            >
                <FormSection title="Inquiry Details">
                <FormGrid cols={3}>
                        <AutocompleteField
                            name="inquiry_source_id"
                            label="Inquiry Source"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })}
                            referenceModel="inquiry_source.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.inquiry_source_id ? { id: formData.inquiry_source_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "inquiry_source_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.inquiry_source_id}
                            helperText={errors.inquiry_source_id}
                            required
                        />
                        <DateField
                            name="date_of_inquiry"
                            label="Date of Inquiry"
                            value={formData.date_of_inquiry || ""}
                            onChange={handleChange}
                            error={!!errors.date_of_inquiry}
                            helperText={errors.date_of_inquiry}
                            required
                        />
                        <AutocompleteField
                            name="inquiry_by"
                            label="Inquiry By"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.inquiry_by ? { id: formData.inquiry_by } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "inquiry_by", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.inquiry_by}
                            helperText={errors.inquiry_by}
                            required
                        />
                        <AutocompleteField
                            name="handled_by"
                            label="Handled By"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.handled_by ? { id: formData.handled_by } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "handled_by", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.handled_by}
                            helperText={errors.handled_by}
                            required
                        />
                        <AutocompleteField
                            name="channel_partner"
                            label="Channel Partner"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.channel_partner ? { id: formData.channel_partner } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "channel_partner", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="branch_id"
                            label="Branch"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                            referenceModel="company_branch.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.branch_id ? { id: formData.branch_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "branch_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.branch_id}
                            helperText={errors.branch_id}
                            required
                        />
                        <AutocompleteField
                            name="project_scheme_id"
                            label="Project Scheme"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
                            referenceModel="project_scheme.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.project_scheme_id ? { id: formData.project_scheme_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "project_scheme_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.project_scheme_id}
                            helperText={errors.project_scheme_id}
                            required
                        />
                        <Input
                            type="tel"
                            name="capacity"
                            label="Capacity (kW)"
                            value={formData.capacity ?? ""}
                            onChange={handleChange}
                            inputProps={{ min: 0.01, step: 0.1 }}
                            error={!!errors.capacity}
                            helperText={errors.capacity}
                            required
                        />
                        <AutocompleteField
                            name="order_type"
                            label="Order Type"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("order_type.model", { q, limit: 20 })}
                            referenceModel="order_type.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.order_type ? { id: formData.order_type } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "order_type", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.order_type}
                            helperText={errors.order_type}
                            required
                        />
                        <AutocompleteField
                            name="discom_id"
                            label="Discom"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("discom.model", { q, limit: 20 })}
                            referenceModel="discom.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.discom_id ? { id: formData.discom_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "discom_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="rating"
                            label="Customer Eagerness"
                            options={ratingOptions.map((r) => ({ value: r, label: r }))}
                            getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? o?.value ?? "")}
                            value={formData.rating ? { value: formData.rating, label: formData.rating } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "rating", value: newValue?.value ?? newValue ?? "" } })}
                            placeholder="Type to search..."
                        />
                </FormGrid>
                </FormSection>
                <FormSection title="Customer Details">
                <FormGrid cols={3}>
                        <Input
                            name="customer_name"
                            label="Customer Name"
                            value={formData.customer_name || ""}
                            onChange={handleChange}
                            error={!!errors.customer_name}
                            helperText={errors.customer_name}
                            required
                        />
                        <PhoneField
                            name="mobile_number"
                            label="Mobile Number"
                            value={formData.mobile_number || ""}
                            onChange={handleChange}
                            error={!!errors.mobile_number}
                            helperText={errors.mobile_number}
                            required
                        />
                        <Input
                            name="company_name"
                            label="Company Name"
                            value={formData.company_name || ""}
                            onChange={handleChange}
                        />
                        <Input
                            type="number"
                            name="phone_no"
                            label="Phone No"
                            value={formData.phone_no || ""}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={!!errors.phone_no}
                            helperText={errors.phone_no}
                        />
                        <Input
                            name="email_id"
                            label="Email Id"
                            type="email"
                            value={formData.email_id || ""}
                            onChange={handleChange}
                            error={!!errors.email_id}
                            helperText={errors.email_id}
                        />
                        <Input
                            type="number"
                            name="pin_code"
                            label="Pin Code"
                            value={formData.pin_code || ""}
                            onChange={handleChange}
                        />
                        <AutocompleteField
                            name="state_id"
                            label="State"
                            options={options.states}
                            getOptionLabel={getOptionLabel}
                            value={options.states.find((s) => s.id == formData.state_id) || (formData.state_id ? { id: formData.state_id } : null)}
                            onChange={(e, newValue) => handleChange({ target: { name: "state_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.state_id}
                            helperText={errors.state_id}
                            required
                        />
                        <AutocompleteField
                            name="city_id"
                            label="City"
                            options={options.cities.filter((c) => {
                                if (!formData.state_id) return false;
                                const cityStateId = typeof c.state_id === "string" ? parseInt(c.state_id, 10) : c.state_id;
                                const selectedStateId = typeof formData.state_id === "string" ? parseInt(formData.state_id, 10) : formData.state_id;
                                return cityStateId === selectedStateId;
                            })}
                            getOptionLabel={getOptionLabel}
                            value={(() => {
                                const filtered = options.cities.filter((c) => {
                                    if (!formData.state_id) return false;
                                    const cityStateId = typeof c.state_id === "string" ? parseInt(c.state_id, 10) : c.state_id;
                                    const selectedStateId = typeof formData.state_id === "string" ? parseInt(formData.state_id, 10) : formData.state_id;
                                    return cityStateId === selectedStateId;
                                });
                                return filtered.find((c) => c.id == formData.city_id) || (formData.city_id ? { id: formData.city_id } : null);
                            })()}
                            onChange={(e, newValue) => handleChange({ target: { name: "city_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            error={!!errors.city_id}
                            helperText={errors.city_id}
                            disabled={!formData.state_id}
                            required
                        />
                        <Input
                            name="taluka"
                            label="Taluka"
                            value={formData.taluka || ""}
                            onChange={handleChange}
                        />
                        <Input
                            name="address"
                            label="Address"
                            value={formData.address || ""}
                            onChange={handleChange}
                            multiline
                            rows={2}
                        />
                        <Input
                            name="landmark_area"
                            label="Landmark / Area"
                            value={formData.landmark_area || ""}
                            onChange={handleChange}
                        />
                        <Input
                            name="district"
                            label="District"
                            value={formData.district || ""}
                            onChange={handleChange}
                        />
                </FormGrid>
                </FormSection>
                <FormSection title="Other Details">
                <FormGrid cols={3}>
                        <Input
                            name="remarks"
                            label="Remarks"
                            value={formData.remarks || ""}
                            onChange={handleChange}
                            multiline
                            rows={3}
                        />
                        <DateField
                            name="next_reminder_date"
                            label="Next Reminder Date"
                            value={formData.next_reminder_date || ""}
                            onChange={handleChange}
                        />
                        <Input
                            name="reference_from"
                            label="Reference From"
                            value={formData.reference_from || ""}
                            onChange={handleChange}
                        />
                        <Input
                            type="number"
                            name="estimated_cost"
                            label="Estimated Cost"
                            value={formData.estimated_cost || ""}
                            onChange={handleChange}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <AutocompleteField
                            name="payment_type"
                            label="Payment Type"
                            options={paymentTypeOptions.map((p) => ({ value: p, label: p }))}
                            getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? o?.value ?? "")}
                            value={formData.payment_type ? { value: formData.payment_type, label: formData.payment_type } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "payment_type", value: newValue?.value ?? newValue ?? "" } })}
                            placeholder="Type to search..."
                        />

                        <Checkbox
                            name="do_not_send_message"
                            label="Do not send message to customer"
                            checked={!!formData.do_not_send_message}
                            onChange={handleChange}
                        />
                </FormGrid>
                </FormSection>
            </form>
            <FormActions>
                <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    type="button"
                    onClick={() => router.push("/inquiry")}
                    disabled={loading}
                >
                    Back
                </Button>
                <LoadingButton
                    type="submit"
                    form="inquiry-form"
                    size="sm"
                    loading={loading}
                >
                    {isEdit ? "Update" : "Save"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
