"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Grid,
    Button,
    MenuItem,
    Typography,
    FormControlLabel,
    Checkbox,
    Alert,
    Autocomplete,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import {
    COMPACT_FORM_SPACING,
    COMPACT_SECTION_HEADER_STYLE,
} from "@/utils/formConstants";
import mastersService, { getDefaultState } from "@/services/mastersService";
import quotationService from "@/services/quotationService";
import { useAuth } from "@/hooks/useAuth";
import { validatePhone, validateEmail, formatPhone } from "@/utils/validators";

export default function QuotationForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => { },
    onCancel = null,
}) {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        // Basic
        quotation_number: "",
        quotation_date: new Date().toISOString().split("T")[0],
        valid_till: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split("T")[0],
        user_id: user?.id,
        branch_id: "",
        inquiry_id: "",
        // Customer
        customer_id: "",
        customer_name: "",
        mobile_number: "",
        email: "",
        company_name: "",
        state_id: "",
        address: "",
        // Project
        order_type_id: "",
        project_scheme_id: "",
        project_price_id: "",
        project_capacity: "",
        price_per_kw: "",
        total_project_value: "",
        structure_amount: "",
        subsidy_amount: "",
        state_subsidy_amount: "",
        netmeter_amount: "",
        stamp_charges: "",
        state_government_amount: "",
        discount_type: "",
        discount: "",
        gst_rate: "",
        additional_cost_details_1: "",
        additional_cost_amount_1: "",
        additional_cost_details_2: "",
        additional_cost_amount_2: "",
        // Technical - Structure
        structure_product: "",
        structure_height: "",
        structure_material: "",
        // Technical - Panel
        panel_product: "",
        panel_size: "",
        panel_quantity: "",
        panel_make_ids: [],
        panel_type: "",
        panel_warranty: "",
        panel_performance_warranty: "",
        // Technical - Inverter
        inverter_product: "",
        inverter_size: "",
        inverter_quantity: "",
        inverter_make_ids: [],
        inverter_warranty: "",
        // Technical - Hybrid Inverter
        hybrid_inverter_product: "",
        hybrid_inverter_size: "",
        hybrid_inverter_quantity: "",
        hybrid_inverter_make_ids: [],
        hybrid_inverter_warranty: "",
        // Technical - Battery
        battery_product: "",
        battery_size: "",
        battery_quantity: "",
        battery_make_ids: [],
        battery_type: "",
        battery_warranty: "",
        // Technical - ACDB/DCDB
        acdb_product: "",
        acdb_quantity: "",
        acdb_description: "",
        dcdb_product: "",
        dcdb_quantity: "",
        dcdb_description: "",
        // Technical - Cable
        cable_ac_product: "",
        cable_ac_quantity: "",
        cable_ac_make_ids: [],
        cable_ac_description: "",
        cable_dc_product: "",
        cable_dc_quantity: "",
        cable_dc_make_ids: [],
        cable_dc_description: "",
        // Technical - Earthing & LA
        earthing_product: "",
        earthing_quantity: "",
        earthing_make_ids: [],
        earthing_description: "",
        la_product: "",
        la_quantity: "",
        la_make_ids: [],
        la_description: "",
        // Technical - Descriptions
        earthing_description_text: "",
        lightening_arrester_description_text: "",
        mis_description: "",
        battery_description_text: "",
        // Terms
        system_warranty_years: "",
        payment_terms: "",
        remarks: "",
        // Graph
        graph_price_per_unit: "",
        graph_per_day_generation: "",
        graph_yearly_increment_price: "",
        graph_yearly_decrement_generation: "",
        // Calculations
        project_cost: "",
        total_payable: "",
        effective_cost: "",
    });

    const [errors, setErrors] = useState({});
    const [options, setOptions] = useState({
        users: [],
        branches: [],
        inquiries: [],
        customers: [],
        states: [],
        orderTypes: [],
        projectSchemes: [],
        projectPrices: [],
        productMakes: [],
        products: [],
    });
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState({
        structure: true,
        panel: true,
        inverter: true,
        battery: false,
        hybridInverter: false,
        acdb: true,
        dcdb: true,
        cable: true,
        earthing: true,
        la: true,
        additionalDescriptions: true,
    });

    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpandedAccordions(prev => ({
            ...prev,
            [panel]: isExpanded
        }));
    };

    // Common accordion styling for Technical Details section (compact ERP style)
    const accordionStyles = {
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
            margin: '0 0 8px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
    };

    const accordionSummaryStyles = {
        bgcolor: 'grey.50',
        borderRadius: '8px',
        minHeight: '40px',
        '&.Mui-expanded': {
            minHeight: '40px',
            bgcolor: 'primary.50',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
        },
        '& .MuiAccordionSummary-content': {
            margin: '8px 0',
        },
        '&:hover': {
            bgcolor: 'grey.100',
        },
    };

    const accordionDetailsStyles = {
        pt: 1,
        pb: 1,
        bgcolor: 'background.paper',
    };

    useEffect(() => {
        const fetchprojectPrice = async () => {
            try {
                const projectPricesOpt = await quotationService.getAllProjectPrices(formData.project_scheme_id);
                console.log(projectPricesOpt.result)
                setOptions((prev) => ({
                    ...prev,
                    projectPrices: projectPricesOpt.result || [],
                }));
            } catch (error) {
                console.error("Error fetching rating options:", error);
                setOptions((prev) => ({ ...prev, projectPrices: [] }));
            }
        };
        if (!formData.project_scheme_id) {
            return
        }
        fetchprojectPrice();
    }, [formData.project_scheme_id]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsOpt = await quotationService.getAllProducts();
                console.log("products:", productsOpt.result)
                setOptions((prev) => ({
                    ...prev,
                    products: productsOpt.result || [],
                }));
            } catch (error) {
                console.error("Error fetching products:", error);
                setOptions((prev) => ({ ...prev, products: [] }));
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchProductMakes = async () => {
            try {
                const productMakesOpt = await quotationService.getAllProductMakes();
                console.log("harsh", productMakesOpt.result)
                setOptions((prev) => ({
                    ...prev,
                    productMakes: productMakesOpt.result || [],
                }));
            } catch (error) {
                console.error("Error fetching product makes:", error);
                setOptions((prev) => ({ ...prev, productMakes: [] }));
            }
        };
        fetchProductMakes();
    }, []);

    useEffect(() => {
        if (!defaultValues || Object.keys(defaultValues).length === 0) return;

        // convert null/undefined → "" for all fields
        // Keep numbers as numbers (Select can handle them), but convert null/undefined to ""
        const cleanedValues = Object.fromEntries(
            Object.entries(defaultValues).map(([key, value]) => [
                key,
                value === null || value === undefined ? "" : value
            ])
        );

        setFormData((prev) => ({
            ...prev,
            ...cleanedValues
        }));
    }, [defaultValues]);


    useEffect(() => {
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const [usersRes, branchesRes, statesRes, orderTypesRes, schemesRes, makesRes, pricesRes] = await Promise.all([
                    mastersService.getReferenceOptions("user.model"),
                    mastersService.getReferenceOptions("company_branch.model"),
                    mastersService.getReferenceOptions("state.model"),
                    mastersService.getReferenceOptions("order_type.model"),
                    mastersService.getReferenceOptions("project_scheme.model"),
                    mastersService.getReferenceOptions("product_make.model"),
                    mastersService.getReferenceOptions("project_price.model"),
                ]);
                const normalize = (res) => res?.result || res?.data || res || [];
                console.log("product makes", Array.isArray(normalize(makesRes)) ? normalize(makesRes) : [])
                setOptions((vv) => ({
                    ...vv,
                    users: Array.isArray(normalize(usersRes)) ? normalize(usersRes) : [],
                    branches: Array.isArray(normalize(branchesRes)) ? normalize(branchesRes) : [],
                    states: Array.isArray(normalize(statesRes)) ? normalize(statesRes) : [],
                    orderTypes: Array.isArray(normalize(orderTypesRes)) ? normalize(orderTypesRes) : [],
                    projectSchemes: Array.isArray(normalize(schemesRes)) ? normalize(schemesRes) : [],
                    // productMakes: Array.isArray(normalize(makesRes)) ? normalize(makesRes) : [],
                    inquiries: [],
                    customers: [],
                }));
            } catch (err) {
                console.error("Failed to load reference options", err);
            } finally {
                setLoadingOptions(false);
            }
        };

        loadOptions();
    }, []);

    // Auto-populate default state for new quotations
    useEffect(() => {
        const loadDefaultState = async () => {
            // Only auto-populate if no defaultValues (new quotation) and state_id is not set
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Ensure value is never undefined - convert to empty string for controlled inputs
        const normalizedValue = type === "checkbox" ? checked : (value === undefined ? "" : value);
        
        // Real-time validation for phone numbers
        if (name === "mobile_number" && normalizedValue && normalizedValue.trim() !== "") {
            const phoneValidation = validatePhone(normalizedValue);
            if (!phoneValidation.isValid) {
                setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
            } else {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
            }
        } else if (name === "email" && normalizedValue && normalizedValue.trim() !== "") {
            // Real-time validation for email
            const emailValidation = validateEmail(normalizedValue);
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
        
        setFormData((prev) => ({
            ...prev,
            [name]: normalizedValue,
        }));
        
        if (serverError) {
            onClearServerError();
        }
    };

    const handleAutocompleteChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = {};
        if (!formData.quotation_date) validationErrors.quotation_date = "Quotation Date is required";
        if (!formData.valid_till) validationErrors.valid_till = "Valid Till is required";
        if (!formData.user_id) validationErrors.user_id = "Quotation By (User) is required";
        if (!formData.customer_name) validationErrors.customer_name = "Customer Name is required";
        if (!formData.mobile_number) {
            validationErrors.mobile_number = "Mobile Number is required";
        } else {
            // Validate mobile_number format
            const phoneValidation = validatePhone(formData.mobile_number);
            if (!phoneValidation.isValid) {
                validationErrors.mobile_number = phoneValidation.message;
            }
        }

        // Validate optional email
        if (formData.email && formData.email.trim() !== "") {
            const emailValidation = validateEmail(formData.email);
            if (!emailValidation.isValid) {
                validationErrors.email = emailValidation.message;
            }
        }

        if (!formData.state_id) validationErrors.state_id = "State is required";
        if (!formData.project_capacity) validationErrors.project_capacity = "Project Capacity is required";
        if (!formData.price_per_kw) validationErrors.price_per_kw = "Price Per KW is required";
        if (!formData.total_project_value) validationErrors.total_project_value = "Total Project Value is required";

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});

        const toNumber = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

        const payload = {
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

        onSubmit(payload);
    };

    const handleProjectPriceChange = async (projectPriceId) => {
        const response = await quotationService.getProjectPriceBomDetails({ id: projectPriceId });
        if (response.status) {
            let datas = response.result;
            // harsh
            let price_per_kw = Number(datas.price_per_kwa).toFixed(2);
            let total_project_value = datas.total_project_value;
            let project_capacity = 0;
            let netmeter_amount = datas.netmeter_amount ?? 0;
            let structure_amount = datas.structure_amount;
            let subsidy_amount = datas.subsidy_amount;
            let state_subsidy_amount = datas.state_subsidy;
            let bomDetails = datas?.billOfMaterial?.bom_detail || [];

            let structure_height = "";
            let structure_material = "";

            let panel_size = "";
            let panel_quantity = "";
            let panel_make_ids = [];
            let panel_type = "";
            let panel_warranty = "";
            let panel_performance_warranty = "";

            let inverter_size = "";
            let inverter_quantity = "";
            let inverter_make_ids = [];
            let inverter_warranty = "";

            let hybrid_inverter_size = "";
            let hybrid_inverter_quantity = "";
            let hybrid_inverter_make_ids = [];
            let hybrid_inverter_warranty = "";

            let battery_size = "";
            let battery_quantity = "";
            let battery_make_ids = [];
            let battery_type = "";
            let battery_warranty = "";

            let acdb_quantity = "";
            let acdb_description = "";
            let dcdb_quantity = "";
            let dcdb_description = "";

            let cable_ac_quantity = "";
            let cable_ac_make_ids = [];
            let cable_ac_description = "";
            let cable_dc_quantity = "";
            let cable_dc_make_ids = [];
            let cable_dc_description = "";

            let earthing_quantity = "";
            let earthing_make_ids = [];
            let earthing_description = "";
            let la_quantity = "";
            let la_make_ids = [];
            let la_description = "";

            let earthing_description_text = "";
            let lightening_arrester_description_text = "";
            let battery_description_text = "";

            let structure_product = "";
            let panel_product = "";
            let inverter_product = "";
            let battery_product = "";
            let hybrid_inverter_product = "";
            let acdb_product = "";
            let dcdb_product = "";
            let cable_ac_product = "";
            let cable_dc_product = "";
            let earthing_product = "";
            let la_product = "";

            for (let index = 0; index < bomDetails.length; index++) {
                const element = bomDetails[index];
                let properties = element?.product?.properties || null;
                let prodType = element?.product?.productType?.name?.toLowerCase() || "";
                const product = element?.product;

                if (properties?.structure) {
                    structure_material = properties.structure.material;
                    structure_height = element.quantity;
                    structure_product = product.id;

                } else if (properties?.panel) {
                    panel_product = product.id;
                    panel_size = product.capacity ?? 0;
                    panel_quantity = element.quantity;
                    panel_make_ids = [element.product.product_make_id];
                    panel_type = properties.panel.type;
                    panel_warranty = properties.panel.warranty;
                    panel_performance_warranty = properties.panel.performance_warranty;
                    project_capacity = (((product.capacity ?? 0) * (element?.quantity ?? 0)) / 1000).toFixed(2)

                } else if (properties?.inverter) {
                    inverter_product = product.id;
                    inverter_size = product.capacity ?? 0;
                    inverter_quantity = element.quantity;
                    inverter_make_ids = [element.product.product_make_id];
                    inverter_warranty = properties.inverter.warranty;
                } else if (properties?.hybrid_inverter) {
                    hybrid_inverter_product = product.id;
                    hybrid_inverter_size = product.capacity ?? 0;
                    hybrid_inverter_quantity = element.quantity;
                    hybrid_inverter_make_ids = [element.product.product_make_id];
                    hybrid_inverter_warranty = properties.hybrid_inverter.warranty;
                } else if (properties?.battery) {
                    battery_product = product.id;
                    battery_size = product.capacity ?? 0;
                    battery_quantity = element.quantity;
                    battery_make_ids = [element.product.product_make_id];
                    battery_type = properties.battery.type;
                    battery_warranty = properties.battery.warranty;
                    battery_description_text = element.description ?? "";
                    // } else if (properties?.cable) {
                    // cable_ac_quantity = properties?.cable.ac_quantity;
                    // cable_ac_make_ids = [element.product.product_make_id];
                    // cable_ac_description = properties?.cable.ac_description;
                    // cable_dc_quantity = properties?.cable.dc_quantity;
                    // cable_dc_make_ids = [element.product.product_make_id];
                    // cable_dc_description = properties?.cable.dc_description;
                    // }
                } else if (properties?.ac_cable) {
                    cable_ac_product = product.id;
                    cable_ac_quantity = element.quantity;
                    cable_ac_make_ids = [element.product.product_make_id];
                    cable_ac_description = element.description ?? "";
                } else if (properties?.dc_cable) {
                    cable_dc_product = product.id;
                    cable_dc_quantity = element.quantity;
                    cable_dc_make_ids = [element.product.product_make_id];
                    cable_dc_description = element.description ?? "";
                }

                if (prodType == "acdb") {
                    acdb_product = product.id;
                    acdb_quantity = element.quantity;
                    acdb_description = element.description ?? "";
                }

                if (prodType == "dcdb") {
                    dcdb_product = product.id;
                    dcdb_quantity = element.quantity;
                    dcdb_description = element.description ?? "";
                }

                if (prodType == 'la') {
                    la_product = product.id;
                    la_quantity = element.quantity;
                    la_make_ids = [element.product.product_make_id];
                    la_description = element.description ?? "";
                }

                if (prodType == 'earthing') {
                    earthing_product = product.id;
                    earthing_quantity = element.quantity;
                    earthing_make_ids = [element.product.product_make_id];
                    earthing_description = element.description ?? "";
                }


            }

            setFormData((prev) => ({
                ...prev,
                netmeter_amount,
                price_per_kw: price_per_kw,
                total_project_value: total_project_value,
                structure_amount: structure_amount,
                subsidy_amount: subsidy_amount,
                state_subsidy_amount: state_subsidy_amount,
                structure_height,
                structure_material,
                panel_size,
                panel_quantity,
                panel_make_ids,
                panel_type,
                panel_warranty,
                panel_performance_warranty,
                inverter_size,
                inverter_quantity,
                inverter_make_ids,
                inverter_warranty,
                hybrid_inverter_size,
                hybrid_inverter_quantity,
                hybrid_inverter_make_ids,
                hybrid_inverter_warranty,
                battery_size,
                battery_quantity,
                battery_make_ids,
                battery_type,
                battery_warranty,
                acdb_quantity,
                acdb_description,
                dcdb_quantity,
                dcdb_description,
                la_quantity,
                la_make_ids,
                la_description,
                earthing_quantity,
                earthing_make_ids,
                earthing_description,
                earthing_description_text,
                lightening_arrester_description_text,
                cable_dc_quantity,
                cable_ac_quantity,
                cable_ac_make_ids,
                cable_ac_description,
                cable_dc_make_ids,
                cable_dc_description,
                structure_product,
                panel_product,
                inverter_product,
                battery_product,
                hybrid_inverter_product,
                acdb_product,
                dcdb_product,
                cable_ac_product,
                cable_dc_product,
                earthing_product,
                la_product,
                project_capacity
            }));
        }
    };

    useEffect(() => {
        const getNextQuotationNumber = async () => {
            // If editing an existing quotation, don't generate a new number
            if (defaultValues?.id) {
                return;
            }

            try {
                // If we have an inquiry_id, generate quotation number based on inquiry
                if (defaultValues?.inquiry_id && defaultValues?.inquiry_number) {
                    const countResponse = await quotationService.getQuotationCountByInquiry(defaultValues.inquiry_id);
                    const count = countResponse?.result?.count || 0;
                    const quotationNumber = `${defaultValues.inquiry_number}/${count + 1}`;
                    setFormData((prev) => ({ ...prev, quotation_number: quotationNumber }));
                } else {
                    // Show '#' as placeholder - actual quotation number will be generated on backend
                    setFormData((prev) => ({ ...prev, quotation_number: "#" }));
                }
            } catch (error) {
                console.error("Error fetching next quotation number:", error);
                setFormData((prev) => ({ ...prev, quotation_number: "#" }));
            }
        };
        getNextQuotationNumber();
    }, [defaultValues?.inquiry_id, defaultValues?.inquiry_number, defaultValues?.id]);

    const calculateQuotationFormHeight = () => {
        return `calc(100vh - 220px)`;
    };

    return (
        <FormContainer>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 0.5, pr: 1 }}>
                {serverError && (
                    <Box mb={1}>
                        <Alert severity="error">{serverError}</Alert>
                    </Box>
                )}

                {/* Basic Details */}
                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Basic Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <DateField
                            fullWidth
                            label="Quotation Date"
                            name="quotation_date"
                            value={formData.quotation_date}
                            onChange={handleChange}
                            error={!!errors.quotation_date}
                            helperText={errors.quotation_date}
                            disabled
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            fullWidth
                            label="Quotation Number"
                            name="quotation_number"
                            value={formData.quotation_number}
                            onChange={handleChange}
                            error={!!errors.quotation_number}
                            helperText={errors.quotation_number}
                            disabled
                            sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="user_id"
                            label="Quotation By"
                            value={formData.user_id || ""}
                            onChange={handleChange}
                            required
                            error={!!errors.user_id}
                            helperText={errors.user_id}
                            disabled
                            sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.200" } }}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="branch_id"
                            label="Branch"
                            value={formData.branch_id ?? ""}
                            onChange={handleChange}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.branches.map((b) => (
                                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <DateField
                            name="valid_till"
                            label="Valid Till"
                            value={formData.valid_till}
                            onChange={handleChange}
                            error={!!errors.valid_till}
                            helperText={errors.valid_till}
                        />
                    </Grid>
                </Grid>

                {/* Customer Details */}
                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Customer Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            fullWidth
                            label="Customer Name"
                            name="customer_name"
                            value={formData.customer_name}
                            onChange={handleChange}
                            required
                            error={!!errors.customer_name}
                            helperText={errors.customer_name}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            fullWidth
                            label="Mobile Number"
                            name="mobile_number"
                            value={formData.mobile_number}
                            onChange={handleChange}
                            required
                            error={!!errors.mobile_number}
                            helperText={errors.mobile_number}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={!!errors.email}
                            helperText={errors.email}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Input
                            fullWidth
                            label="Company Name"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="state_id"
                            label="State"
                            value={formData.state_id || ""}
                            onChange={handleChange}
                            required
                            error={!!errors.state_id}
                            helperText={errors.state_id}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.states.map((s) => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Input
                            fullWidth
                            label="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            multiline
                            rows={1}
                        />
                    </Grid>
                </Grid>

                {/* Project Details */}
                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Project Details</Typography>
                </Box>
                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="order_type_id"
                            label="Order Type"
                            value={formData.order_type_id || ""}
                            onChange={handleChange}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.orderTypes.map((o) => (
                                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="project_scheme_id"
                            label="Project Scheme"
                            value={formData.project_scheme_id || ""}
                            onChange={(e) => handleChange(e)}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.projectSchemes.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item size={{ xs: 12, md: 3 }}>
                        <Select
                            name="project_price_id"
                            label="Select Project"
                            value={formData.project_price_id || ""}
                            onChange={(e) => {
                                handleChange(e);
                                handleProjectPriceChange(e.target.value);
                            }}
                            disabled={!formData.project_scheme_id || loadingOptions}
                            sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {options.projectPrices.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.project_capacity}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>
                </Grid>

                {/* Technical Details */}
                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                    <Typography variant="subtitle1" fontWeight={600}>Technical Details</Typography>
                </Box>

            {/* Structure */}
            <Accordion
                expanded={expandedAccordions.structure}
                onChange={handleAccordionChange('structure')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Structure</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="structure_product"
                                label="Product"
                                value={formData.structure_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    let material = findProduct?.properties?.structure?.material ?? "";
                                    setFormData({
                                        ...formData,
                                        structure_material: material,
                                        structure_product: e.target.value
                                    })
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'structure').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Height"
                                name="structure_height"
                                value={formData.structure_height}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Material"
                                name="structure_material"
                                value={formData.structure_material}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Panel */}
            <Accordion
                expanded={expandedAccordions.panel}
                onChange={handleAccordionChange('panel')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Panel</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="panel_product"
                                label="Product"
                                value={formData.panel_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        panel_product: e.target.value,
                                        panel_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                        panel_size: findProduct?.capacity ?? "",
                                        panel_type: findProduct?.properties?.panel?.type ?? "",
                                        panel_warranty: findProduct?.properties?.panel?.warranty ?? "",
                                        panel_performance_warranty: findProduct?.properties?.panel?.performance_warranty ?? "",
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'panel').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Size"
                                name="panel_size"
                                value={formData.panel_size}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                type="number"
                                label="Quantity"
                                name="panel_quantity"
                                value={formData.panel_quantity}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === formData.panel_product)
                                    setFormData({
                                        ...formData,
                                        panel_quantity: e.target.value,
                                        project_capacity: (((findProduct?.capacity ?? 0) * (e.target.value ?? 0)) / 1000).toFixed(2)
                                    });
                                }}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={options.productMakes.filter((m) => m.productTypeName === "panel")}
                                getOptionLabel={(option) => option.name || ""}
                                value={options.productMakes.filter((m) => formData.panel_make_ids.includes(m.id))}
                                onChange={(e, newValue) => handleAutocompleteChange("panel_make_ids", newValue.map((v) => v.id))}
                                renderInput={(params) => <Input {...params} label="Panel Make" />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } = getTagProps({ index });
                                        return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                    })
                                }
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Type"
                                name="panel_type"
                                value={formData.panel_type}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Warranty"
                                name="panel_warranty"
                                value={formData.panel_warranty}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Performance Warranty"
                                name="panel_performance_warranty"
                                value={formData.panel_performance_warranty}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Inverter */}
            <Accordion
                expanded={expandedAccordions.inverter}
                onChange={handleAccordionChange('inverter')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Inverter</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="inverter_product"
                                label="Product"
                                value={formData.inverter_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        inverter_product: e.target.value,
                                        inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                        inverter_size: findProduct?.capacity ?? "",
                                        inverter_warranty: findProduct?.properties?.inverter?.warranty ?? "",
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'inverter').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Size"
                                name="inverter_size"
                                value={formData.inverter_size}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                type="number"
                                label="Quantity"
                                name="inverter_quantity"
                                value={formData.inverter_quantity}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={options.productMakes.filter((m) => m.productTypeName === "inverter")}
                                getOptionLabel={(option) => option.name || ""}
                                value={options.productMakes.filter((m) => formData.inverter_make_ids.includes(m.id))}
                                onChange={(e, newValue) => handleAutocompleteChange("inverter_make_ids", newValue.map((v) => v.id))}
                                renderInput={(params) => <Input {...params} label="Inverter Make" />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } = getTagProps({ index });
                                        return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                    })
                                }
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Warranty"
                                name="inverter_warranty"
                                value={formData.inverter_warranty}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Battery */}
            <Accordion
                expanded={expandedAccordions.battery}
                onChange={handleAccordionChange('battery')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Battery</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="battery_product"
                                label="Product"
                                value={formData.battery_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        battery_product: e.target.value,
                                        battery_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                        battery_size: findProduct?.capacity ?? "",
                                        battery_type: findProduct?.properties?.battery?.type ?? "",
                                        battery_warranty: findProduct?.properties?.battery?.warranty ?? "",
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'battery').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Size"
                                name="battery_size"
                                value={formData.battery_size}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                type="number"
                                label="Quantity"
                                name="battery_quantity"
                                value={formData.battery_quantity}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={options.productMakes.filter((m) => m.productTypeName === "battery")}
                                getOptionLabel={(option) => option.name || ""}
                                value={options.productMakes.filter((m) => formData.battery_make_ids.includes(m.id))}
                                onChange={(e, newValue) => handleAutocompleteChange("battery_make_ids", newValue.map((v) => v.id))}
                                renderInput={(params) => <Input {...params} label="Battery Make" />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } = getTagProps({ index });
                                        return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                    })
                                }
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Type"
                                name="battery_type"
                                value={formData.battery_type}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                fullWidth
                                label="Warranty"
                                name="battery_warranty"
                                value={formData.battery_warranty}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Battery Description Text" name="battery_description_text" value={formData.battery_description_text} onChange={handleChange} multiline rows={2} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Hybrid Inverter */}
            <Accordion
                expanded={expandedAccordions.hybridInverter}
                onChange={handleAccordionChange('hybridInverter')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Hybrid Inverter</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="hybrid_inverter_product"
                                label="Product"
                                value={formData.hybrid_inverter_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        hybrid_inverter_product: e.target.value,
                                        hybrid_inverter_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                        hybrid_inverter_size: findProduct?.capacity ?? "",
                                        hybrid_inverter_warranty: findProduct?.properties?.hybrid_inverter?.warranty ?? "",
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'hybrid inverter').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Size" name="hybrid_inverter_size" value={formData.hybrid_inverter_size} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth type="number" label="Quantity" name="hybrid_inverter_quantity" value={formData.hybrid_inverter_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Autocomplete multiple size="small" options={options.productMakes.filter((m) => m.productTypeName === "hybrid_inverter")} getOptionLabel={(option) => option.name || ""} value={options.productMakes.filter((m) => formData.hybrid_inverter_make_ids.includes(m.id))} onChange={(e, newValue) => handleAutocompleteChange("hybrid_inverter_make_ids", newValue.map((v) => v.id))} renderInput={(params) => <Input {...params} label="Hybrid Inverter Make" />} renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                })
                            } />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Warranty" name="hybrid_inverter_warranty" value={formData.hybrid_inverter_warranty} onChange={handleChange} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* ACDB */}
            <Accordion
                expanded={expandedAccordions.acdb}
                onChange={handleAccordionChange('acdb')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>ACDB</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="acdb_product"
                                label="Product"
                                value={formData.acdb_product || ""}
                                onChange={handleChange}
                                disabled={formData.project_price_id}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'acdb').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Quantity" name="acdb_quantity" value={formData.acdb_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Description" name="acdb_description" value={formData.acdb_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* DCDB */}
            <Accordion
                expanded={expandedAccordions.dcdb}
                onChange={handleAccordionChange('dcdb')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>DCDB</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                fullWidth
                                name="dcdb_product"
                                label="Product"
                                value={formData.dcdb_product || ""}
                                onChange={handleChange}
                                disabled={formData.project_price_id}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'dcdb').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Quantity" name="dcdb_quantity" value={formData.dcdb_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input fullWidth label="Description" name="dcdb_description" value={formData.dcdb_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Cable */}
            <Accordion
                expanded={expandedAccordions.cable}
                onChange={handleAccordionChange('cable')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Cable</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                fullWidth
                                name="cable_ac_product"
                                label="Ac Cable"
                                value={formData.cable_ac_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        cable_ac_product: e.target.value,
                                        cable_ac_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'ac cable').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="AC Quantity" name="cable_ac_quantity" value={formData.cable_ac_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Autocomplete multiple size="small" options={options.productMakes.filter((m) => m.productTypeName === "ac cable")} getOptionLabel={(option) => option.name || ""} value={options.productMakes.filter((m) => formData.cable_ac_make_ids.includes(m.id))} onChange={(e, newValue) => handleAutocompleteChange("cable_ac_make_ids", newValue.map((v) => v.id))} renderInput={(params) => <Input {...params} label="AC Make" />} renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                })
                            } />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="AC Description" name="cable_ac_description" value={formData.cable_ac_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                fullWidth
                                name="cable_dc_product"
                                label="Product"
                                value={formData.cable_dc_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        cable_dc_product: e.target.value,
                                        cable_dc_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'dc cable').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="DC Quantity" name="cable_dc_quantity" value={formData.cable_dc_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Autocomplete multiple size="small" options={options.productMakes.filter((m) => m.productTypeName === "dc cable")} getOptionLabel={(option) => option.name || ""} value={options.productMakes.filter((m) => formData.cable_dc_make_ids.includes(m.id))} onChange={(e, newValue) => handleAutocompleteChange("cable_dc_make_ids", newValue.map((v) => v.id))} renderInput={(params) => <Input {...params} label="DC Make" />} renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                })
                            } />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="DC Description" name="cable_dc_description" value={formData.cable_dc_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Earthing */}
            <Accordion
                expanded={expandedAccordions.earthing}
                onChange={handleAccordionChange('earthing')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Earthing</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                fullWidth
                                name="earthing_product"
                                label="Product"
                                value={formData.earthing_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        earthing_product: e.target.value,
                                        earthing_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'earthing').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="Quantity" name="earthing_quantity" value={formData.earthing_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Autocomplete multiple size="small" options={options.productMakes.filter((m) => m.productTypeName === "earthing")} getOptionLabel={(option) => option.name || ""} value={options.productMakes.filter((m) => formData.earthing_make_ids.includes(m.id))} onChange={(e, newValue) => handleAutocompleteChange("earthing_make_ids", newValue.map((v) => v.id))} renderInput={(params) => <Input {...params} label="Earthing Make" />} renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                })
                            } />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="Description" name="earthing_description" value={formData.earthing_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* LA (Lightning Arrester) */}
            <Accordion
                expanded={expandedAccordions.la}
                onChange={handleAccordionChange('la')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>LA (Lightning Arrester)</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Select
                                fullWidth
                                name="la_product"
                                label="Product"
                                value={formData.la_product || ""}
                                disabled={formData.project_price_id}
                                onChange={(e) => {
                                    let findProduct = options.products.find(p => p.id === e.target.value)
                                    setFormData({
                                        ...formData,
                                        la_product: e.target.value,
                                        la_make_ids: findProduct?.product_make_id ? [findProduct.product_make_id] : [],
                                    });
                                }}
                                sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.products.filter(p => (p.productType.name.toLowerCase()) === 'la').map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="Quantity" name="la_quantity" value={formData.la_quantity} onChange={handleChange} />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Autocomplete multiple size="small" options={options.productMakes.filter((m) => m.productTypeName === "la")} getOptionLabel={(option) => option.name || ""} value={options.productMakes.filter((m) => formData.la_make_ids.includes(m.id))} onChange={(e, newValue) => handleAutocompleteChange("la_make_ids", newValue.map((v) => v.id))} renderInput={(params) => <Input {...params} label="LA Make" />} renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return <Chip key={option.id} label={option.name} size="small" {...tagProps} />;
                                })
                            } />
                        </Grid>
                        <Grid item size={{ xs: 12, md: 3 }}>
                            <Input fullWidth label="Description" name="la_description" value={formData.la_description} onChange={handleChange} multiline rows={1} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* MIS and Battery Description */}
            <Accordion
                expanded={expandedAccordions.additionalDescriptions}
                onChange={handleAccordionChange('additionalDescriptions')}
                sx={accordionStyles}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
                    <Typography variant="subtitle2" fontWeight={600}>Additional Descriptions</Typography>
                </AccordionSummary>
                <AccordionDetails sx={accordionDetailsStyles}>
                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 6 }}>
                            <Input fullWidth label="MIS Description" name="mis_description" value={formData.mis_description} onChange={handleChange} multiline rows={2} />
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Project Price Details */}
            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                <Typography variant="subtitle1" fontWeight={600}>Project Price Details</Typography>
            </Box>
            <Grid container spacing={COMPACT_FORM_SPACING}>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Project Capacity"
                        name="project_capacity"
                        value={formData.project_capacity}
                        onChange={handleChange}
                        required
                        disabled
                        error={!!errors.project_capacity}
                        helperText={errors.project_capacity}
                        sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Price Per KW"
                        name="price_per_kw"
                        value={formData.price_per_kw}
                        onChange={handleChange}
                        disabled={formData.project_price_id}
                        required
                        error={!!errors.price_per_kw}
                        helperText={errors.price_per_kw}
                        sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Total Project Value"
                        name="total_project_value"
                        value={formData.total_project_value}
                        onChange={handleChange}
                        disabled={formData.project_price_id}
                        required
                        error={!!errors.total_project_value}
                        helperText={errors.total_project_value}
                        sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Structure Amount"
                        name="structure_amount"
                        value={formData.structure_amount}
                        onChange={handleChange}
                        disabled={formData.project_price_id}
                        sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Subsidy Amount"
                        name="subsidy_amount"
                        value={formData.subsidy_amount}
                        onChange={handleChange}
                        disabled={formData.project_price_id}
                        sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="State Subsidy Amount"
                        name="state_subsidy_amount"
                        value={formData.state_subsidy_amount}
                        onChange={handleChange}
                        disabled={formData.project_price_id}
                        sx={formData.project_price_id ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } } : undefined}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Netmeter Amount"
                        name="netmeter_amount"
                        value={formData.netmeter_amount}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Stamp Charges"
                        name="stamp_charges"
                        value={formData.stamp_charges}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="State Government Amount"
                        name="state_government_amount"
                        value={formData.state_government_amount}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Select
                        fullWidth
                        name="discount_type"
                        label="Discount Type"
                        value={formData.discount_type || ""}
                        onChange={handleChange}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        <MenuItem value="Before Tax">Before Tax</MenuItem>
                        <MenuItem value="After Tax">After Tax</MenuItem>
                    </Select>
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Discount"
                        name="discount"
                        value={formData.discount}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="GST Rate (%)"
                        name="gst_rate"
                        value={formData.gst_rate}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Additional Cost Details 1"
                        name="additional_cost_details_1"
                        value={formData.additional_cost_details_1}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Amount 1"
                        name="additional_cost_amount_1"
                        value={formData.additional_cost_amount_1}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Additional Cost Details 2"
                        name="additional_cost_details_2"
                        value={formData.additional_cost_details_2}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Amount 2"
                        name="additional_cost_amount_2"
                        value={formData.additional_cost_amount_2}
                        onChange={handleChange}
                    />
                </Grid>
            </Grid>

            {/* Terms and Conditions */}
            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                <Typography variant="subtitle1" fontWeight={600}>Terms and Conditions</Typography>
            </Box>
            <Grid container spacing={COMPACT_FORM_SPACING}>
                <Grid item size={{ xs: 12, md: 4 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="System Warranty (Years)"
                        name="system_warranty_years"
                        value={formData.system_warranty_years}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 4 }}>
                    <Input
                        fullWidth
                        label="Payment Terms"
                        name="payment_terms"
                        value={formData.payment_terms}
                        onChange={handleChange}
                        multiline
                        rows={2}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 4 }}>
                    <Input
                        fullWidth
                        label="Remarks"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        multiline
                        rows={2}
                    />
                </Grid>
            </Grid>

            {/* Graph Generation Details */}
            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                <Typography variant="subtitle1" fontWeight={600}>Graph Generation Details</Typography>
            </Box>
            <Grid container spacing={COMPACT_FORM_SPACING}>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Price Per Unit (₹/kWh)"
                        name="graph_price_per_unit"
                        value={formData.graph_price_per_unit}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Per Day Generation (kWh)"
                        name="graph_per_day_generation"
                        value={formData.graph_per_day_generation}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Yearly Increment in Price (%)"
                        name="graph_yearly_increment_price"
                        value={formData.graph_yearly_increment_price}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        type="number"
                        label="Yearly Decrement in Generation (%)"
                        name="graph_yearly_decrement_generation"
                        value={formData.graph_yearly_decrement_generation}
                        onChange={handleChange}
                    />
                </Grid>
            </Grid>

            {/* Final Payable Details - compact grid, full width */}
            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                <Typography variant="subtitle1" fontWeight={600}>Final Payable Details</Typography>
            </Box>
            <Grid container spacing={COMPACT_FORM_SPACING}>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Project Cost"
                        value={formData.total_project_value || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Netmeter (+)"
                        value={formData.netmeter_amount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Stamp Charges (+)"
                        value={formData.stamp_charges || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="State Government Amt (+)"
                        value={formData.state_government_amount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Structure (+)"
                        value={formData.structure_amount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Additional Amt 1 (+)"
                        value={formData.additional_cost_amount_1 || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Additional Amt 2 (+)"
                        value={formData.additional_cost_amount_2 || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Discount (-)"
                        value={formData.discount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="GST (+)"
                        value={(() => {
                            const subtotal = Number(formData.total_project_value || 0) +
                                Number(formData.netmeter_amount || 0) +
                                Number(formData.stamp_charges || 0) +
                                Number(formData.state_government_amount || 0) +
                                Number(formData.structure_amount || 0) +
                                Number(formData.additional_cost_amount_1 || 0) +
                                Number(formData.additional_cost_amount_2 || 0) -
                                Number(formData.discount || 0);
                            const gstAmount = (subtotal * Number(formData.gst_rate || 0)) / 100;
                            return gstAmount.toFixed(2);
                        })()}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Total Payable (=)"
                        value={(() => {
                            const subtotal = Number(formData.total_project_value || 0) +
                                Number(formData.netmeter_amount || 0) +
                                Number(formData.stamp_charges || 0) +
                                Number(formData.state_government_amount || 0) +
                                Number(formData.structure_amount || 0) +
                                Number(formData.additional_cost_amount_1 || 0) +
                                Number(formData.additional_cost_amount_2 || 0) -
                                Number(formData.discount || 0);
                            const gstAmount = (subtotal * Number(formData.gst_rate || 0)) / 100;
                            return (subtotal + gstAmount).toFixed(2);
                        })()}
                        InputProps={{ readOnly: true }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Subsidy Amount (-)"
                        value={formData.subsidy_amount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="State Subsidy (-)"
                        value={formData.state_subsidy_amount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: "action.hover" }}
                    />
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                    <Input
                        fullWidth
                        label="Effective Cost (=)"
                        value={(() => {
                            const subtotal = Number(formData.total_project_value || 0) +
                                Number(formData.netmeter_amount || 0) +
                                Number(formData.stamp_charges || 0) +
                                Number(formData.state_government_amount || 0) +
                                Number(formData.structure_amount || 0) +
                                Number(formData.additional_cost_amount_1 || 0) +
                                Number(formData.additional_cost_amount_2 || 0) -
                                Number(formData.discount || 0);
                            const gstAmount = (subtotal * Number(formData.gst_rate || 0)) / 100;
                            const totalPayable = subtotal + gstAmount;
                            const effectiveCost = totalPayable - Number(formData.subsidy_amount || 0) - Number(formData.state_subsidy_amount || 0);
                            return effectiveCost.toFixed(2);
                        })()}
                        InputProps={{ readOnly: true }}
                    />
                </Grid>
            </Grid>

            <FormActions>
                {onCancel && (
                    <Button variant="outlined" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="contained" disabled={loading || loadingOptions}>
                    {loading ? "Saving..." : "Submit"}
                </Button>
            </FormActions>
        </Box>
        </FormContainer>
    );
}
