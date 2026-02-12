"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import { validatePhone, validateEmail, formatPhone, validateE164Phone } from "@/utils/validators";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
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

    const [options, setOptions] = useState({
        inquirySources: [],
        users: [],
        branches: [],
        projectSchemes: [],
        orderTypes: [],
        discoms: [],
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
                const [
                    inquirySourceRes,
                    usersRes,
                    branchesRes,
                    projectSchemesRes,
                    orderTypesRes,
                    discomsRes,
                    statesRes,
                    citiesRes,
                    constantsRes,
                ] = await Promise.all([
                    mastersService.getReferenceOptions("inquiry_source.model"),
                    mastersService.getReferenceOptions("user.model"),
                    mastersService.getReferenceOptions("company_branch.model"),
                    mastersService.getReferenceOptions("project_scheme.model"),
                    mastersService.getReferenceOptions("order_type.model"),
                    mastersService.getReferenceOptions("discom.model"),
                    mastersService.getReferenceOptions("state.model"),
                    mastersService.getReferenceOptions("city.model"),
                    mastersService.getConstants(),
                ]);

                setOptions({
                    inquirySources: inquirySourceRes?.result || [],
                    users: usersRes?.result || [],
                    branches: branchesRes?.result || [],
                    projectSchemes: projectSchemesRes?.result || [],
                    orderTypes: orderTypesRes?.result || [],
                    discoms: discomsRes?.result || [],
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
                        <Select
                            name="inquiry_source_id"
                            label="Inquiry Source"
                            value={formData.inquiry_source_id || ""}
                            onChange={handleChange}
                            error={!!errors.inquiry_source_id}
                            helperText={errors.inquiry_source_id}
                            required
                        >
                            {options.inquirySources.map((opt) => (
                                <MenuItem key={opt.id} value={opt.id}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <DateField
                            name="date_of_inquiry"
                            label="Date of Inquiry"
                            value={formData.date_of_inquiry || ""}
                            onChange={handleChange}
                            error={!!errors.date_of_inquiry}
                            helperText={errors.date_of_inquiry}
                            required
                        />
                        <Select
                            name="inquiry_by"
                            label="Inquiry By"
                            value={formData.inquiry_by || ""}
                            onChange={handleChange}
                            error={!!errors.inquiry_by}
                            helperText={errors.inquiry_by}
                            required
                        >
                            {options.users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="handled_by"
                            label="Handled By"
                            value={formData.handled_by || ""}
                            onChange={handleChange}
                            error={!!errors.handled_by}
                            helperText={errors.handled_by}
                            required
                        >
                            {options.users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="channel_partner"
                            label="Channel Partner"
                            value={formData.channel_partner || ""}
                            onChange={handleChange}
                        >
                            {options.users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="branch_id"
                            label="Branch"
                            value={formData.branch_id || ""}
                            onChange={handleChange}
                            error={!!errors.branch_id}
                            helperText={errors.branch_id}
                            required
                        >
                            {options.branches.map((b) => (
                                <MenuItem key={b.id} value={b.id}>
                                    {b.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="project_scheme_id"
                            label="Project Scheme"
                            value={formData.project_scheme_id || ""}
                            onChange={handleChange}
                            error={!!errors.project_scheme_id}
                            helperText={errors.project_scheme_id}
                            required
                        >
                            {options.projectSchemes.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.label}
                                </MenuItem>
                            ))}
                        </Select>
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
                        <Select
                            name="order_type"
                            label="Order Type"
                            value={formData.order_type || ""}
                            onChange={handleChange}
                            error={!!errors.order_type}
                            helperText={errors.order_type}
                            required
                        >
                            {options.orderTypes.map((o) => (
                                <MenuItem key={o.id} value={o.id}>
                                    {o.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="discom_id"
                            label="Discom"
                            value={formData.discom_id || ""}
                            onChange={handleChange}
                        >
                            {options.discoms.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="rating"
                            label="Customer Eagerness"
                            value={formData.rating || ""}
                            onChange={handleChange}
                        >
                            {ratingOptions.map((r) => (
                                <MenuItem key={r} value={r}>
                                    {r}
                                </MenuItem>
                            ))}
                        </Select>
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
                        <Select
                            name="state_id"
                            label="State"
                            value={formData.state_id || ""}
                            onChange={handleChange}
                            error={!!errors.state_id}
                            helperText={errors.state_id}
                            required
                        >
                            {options.states.map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                    {s.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            name="city_id"
                            label="City"
                            value={formData.city_id || ""}
                            onChange={handleChange}
                            error={!!errors.city_id}
                            helperText={errors.city_id}
                            disabled={!formData.state_id}
                            required
                        >
                            {options.cities
                                .filter((c) => {
                                    // Filter cities by selected state
                                    if (!formData.state_id) return false;
                                    // Handle both string and number comparison
                                    const cityStateId = typeof c.state_id === 'string' ? parseInt(c.state_id) : c.state_id;
                                    const selectedStateId = typeof formData.state_id === 'string' ? parseInt(formData.state_id) : formData.state_id;
                                    return cityStateId === selectedStateId;
                                })
                                .map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.label}
                                    </MenuItem>
                                ))}
                        </Select>
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
                        <Select
                            name="payment_type"
                            label="Payment Type"
                            value={formData.payment_type || ""}
                            onChange={handleChange}
                        >
                            {paymentTypeOptions.map((p) => (
                                <MenuItem key={p} value={p}>
                                    {p}
                                </MenuItem>
                            ))}
                        </Select>

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
