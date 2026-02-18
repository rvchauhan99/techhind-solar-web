"use client";

import { useState, useEffect, useRef } from "react";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import { IconUpload } from "@tabler/icons-react";
import mastersService, { getDefaultState, getReferenceOptionsSearch } from "@/services/mastersService";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import { resolveDocumentUrl } from "@/services/apiClient";

export default function OrderForm({
    defaultValues = {},
    quotationData = null, // Add quotationData prop
    onSubmit,
    onCancel,
    loading = false,
    serverError = null,
    onClearServerError,
}) {
    const [formData, setFormData] = useState({
        // Order details
        order_date: "",
        status: "pending",
        capacity: "",
        existing_pv_capacity: "",
        project_cost: "",
        discount: "0",
        order_remarks: "",

        // References
        inquiry_id: "",
        quotation_id: "",
        project_scheme_id: "",
        order_type_id: "",
        solar_panel_id: "",
        inverter_id: "",
        project_phase_id: "",

        // Customer (readonly)
        customer_id: "",
        customer_name: "",
        mobile_number: "",
        company_name: "",
        address: "",
        email: "",
        phone_no: "",
        pin_code: "",
        state_id: "",
        city_id: "",
        landmark_area: "",
        district: "",

        // Assignment
        inquiry_source_id: "",
        inquiry_by: "",
        handled_by: "",
        reference_from: "",
        branch_id: "",
        channel_partner_id: "",

        // Discom details
        discom_id: "",
        consumer_no: "",
        division_id: "",
        sub_division_id: "",
        circle: "",
        demand_load: "",

        // Government registration
        date_of_registration_gov: "",
        application_no: "",
        guvnl_no: "",
        feasibility_date: "",
        geda_registration_date: "",

        // Payment
        payment_type: "",
        loan_type_id: "",

        // Documents
        electricity_bill: null,
        house_tax_bill: null,
        aadhar_card: null,
        passport_photo: null,
        pan_card: null,
        cancelled_cheque: null,
        customer_sign: null,

        ...Object.keys(defaultValues).reduce((acc, key) => {
            const docFields = ['electricity_bill', 'house_tax_bill', 'aadhar_card', 'passport_photo', 'pan_card', 'cancelled_cheque', 'customer_sign'];
            if (docFields.includes(key)) {
                acc[key] = defaultValues[key];
            } else {
                acc[key] = defaultValues[key] === null ? '' : defaultValues[key];
            }
            return acc;
        }, {}),
    });

    const [errors, setErrors] = useState({});
    const [dropdowns, setDropdowns] = useState({
        solarPanels: [],
        inverters: [],
    });
    const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);
    const hasLoaded = useRef(false);

    const getOptionLabel = (opt) =>
        opt?.source_name ?? opt?.type_name ?? opt?.name ?? opt?.label ?? opt?.username ?? (opt?.id != null ? String(opt.id) : "");

    // Load only non-master dropdown options (solar panels, inverters, payment types)
    useEffect(() => {
        const loadDropdowns = async () => {
            if (hasLoaded.current) return;
            hasLoaded.current = true;
            try {
                const [constantsRes, solarPanelsRes, invertersRes] = await Promise.all([
                    mastersService.getConstants(),
                    orderService.getSolarPanels(),
                    orderService.getInverters(),
                ]);
                setDropdowns({
                    solarPanels: Array.isArray(solarPanelsRes?.result) ? solarPanelsRes.result : [],
                    inverters: Array.isArray(invertersRes?.result) ? invertersRes.result : [],
                });
                const payload = constantsRes?.result || constantsRes;
                setPaymentTypeOptions(payload?.paymentTypes || []);
            } catch (err) {
                console.error("Failed to load dropdown options", err);
            }
        };
        loadDropdowns();
    }, []);

    // Auto-populate default state for new orders
    useEffect(() => {
        const loadDefaultState = async () => {
            // Only auto-populate if no defaultValues (new order) and state_id is not set
            if (!defaultValues || Object.keys(defaultValues).length === 0) {
                if (!formData.state_id) {
                    try {
                        const defaultStateRes = await getDefaultState();
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
                        // Continue without default state
                    }
                }
            }
        };

        loadDefaultState();
    }, [defaultValues, formData.state_id]);

    // Update form data when defaultValues change
    useEffect(() => {
        if (Object.keys(defaultValues).length > 0) {
            setFormData(prev => {
                const updated = { ...prev };
                Object.keys(defaultValues).forEach(key => {
                    const value = defaultValues[key];
                    // If the field is one of the documents, we might keep it as null or string path
                    const docFields = ['electricity_bill', 'house_tax_bill', 'aadhar_card', 'passport_photo', 'pan_card', 'cancelled_cheque', 'customer_sign'];

                    if (docFields.includes(key)) {
                        if (value !== undefined) updated[key] = value;
                    } else {
                        // For all other fields (presumably strings/numbers), convert null to empty string
                        if (value !== undefined) {
                            updated[key] = value === null ? '' : value;
                        }
                    }
                });
                return updated;
            });
        }
    }, [defaultValues]);

    // Auto-populate solar_panel_id and inverter_id from quotationData (prefer bom_snapshot, fallback to panel_product/inverter_product)
    useEffect(() => {
        if (quotationData && formData.quotation_id) {
            let panelId = null;
            let inverterId = null;
            if (Array.isArray(quotationData.bom_snapshot) && quotationData.bom_snapshot.length > 0) {
                const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "_");
                for (const line of quotationData.bom_snapshot) {
                    const p = line.product_snapshot || line;
                    const t = norm(p?.product_type_name);
                    if (t === "panel" && panelId == null) panelId = line.product_id;
                    if (t === "inverter" && inverterId == null) inverterId = line.product_id;
                    if (panelId != null && inverterId != null) break;
                }
            }
            const solar_panel_id = panelId != null ? Number(panelId) : (quotationData.panel_product ? Number(quotationData.panel_product) : undefined);
            const inverter_id = inverterId != null ? Number(inverterId) : (quotationData.inverter_product ? Number(quotationData.inverter_product) : undefined);
            setFormData(prev => ({
                ...prev,
                capacity: quotationData.project_capacity ? Number(quotationData.project_capacity) : prev.capacity,
                project_cost: quotationData.project_cost ? Number(quotationData.project_cost) : prev.project_cost,
                project_scheme_id: quotationData.project_scheme_id ? Number(quotationData.project_scheme_id) : prev.project_scheme_id,
                order_type_id: quotationData.order_type_id ? Number(quotationData.order_type_id) : prev.order_type_id,
                solar_panel_id: solar_panel_id ?? prev.solar_panel_id,
                inverter_id: inverter_id ?? prev.inverter_id,
            }));
        }
    }, [quotationData, formData.quotation_id]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (serverError && onClearServerError) {
            onClearServerError();
        }
    };

    const handleChangeEvent = (e) => {
        const { name, value } = e.target;
        if (name != null) handleChange(name, value);
    };

    const validate = () => {
        const newErrors = {};

        // Required fields
        if (!formData.order_date) newErrors.order_date = "Order date is required";
        if (!formData.inquiry_source_id) newErrors.inquiry_source_id = "Inquiry source is required";
        if (!formData.inquiry_by) newErrors.inquiry_by = "Inquiry by is required";
        if (!formData.handled_by) newErrors.handled_by = "Handled by is required";
        if (!formData.branch_id) newErrors.branch_id = "Branch is required";
        if (!formData.project_scheme_id) newErrors.project_scheme_id = "Project scheme is required";
        if (!formData.capacity) newErrors.capacity = "Capacity is required";
        if (!formData.project_cost) newErrors.project_cost = "Project cost is required";
        if (!formData.order_type_id) newErrors.order_type_id = "Order type is required";
        if (!formData.customer_id) newErrors.customer_id = "Customer is required";
        if (!formData.discom_id) newErrors.discom_id = "Discom is required";
        if (!formData.consumer_no) newErrors.consumer_no = "Consumer number is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
        }
    };

    return (
        <FormContainer>
            <form
                id="order-form"
                onSubmit={handleSubmit}
                className="mx-auto ml-2 pr-1 max-w-full"
                noValidate
            >
                {serverError && (
                    <div
                        role="alert"
                        className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2"
                    >
                        <span>{serverError}</span>
                        {onClearServerError && (
                            <Button type="button" variant="link" size="sm" className="text-destructive hover:underline p-0 h-auto" onClick={onClearServerError}>
                                Dismiss
                            </Button>
                        )}
                    </div>
                )}

                <FormSection title="Inquiry Information">
                    <FormGrid cols={3}>
                        <AutocompleteField
                            name="inquiry_source_id"
                            label="Inquiry Source"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })}
                            referenceModel="inquiry_source.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.inquiry_source_id ? { id: formData.inquiry_source_id } : null}
                            onChange={(e, newValue) => handleChange("inquiry_source_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.inquiry_source_id}
                            helperText={errors.inquiry_source_id}
                            required
                        />
                        <AutocompleteField
                            name="inquiry_by"
                            label="Inquiry By"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.inquiry_by ? { id: formData.inquiry_by } : null}
                            onChange={(e, newValue) => handleChange("inquiry_by", newValue?.id ?? "")}
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
                            onChange={(e, newValue) => handleChange("handled_by", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.handled_by}
                            helperText={errors.handled_by}
                            required
                        />
                        <Input
                            name="reference_from"
                            label="Reference From"
                            value={formData.reference_from || ""}
                            onChange={handleChangeEvent}
                        />
                    </FormGrid>
                </FormSection>

                <FormSection title="Project Details">
                    <FormGrid cols={3}>
                        <DateField
                            name="order_date"
                            label="Date of Order"
                            value={formData.order_date || ""}
                            onChange={handleChangeEvent}
                            error={!!errors.order_date}
                            helperText={errors.order_date}
                            required
                        />
                        <AutocompleteField
                            name="branch_id"
                            label="Branch"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                            referenceModel="company_branch.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.branch_id ? { id: formData.branch_id } : null}
                            onChange={(e, newValue) => handleChange("branch_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.branch_id}
                            helperText={errors.branch_id}
                            required
                        />
                        <AutocompleteField
                            name="channel_partner_id"
                            label="Channel Partner"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.channel_partner_id ? { id: formData.channel_partner_id } : null}
                            onChange={(e, newValue) => handleChange("channel_partner_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="project_scheme_id"
                            label="Project Scheme"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
                            referenceModel="project_scheme.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.project_scheme_id ? { id: formData.project_scheme_id } : null}
                            onChange={(e, newValue) => handleChange("project_scheme_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.project_scheme_id}
                            helperText={errors.project_scheme_id}
                            required
                        />
                        <Input
                            type="number"
                            name="capacity"
                            label="Capacity"
                            value={formData.capacity ?? ""}
                            onChange={handleChangeEvent}
                            error={!!errors.capacity}
                            helperText={errors.capacity}
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <Input
                            type="number"
                            name="existing_pv_capacity"
                            label="Existing PV Capacity"
                            value={formData.existing_pv_capacity ?? ""}
                            onChange={handleChangeEvent}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <Input
                            type="number"
                            name="project_cost"
                            label="Project Cost"
                            value={formData.project_cost ?? ""}
                            onChange={handleChangeEvent}
                            error={!!errors.project_cost}
                            helperText={errors.project_cost}
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <Input
                            type="number"
                            name="discount"
                            label="Discount"
                            value={formData.discount ?? ""}
                            onChange={handleChangeEvent}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <AutocompleteField
                            name="order_type_id"
                            label="Order Type"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("order_type.model", { q, limit: 20 })}
                            referenceModel="order_type.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.order_type_id ? { id: formData.order_type_id } : null}
                            onChange={(e, newValue) => handleChange("order_type_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.order_type_id}
                            helperText={errors.order_type_id}
                            required
                        />
                        <AutocompleteField
                            name="solar_panel_id"
                            label="Solar Panel"
                            options={dropdowns.solarPanels}
                            getOptionLabel={(item) => item?.label || item?.product_name || item?.name ?? ""}
                            value={dropdowns.solarPanels.find((p) => p.id === formData.solar_panel_id) || (formData.solar_panel_id ? { id: formData.solar_panel_id } : null)}
                            onChange={(e, newValue) => handleChange("solar_panel_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="inverter_id"
                            label="Inverter"
                            options={dropdowns.inverters}
                            getOptionLabel={(item) => item?.label || item?.product_name || item?.name ?? ""}
                            value={dropdowns.inverters.find((p) => p.id === formData.inverter_id) || (formData.inverter_id ? { id: formData.inverter_id } : null)}
                            onChange={(e, newValue) => handleChange("inverter_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <Input
                            name="order_remarks"
                            label="Order Remarks"
                            value={formData.order_remarks || ""}
                            onChange={handleChangeEvent}
                            multiline
                            rows={1}
                        />
                    </FormGrid>
                </FormSection>

                <FormSection title="Customer Details">
                    <FormGrid cols={3}>
                        <Input
                            name="customer_name"
                            label="Customer Name"
                            value={formData.customer_name ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="mobile_number"
                            label="Mobile Number"
                            value={formData.mobile_number ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="company_name"
                            label="Company Name"
                            value={formData.company_name ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="phone_no"
                            label="Phone No"
                            value={formData.phone_no ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="email"
                            label="Email Id"
                            value={formData.email ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="pin_code"
                            label="Pin Code"
                            value={formData.pin_code ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="state_id"
                            label="State"
                            value={formData.state_id ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="city_id"
                            label="City"
                            value={formData.city_id ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="address"
                            label="Address"
                            value={formData.address ?? ""}
                            onChange={handleChangeEvent}
                            multiline
                            rows={1}
                            disabled
                        />
                        <Input
                            name="landmark_area"
                            label="Landmark / Area"
                            value={formData.landmark_area ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                        <Input
                            name="district"
                            label="District"
                            value={formData.district ?? ""}
                            onChange={handleChangeEvent}
                            disabled
                        />
                    </FormGrid>
                </FormSection>

                <FormSection title="Connection Details">
                    <FormGrid cols={3}>
                        <AutocompleteField
                            name="discom_id"
                            label="Discom"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("discom.model", { q, limit: 20 })}
                            getOptionLabel={getOptionLabel}
                            value={formData.discom_id ? { id: formData.discom_id } : null}
                            onChange={(e, newValue) => handleChange("discom_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                            error={!!errors.discom_id}
                            helperText={errors.discom_id}
                            required
                        />
                        <Input
                            name="consumer_no"
                            label="Consumer No"
                            value={formData.consumer_no ?? ""}
                            onChange={handleChangeEvent}
                            error={!!errors.consumer_no}
                            helperText={errors.consumer_no}
                            required
                        />
                        <AutocompleteField
                            name="division_id"
                            label="Division"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("division.model", { q, limit: 20 })}
                            getOptionLabel={getOptionLabel}
                            value={formData.division_id ? { id: formData.division_id } : null}
                            onChange={(e, newValue) => handleChange("division_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="sub_division_id"
                            label="Sub Division"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("sub_division.model", { q, limit: 20 })}
                            getOptionLabel={getOptionLabel}
                            value={formData.sub_division_id ? { id: formData.sub_division_id } : null}
                            onChange={(e, newValue) => handleChange("sub_division_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <Input
                            name="circle"
                            label="Circle"
                            value={formData.circle ?? ""}
                            onChange={handleChangeEvent}
                        />
                        <Input
                            type="number"
                            name="demand_load"
                            label="Demand Load"
                            value={formData.demand_load ?? ""}
                            onChange={handleChangeEvent}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <AutocompleteField
                            name="project_phase_id"
                            label="Project Phase"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("project_phase.model", { q, limit: 20 })}
                            getOptionLabel={getOptionLabel}
                            value={formData.project_phase_id ? { id: formData.project_phase_id } : null}
                            onChange={(e, newValue) => handleChange("project_phase_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                        <DateField
                            name="date_of_registration_gov"
                            label="Date of Registration Gov"
                            value={formData.date_of_registration_gov || ""}
                            onChange={handleChangeEvent}
                        />
                        <Input
                            name="application_no"
                            label="Application No"
                            value={formData.application_no ?? ""}
                            onChange={handleChangeEvent}
                        />
                        <Input
                            name="guvnl_no"
                            label="GUVNL No"
                            value={formData.guvnl_no ?? ""}
                            onChange={handleChangeEvent}
                        />
                        <DateField
                            name="feasibility_date"
                            label="Feasibility Date"
                            value={formData.feasibility_date || ""}
                            onChange={handleChangeEvent}
                        />
                        <DateField
                            name="geda_registration_date"
                            label="GEDA Registration Date"
                            value={formData.geda_registration_date || ""}
                            onChange={handleChangeEvent}
                        />
                    </FormGrid>
                </FormSection>

                <FormSection title="Loan Process / Payment Mode">
                    <FormGrid cols={3}>
                        <AutocompleteField
                            name="payment_type"
                            label="Payment Type"
                            options={paymentTypeOptions.map((item) => ({ value: item, label: item }))}
                            getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt?.label ?? opt?.value ?? "")}
                            value={formData.payment_type ? { value: formData.payment_type, label: formData.payment_type } : null}
                            onChange={(e, newValue) => handleChange("payment_type", newValue?.value ?? newValue ?? "")}
                            placeholder="Type to search..."
                        />
                        <AutocompleteField
                            name="loan_type_id"
                            label="Loan Type"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("loan_type.model", { q, limit: 20 })}
                            getOptionLabel={getOptionLabel}
                            value={formData.loan_type_id ? { id: formData.loan_type_id } : null}
                            onChange={(e, newValue) => handleChange("loan_type_id", newValue?.id ?? "")}
                            placeholder="Type to search..."
                        />
                    </FormGrid>
                </FormSection>

                <FormSection title="Document Uploads">
                    <FormGrid cols={3}>
                        {[
                            { key: "electricity_bill", label: "Electricity Bill *", accept: "image/*,application/pdf" },
                            { key: "house_tax_bill", label: "House Tax Bill", accept: "image/*,application/pdf" },
                            { key: "aadhar_card", label: "Aadhar Card *", accept: "image/*,application/pdf" },
                            { key: "passport_photo", label: "Passport Photo *", accept: "image/*" },
                            { key: "pan_card", label: "PAN Card", accept: "image/*,application/pdf" },
                            { key: "cancelled_cheque", label: "Cancelled Cheque *", accept: "image/*,application/pdf" },
                            { key: "customer_sign", label: "Customer Sign *", accept: "image/*" },
                        ].map(({ key, label, accept }) => (
                            <div key={key} className="space-y-1">
                                <Button variant="outline" className="w-full justify-start gap-2 h-9" asChild>
                                    <label className="cursor-pointer flex items-center gap-2 w-full justify-start">
                                        <IconUpload className="size-4 shrink-0" />
                                        <span>{label}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept={accept}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleChange(key, file);
                                            }}
                                        />
                                    </label>
                                </Button>
                                {formData[key] && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{typeof formData[key] === "string" ? "Current File" : formData[key].name}</span>
                                        {typeof formData[key] === "string" && (
                                            defaultValues?.documentIds?.[key] ? (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const url = await orderDocumentsService.getDocumentUrl(defaultValues.documentIds[key]);
                                                            if (url) window.open(url, "_blank");
                                                        } catch (e) {
                                                            console.error("Failed to get document URL", e);
                                                        }
                                                    }}
                                                    className="text-primary hover:underline text-xs"
                                                >
                                                    (View)
                                                </button>
                                            ) : (
                                                <a
                                                    href={resolveDocumentUrl(formData[key])}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-xs"
                                                >
                                                    (View)
                                                </a>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </FormGrid>
                </FormSection>
            </form>
            <FormActions>
                <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" form="order-form" size="sm" loading={loading}>
                    Save Order
                </Button>
            </FormActions>
        </FormContainer>
    );
}
