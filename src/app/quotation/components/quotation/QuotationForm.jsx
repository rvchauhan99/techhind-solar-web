"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Box,
    Grid,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";
import mastersService, { getDefaultState, getReferenceOptionsSearch } from "@/services/mastersService";
import quotationService from "@/services/quotationService";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Alert from "@mui/material/Alert";

import { TECHNICAL_SECTIONS, DEFAULT_EXPANDED_ACCORDIONS } from "./quotationConfig";
import { useQuotationState } from "./useQuotationState";
import { mapBomResponseToForm } from "./useProjectBomMapper";
import { calculateTotals } from "./quotationCalculations";
import TechnicalSection from "./TechnicalSection";

const accordionStyles = {
    mb: 1,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: "8px !important",
    boxShadow: "none",
    "&:before": { display: "none" },
    "&.Mui-expanded": { margin: "0 0 8px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
};
const accordionSummaryStyles = {
    bgcolor: "grey.50",
    borderRadius: "8px",
    minHeight: "40px",
    "&.Mui-expanded": { minHeight: "40px", bgcolor: "primary.50", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    "& .MuiAccordionSummary-content": { margin: "8px 0" },
    "&:hover": { bgcolor: "grey.100" },
};
const accordionDetailsStyles = { pt: 1, pb: 1, bgcolor: "background.paper" };

const normalize = (res) => res?.result ?? res?.data ?? (Array.isArray(res) ? res : []);

export default function QuotationForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
}) {
    const { user } = useAuth();
    const {
        formData,
        errors,
        setErrors,
        handleChange,
        handleAutocompleteChange,
        patchForm,
        validate,
        buildPayload,
    } = useQuotationState({ user, defaultValues });

    const getOptionLabel = (opt) => opt?.name ?? opt?.label ?? opt?.project_capacity ?? (opt?.id != null ? String(opt.id) : "");

    const [options, setOptions] = useState({
        projectPrices: [],
        productMakes: [],
        products: [],
    });
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [lastFetchedProductBySection, setLastFetchedProductBySection] = useState({});
    const bomProductsBySectionRef = useRef({});
    const [expandedAccordions, setExpandedAccordions] = useState(DEFAULT_EXPANDED_ACCORDIONS);

    const handleAccordionChange = useCallback((panel) => (event, isExpanded) => {
        setExpandedAccordions((prev) => ({ ...prev, [panel]: isExpanded }));
    }, []);

    // Load productMakes and products for TechnicalSection; masters use async AutocompleteField.
    useEffect(() => {
        let cancelled = false;
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const [makesRes, productsRes] = await Promise.all([
                    quotationService.getAllProductMakes(),
                    quotationService.getAllProducts(),
                ]);
                const productList = Array.isArray(productsRes?.result) ? productsRes.result : [];
                productList.sort((a, b) => {
                    const orderA = a.productType?.display_order != null ? Number(a.productType.display_order) : Number.MAX_SAFE_INTEGER;
                    const orderB = b.productType?.display_order != null ? Number(b.productType.display_order) : Number.MAX_SAFE_INTEGER;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.product_name || "").localeCompare(b.product_name || "");
                });
                if (!cancelled) {
                    setOptions((vv) => ({
                        ...vv,
                        productMakes: Array.isArray(makesRes?.result) ? makesRes.result : (Array.isArray(normalize(makesRes)) ? normalize(makesRes) : []),
                        products: productList,
                    }));
                }
            } catch (err) {
                if (!cancelled) setOptions((vv) => ({ ...vv, productMakes: [], products: [] }));
            } finally {
                if (!cancelled) setLoadingOptions(false);
            }
        };
        loadOptions();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!formData.project_scheme_id) {
            setOptions((prev) => ({ ...prev, projectPrices: [] }));
            return;
        }
        let cancelled = false;
        quotationService.getAllProjectPrices(formData.project_scheme_id).then((r) => {
            if (!cancelled) setOptions((prev) => ({ ...prev, projectPrices: r?.result ?? [] }));
        }).catch(() => {
            if (!cancelled) setOptions((prev) => ({ ...prev, projectPrices: [] }));
        });
        return () => { cancelled = true; };
    }, [formData.project_scheme_id]);

    const handleProjectPriceChange = useCallback(async (projectPriceId) => {
        if (!projectPriceId) {
            bomProductsBySectionRef.current = {};
            setLastFetchedProductBySection({});
            return;
        }
        try {
            const response = await quotationService.getProjectPriceBomDetails({ id: projectPriceId });
            const data = response?.result ?? response?.data ?? response;
            if (!data || response?.success === false) return;
            const { formPatch, bomProductBySection } = mapBomResponseToForm(response);
            bomProductsBySectionRef.current = bomProductBySection;
            patchForm({ ...formPatch, project_price_id: projectPriceId });
            setLastFetchedProductBySection(bomProductBySection);
        } catch (err) {
            bomProductsBySectionRef.current = {};
            setLastFetchedProductBySection({});
        }
    }, [patchForm]);

    useEffect(() => {
        if (!defaultValues?.id && defaultValues?.inquiry_id != null && defaultValues?.inquiry_number != null) {
            quotationService.getQuotationCountByInquiry(defaultValues.inquiry_id).then((countResponse) => {
                const count = countResponse?.result?.count ?? 0;
                patchForm({ quotation_number: `${defaultValues.inquiry_number}/${count + 1}` });
            }).catch(() => patchForm({ quotation_number: "#" }));
        } else if (!defaultValues?.id) {
            patchForm({ quotation_number: "#" });
        }
    }, [defaultValues?.id, defaultValues?.inquiry_id, defaultValues?.inquiry_number, patchForm]);

    useEffect(() => {
        if (user?.id && !formData.user_id) patchForm({ user_id: user.id });
    }, [user?.id, formData.user_id, patchForm]);

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) return;
        if (formData.state_id) return;
        getDefaultState().then((res) => {
            const defaultState = res?.result ?? res?.data ?? res;
            if (defaultState?.id) patchForm({ state_id: defaultState.id });
        }).catch(() => {});
    }, [defaultValues, formData.state_id, patchForm]);

    const sortedTechnicalSections = useMemo(() => {
        const products = options.products || [];
        const typeOrderMap = {};
        products.forEach((p) => {
            const name = p.productType?.name?.toLowerCase();
            if (name != null && p.productType?.display_order != null) {
                const order = Number(p.productType.display_order);
                if (typeOrderMap[name] === undefined || order < typeOrderMap[name]) typeOrderMap[name] = order;
            }
        });
        const fallbackOrder = 999;
        return [...TECHNICAL_SECTIONS].sort((a, b) => {
            const orderA = a.typeNames.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...a.typeNames.map((t) => typeOrderMap[t] ?? fallbackOrder));
            const orderB = b.typeNames.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...b.typeNames.map((t) => typeOrderMap[t] ?? fallbackOrder));
            return orderA - orderB;
        });
    }, [options.products]);

    const fallbackBySection = lastFetchedProductBySection;
    const totals = useMemo(() => calculateTotals(formData), [formData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (serverError) onClearServerError();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) return;
        setErrors({});
        onSubmit(buildPayload());
    };

    const projectPriceDisabled = !!formData.project_price_id;

    return (
        <FormContainer>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 0.5, pr: 1 }}>
                {serverError && (
                    <Box mb={1}>
                        <Alert severity="error">{serverError}</Alert>
                    </Box>
                )}

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Basic Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <DateField fullWidth label="Quotation Date" name="quotation_date" value={formData.quotation_date} onChange={handleChange} error={!!errors.quotation_date} helperText={errors.quotation_date} disabled />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Quotation Number" name="quotation_number" value={formData.quotation_number} onChange={handleChange} error={!!errors.quotation_number} helperText={errors.quotation_number} disabled sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="user_id"
                            label="Quotation By"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                            referenceModel="user.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.user_id ? (user?.id === formData.user_id ? { id: user.id, name: user.name } : { id: formData.user_id }) : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "user_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            required
                            error={!!errors.user_id}
                            helperText={errors.user_id}
                            disabled
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="branch_id"
                            label="Branch"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                            referenceModel="company_branch.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.branch_id ? { id: formData.branch_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "branch_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <DateField name="valid_till" label="Valid Till" value={formData.valid_till} onChange={handleChange} error={!!errors.valid_till} helperText={errors.valid_till} />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Customer Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Customer Name" name="customer_name" value={formData.customer_name} onChange={handleChange} required error={!!errors.customer_name} helperText={errors.customer_name} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <PhoneField fullWidth name="mobile_number" label="Mobile Number" value={formData.mobile_number ?? ""} onChange={handleChange} required error={!!errors.mobile_number} helperText={errors.mobile_number} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={!!errors.email} helperText={errors.email} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Company Name" name="company_name" value={formData.company_name} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="state_id"
                            label="State"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("state.model", { q, limit: 20 })}
                            referenceModel="state.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.state_id ? { id: formData.state_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "state_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                            required
                            error={!!errors.state_id}
                            helperText={errors.state_id}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Input fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} multiline rows={1} />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Project Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="order_type_id"
                            label="Order Type"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("order_type.model", { q, limit: 20 })}
                            referenceModel="order_type.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.order_type_id ? { id: formData.order_type_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "order_type_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="project_scheme_id"
                            label="Project Scheme"
                            asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
                            referenceModel="project_scheme.model"
                            getOptionLabel={getOptionLabel}
                            value={formData.project_scheme_id ? { id: formData.project_scheme_id } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "project_scheme_id", value: newValue?.id ?? "" } })}
                            placeholder="Type to search..."
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            name="project_price_id"
                            label="Select Project"
                            options={options.projectPrices || []}
                            getOptionLabel={(p) => p?.project_capacity != null ? String(p.project_capacity) : (p?.name ?? "")}
                            value={(options.projectPrices || []).find((p) => p.id === formData.project_price_id) || (formData.project_price_id ? { id: formData.project_price_id } : null)}
                            onChange={(e, newValue) => {
                                handleChange({ target: { name: "project_price_id", value: newValue?.id ?? "" } });
                                handleProjectPriceChange(newValue?.id ?? "");
                            }}
                            placeholder="Type to search..."
                            disabled={!formData.project_scheme_id || loadingOptions}
                        />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Technical Details</Typography>
                </Box>
                {sortedTechnicalSections.map((section) => (
                    <Accordion key={section.key} expanded={expandedAccordions[section.key]} onChange={handleAccordionChange(section.key)} sx={accordionStyles}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                            <Typography variant="subtitle2" fontWeight={600}>{section.title}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={accordionDetailsStyles}>
                            <TechnicalSection
                                section={section}
                                formData={formData}
                                options={options}
                                productMakes={options.productMakes || []}
                                fallbackBySection={fallbackBySection}
                                disabled={projectPriceDisabled}
                                handleChange={handleChange}
                                handleAutocompleteChange={handleAutocompleteChange}
                                patchForm={patchForm}
                            />
                        </AccordionDetails>
                    </Accordion>
                ))}

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Project Price Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Project Capacity" name="project_capacity" value={formData.project_capacity} onChange={handleChange} required disabled error={!!errors.project_capacity} helperText={errors.project_capacity} sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Price Per KW" name="price_per_kw" value={formData.price_per_kw} onChange={handleChange} disabled={projectPriceDisabled} required error={!!errors.price_per_kw} helperText={errors.price_per_kw} sx={projectPriceDisabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Total Project Value" name="total_project_value" value={formData.total_project_value} onChange={handleChange} disabled={projectPriceDisabled} required error={!!errors.total_project_value} helperText={errors.total_project_value} sx={projectPriceDisabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Structure Amount" name="structure_amount" value={formData.structure_amount} onChange={handleChange} disabled={projectPriceDisabled} sx={projectPriceDisabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Subsidy Amount" name="subsidy_amount" value={formData.subsidy_amount} onChange={handleChange} disabled={projectPriceDisabled} sx={projectPriceDisabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="State Subsidy Amount" name="state_subsidy_amount" value={formData.state_subsidy_amount} onChange={handleChange} disabled={projectPriceDisabled} sx={projectPriceDisabled ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Netmeter Amount" name="netmeter_amount" value={formData.netmeter_amount} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Stamp Charges" name="stamp_charges" value={formData.stamp_charges} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="State Government Amount" name="state_government_amount" value={formData.state_government_amount} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <AutocompleteField
                            fullWidth
                            name="discount_type"
                            label="Discount Type"
                            options={[{ value: "Before Tax", label: "Before Tax" }, { value: "After Tax", label: "After Tax" }]}
                            getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
                            value={formData.discount_type ? { value: formData.discount_type, label: formData.discount_type } : null}
                            onChange={(e, newValue) => handleChange({ target: { name: "discount_type", value: newValue?.value ?? "" } })}
                            placeholder="Type to search..."
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Discount" name="discount" value={formData.discount} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="GST Rate (%)" name="gst_rate" value={formData.gst_rate} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Additional Cost Details 1" name="additional_cost_details_1" value={formData.additional_cost_details_1} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Amount 1" name="additional_cost_amount_1" value={formData.additional_cost_amount_1} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Additional Cost Details 2" name="additional_cost_details_2" value={formData.additional_cost_details_2} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Amount 2" name="additional_cost_amount_2" value={formData.additional_cost_amount_2} onChange={handleChange} />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Terms and Conditions</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth type="number" label="System Warranty (Years)" name="system_warranty_years" value={formData.system_warranty_years} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Payment Terms" name="payment_terms" value={formData.payment_terms} onChange={handleChange} multiline rows={2} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input fullWidth label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} multiline rows={2} />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Graph Generation Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Price Per Unit (₹/kWh)" name="graph_price_per_unit" value={formData.graph_price_per_unit} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Per Day Generation (kWh)" name="graph_per_day_generation" value={formData.graph_per_day_generation} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Yearly Increment in Price (%)" name="graph_yearly_increment_price" value={formData.graph_yearly_increment_price} onChange={handleChange} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth type="number" label="Yearly Decrement in Generation (%)" name="graph_yearly_decrement_generation" value={formData.graph_yearly_decrement_generation} onChange={handleChange} />
                    </Grid>
                </Grid>

                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Final Payable Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Project Cost" value={formData.total_project_value || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Netmeter (+)" value={formData.netmeter_amount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Stamp Charges (+)" value={formData.stamp_charges || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="State Government Amt (+)" value={formData.state_government_amount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Structure (+)" value={formData.structure_amount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Additional Amt 1 (+)" value={formData.additional_cost_amount_1 || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Additional Amt 2 (+)" value={formData.additional_cost_amount_2 || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Discount (-)" value={formData.discount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="GST (+)" value={totals.gstAmount.toFixed(2)} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Total Payable (=)" value={totals.totalPayable.toFixed(2)} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Subsidy Amount (-)" value={formData.subsidy_amount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="State Subsidy (-)" value={formData.state_subsidy_amount || 0} InputProps={{ readOnly: true }} sx={{ bgcolor: "action.hover" }} />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input fullWidth label="Effective Cost (=)" value={totals.effectiveCost.toFixed(2)} InputProps={{ readOnly: true }} />
                    </Grid>
                </Grid>

                <FormActions>
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || loadingOptions}>Cancel</Button>
                    )}
                    <LoadingButton type="submit" loading={loading || loadingOptions}>Submit</LoadingButton>
                </FormActions>
            </Box>
        </FormContainer>
    );
}
