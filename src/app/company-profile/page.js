"use client";

import { useState, useEffect, useRef } from "react";
import Input from "@/components/common/Input";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import Loader from "@/components/common/Loader";
import Checkbox from "@/components/common/Checkbox";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SmsIcon from "@mui/icons-material/Sms";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Select, { MenuItem } from "@/components/common/Select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { DIALOG_FORM_SMALL, DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
// import AppLayout from "@/components/layout/AppLayout";
import companyService from "@/services/companyService";
import userMasterService from "@/services/userMasterService";
import quotationTemplateService from "@/services/quotationTemplateService";
import { getDefaultState, getDefaultBranch } from "@/services/mastersService";
import { validatePhone, validateEmail, validateGSTIN, formatPhone, formatToUpperCase } from "@/utils/validators";
import { toastSuccess, toastError } from "@/utils/toast";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

export default function CompanyProfilePage() {
    const [company, setCompany] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [branchesLoaded, setBranchesLoaded] = useState(false);
    const [warehousesLoaded, setWarehousesLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [errors, setErrors] = useState({}); // Field-level validation errors
    const [editMode, setEditMode] = useState(false);
    const [companyEditDialogOpen, setCompanyEditDialogOpen] = useState(false);
    const [bankDialogOpen, setBankDialogOpen] = useState(false);
    const [editingBankAccount, setEditingBankAccount] = useState(null);
    const [branchDialogOpen, setBranchDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchErrors, setBranchErrors] = useState({}); // Branch field-level validation errors
    const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [warehouseErrors, setWarehouseErrors] = useState({}); // Warehouse field-level validation errors
    const [managersDialogOpen, setManagersDialogOpen] = useState(false);
    const [managersDialogWarehouse, setManagersDialogWarehouse] = useState(null);
    const [warehouseManagersLoading, setWarehouseManagersLoading] = useState(false);
    const [branchManagersDialogOpen, setBranchManagersDialogOpen] = useState(false);
    const [branchManagersDialogBranch, setBranchManagersDialogBranch] = useState(null);
    const [branchManagersLoading, setBranchManagersLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [managersSelectedIds, setManagersSelectedIds] = useState([]);
    const [branchManagersSelectedIds, setBranchManagersSelectedIds] = useState([]);
    const [activeTab, setActiveTab] = useState("0");
    const [quotationTemplateOptions, setQuotationTemplateOptions] = useState([]);
    const [imageUrls, setImageUrls] = useState({
        logo: null,
        header: null,
        footer: null,
        stamp: null,
        authorized_signature: null,
        stamp_with_signature: null,
    });
    const fileInputRefs = useRef({
        logo: null,
        header: null,
        footer: null,
        stamp: null,
        authorized_signature: null,
        stamp_with_signature: null,
    });
    const [formData, setFormData] = useState({
        company_name: "",
        company_code: "",
        owner_name: "",
        owner_email: "",
        owner_number: "",
        address: "",
        city: "",
        state: "",
        company_email: "",
        contact_number: "",
        company_website: "",
    });
    const [bankFormData, setBankFormData] = useState({
        branch_id: null,
        bank_name: "",
        bank_account_name: "",
        bank_account_number: "",
        bank_account_ifsc: "",
        bank_account_branch: "",
        upi_id: "",
        is_active: true,
        is_default_b2c: false,
        is_default_b2b: false,
    });
    const [branchFormData, setBranchFormData] = useState({
        name: "",
        address: "",
        email: "",
        contact_no: "",
        gst_number: "",
        is_active: true,
        is_default: false,
        quotation_template_id: null,
    });
    const [warehouseFormData, setWarehouseFormData] = useState({
        name: "",
        contact_person: "",
        mobile: "",
        state_id: null,
        email: "",
        phone_no: "",
        address: "",
        branch_id: null,
        is_active: true,
    });

    useEffect(() => {
        loadCompanyProfile();
        loadBankAccounts();
    }, []);

    useEffect(() => {
        if (branchDialogOpen && quotationTemplateOptions.length === 0) {
            quotationTemplateService
                .listTemplates()
                .then((res) => {
                    const data = res?.result ?? res?.data ?? res;
                    setQuotationTemplateOptions(Array.isArray(data) ? data : []);
                })
                .catch(() => setQuotationTemplateOptions([]));
        }
    }, [branchDialogOpen]);

    useEffect(() => {
        if (bankDialogOpen && !branchesLoaded) loadBranches();
    }, [bankDialogOpen]);

    const loadCompanyProfile = async () => {
        try {
            setLoading(true);
            const response = await companyService.getCompanyProfile();
            const companyData = response.result || response.data || response;
            setCompany(companyData);
            setFormData({
                company_name: companyData.company_name || "",
                company_code: companyData.company_code || "",
                owner_name: companyData.owner_name || "",
                owner_email: companyData.owner_email || "",
                owner_number: companyData.owner_number || "",
                address: companyData.address || "",
                city: companyData.city || "",
                state: companyData.state || "",
                company_email: companyData.company_email || "",
                contact_number: companyData.contact_number || "",
                company_website: companyData.company_website || "",
            });
            setError("");
            // Fetch signed URLs for bucket-stored images (skip legacy paths starting with /)
            setImageUrls({
                logo: null,
                header: null,
                footer: null,
                stamp: null,
                authorized_signature: null,
                stamp_with_signature: null,
            });
            const types = ["logo", "header", "footer", "stamp", "authorized_signature", "stamp_with_signature"];
            for (const type of types) {
                const path = companyData[type];
                if (path && typeof path === "string" && !path.startsWith("/")) {
                    try {
                        const url = await companyService.getImageUrl(type);
                        if (url) setImageUrls((prev) => ({ ...prev, [type]: url }));
                    } catch (e) {
                        console.error(`Failed to get ${type} URL`, e);
                    }
                }
            }
        } catch (err) {
            console.error("Error loading company profile:", err);
            const msg = err?.response?.data?.message || "Failed to load company profile";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    const loadBankAccounts = async () => {
        try {
            const response = await companyService.listBankAccounts();
            const accounts = response.result || response.data || response;
            setBankAccounts(Array.isArray(accounts) ? accounts : []);
        } catch (err) {
            console.error("Error loading bank accounts:", err);
            toastError(err?.response?.data?.message || "Failed to load bank accounts");
        }
    };

    const loadBranches = async (force = false) => {
        if (branchesLoaded && !force) return; // Don't reload if already loaded (unless forced)
        try {
            const response = await companyService.listBranches();
            const branchesData = response.result || response.data || response;
            setBranches(Array.isArray(branchesData) ? branchesData : []);
            setBranchesLoaded(true);
        } catch (err) {
            console.error("Error loading branches:", err);
            toastError(err?.response?.data?.message || "Failed to load branches");
        }
    };

    const loadWarehouses = async (force = false) => {
        if (warehousesLoaded && !force) return; // Don't reload if already loaded (unless forced)
        try {
            const response = await companyService.listWarehouses();
            const warehousesData = response.result || response.data || response;
            setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
            setWarehousesLoaded(true);
        } catch (err) {
            console.error("Error loading warehouses:", err);
            toastError(err?.response?.data?.message || "Failed to load warehouses");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Real-time validation
        if ((name === "owner_number" || name === "contact_number") && value && value.trim() !== "") {
            const phoneValidation = validatePhone(value);
            if (!phoneValidation.isValid) {
                setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
            } else {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else if ((name === "owner_email" || name === "company_email") && value && value.trim() !== "") {
            const emailValidation = validateEmail(value);
            if (!emailValidation.isValid) {
                setErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
            } else {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError("");
    };

    const handleBankInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setBankFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSave = async (onSuccess) => {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            // Validation: Check required fields
            const requiredFields = {
                company_name: "Company Name",
                company_code: "Company Code",
                owner_name: "Owner Name",
                owner_email: "Owner Email",
                owner_number: "Owner Phone",
                address: "Address",
                city: "City",
                state: "State",
                company_email: "Company Email",
                contact_number: "Contact Number",
            };

            const validationErrors = {};
            Object.keys(requiredFields).forEach((field) => {
                if (!formData[field] || formData[field].trim() === "") {
                    validationErrors[field] = "This field is required";
                }
            });

            // Validate phone numbers
            if (formData.owner_number && formData.owner_number.trim() !== "") {
                const phoneValidation = validatePhone(formData.owner_number);
                if (!phoneValidation.isValid) {
                    validationErrors.owner_number = phoneValidation.message;
                }
            }

            if (formData.contact_number && formData.contact_number.trim() !== "") {
                const phoneValidation = validatePhone(formData.contact_number);
                if (!phoneValidation.isValid) {
                    validationErrors.contact_number = phoneValidation.message;
                }
            }

            // Validate emails
            if (formData.owner_email && formData.owner_email.trim() !== "") {
                const emailValidation = validateEmail(formData.owner_email);
                if (!emailValidation.isValid) {
                    validationErrors.owner_email = emailValidation.message;
                }
            }

            if (formData.company_email && formData.company_email.trim() !== "") {
                const emailValidation = validateEmail(formData.company_email);
                if (!emailValidation.isValid) {
                    validationErrors.company_email = emailValidation.message;
                }
            }

            // If there are validation errors, set them and return
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setSaving(false);
                return;
            }

            // Clear errors if validation passes
            setErrors({});

            const res = await companyService.updateCompanyProfile(formData);
            const msg = res?.data?.message || res?.result?.message || "Company profile updated successfully";
            setSuccess(msg);
            toastSuccess(msg);
            setEditMode(false);
            if (typeof onSuccess === "function") onSuccess();
            await loadCompanyProfile();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error updating company profile:", err);
            const msg = err.response?.data?.message || "Failed to update company profile";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleBankSave = async () => {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            if (
                (bankFormData.is_default_b2c === true || bankFormData.is_default_b2b === true) &&
                bankFormData.is_active === false
            ) {
                setError("You must activate the account before setting it as default for B2C or B2B");
                setSaving(false);
                return;
            }

            let msg;
            if (editingBankAccount) {
                const res = await companyService.updateBankAccount(editingBankAccount.id, bankFormData);
                msg = res?.data?.message || res?.result?.message || "Bank account updated successfully";
                setSuccess(msg);
            } else {
                const res = await companyService.createBankAccount(bankFormData);
                msg = res?.data?.message || res?.result?.message || "Bank account created successfully";
                setSuccess(msg);
            }
            toastSuccess(msg);
            setBankDialogOpen(false);
            setEditingBankAccount(null);
            setBankFormData({
                branch_id: null,
                bank_name: "",
                bank_account_name: "",
                bank_account_number: "",
                bank_account_ifsc: "",
                bank_account_branch: "",
                upi_id: "",
                is_active: true,
                is_default_b2c: false,
                is_default_b2b: false,
            });
            await loadBankAccounts();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error saving bank account:", err);
            const msg = err.response?.data?.message || "Failed to save bank account";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEditBankAccount = (account) => {
        setEditingBankAccount(account);
        setBankFormData({
            branch_id: account.branch_id ?? account.branch?.id ?? null,
            bank_name: account.bank_name || "",
            bank_account_name: account.bank_account_name || "",
            bank_account_number: account.bank_account_number || "",
            bank_account_ifsc: account.bank_account_ifsc || "",
            bank_account_branch: account.bank_account_branch || "",
            upi_id: account.upi_id || "",
            is_active: account.is_active !== undefined ? account.is_active : true,
            is_default_b2c: Boolean(account.is_default_b2c ?? account.is_default),
            is_default_b2b: Boolean(account.is_default_b2b),
        });
        setBankDialogOpen(true);
    };

    const handleDeleteBankAccount = async (id) => {
        // Find the account to check if it's default
        const account = bankAccounts.find((acc) => acc.id === id);

        if (
            account &&
            (account.is_default === true || account.is_default_b2c === true || account.is_default_b2b === true)
        ) {
            setError(
                "Cannot deactivate a default bank account. Clear B2C/B2B default on another account first."
            );
            return;
        }

        if (!confirm("Are you sure you want to deactivate this bank account?")) return;
        try {
            const res = await companyService.deleteBankAccount(id);
            const msg = res?.data?.message || res?.result?.message || "Bank account deactivated successfully";
            setSuccess(msg);
            toastSuccess(msg);
            await loadBankAccounts();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error deactivating bank account:", err);
            const msg = err.response?.data?.message || "Failed to deactivate bank account";
            setError(msg);
            toastError(msg);
        }
    };

    const handleNewBankAccount = () => {
        setEditingBankAccount(null);
        setBankFormData({
            branch_id: null,
            bank_name: "",
            bank_account_name: "",
            bank_account_number: "",
            bank_account_ifsc: "",
            bank_account_branch: "",
            upi_id: "",
            is_active: true,
            is_default_b2c: false,
            is_default_b2b: false,
        });
        setBankDialogOpen(true);
    };

    const handleCloseBankDialog = () => {
        setBankDialogOpen(false);
        setEditingBankAccount(null);
        setBankFormData({
            branch_id: null,
            bank_name: "",
            bank_account_name: "",
            bank_account_number: "",
            bank_account_ifsc: "",
            bank_account_branch: "",
            upi_id: "",
            is_active: true,
            is_default_b2c: false,
            is_default_b2b: false,
        });
    };

    // Branch Handlers
    const handleBranchInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let processedValue = type === "checkbox" ? checked : value;

        // Auto-uppercase for GST number
        if (name === "gst_number") {
            processedValue = formatToUpperCase(value);
        }

        setBranchFormData((prev) => ({
            ...prev,
            [name]: processedValue,
        }));

        // Real-time validation
        if (name === "contact_no" && processedValue && processedValue.trim() !== "") {
            const phoneValidation = validatePhone(processedValue);
            if (!phoneValidation.isValid) {
                setBranchErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
            } else {
                setBranchErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else if (name === "email" && processedValue && processedValue.trim() !== "") {
            const emailValidation = validateEmail(processedValue);
            if (!emailValidation.isValid) {
                setBranchErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
            } else {
                setBranchErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else if (name === "gst_number" && processedValue && processedValue.trim() !== "") {
            const gstValidation = validateGSTIN(processedValue);
            if (!gstValidation.isValid) {
                setBranchErrors((prev) => ({ ...prev, [name]: gstValidation.message }));
            } else {
                setBranchErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else {
            // Clear error for this field when user starts typing
            if (branchErrors[name]) {
                setBranchErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        }
    };

    const handleBranchSave = async () => {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            // Validation: Check required fields
            const requiredFields = {
                name: "Name",
                address: "Address",
                email: "Email",
                contact_no: "Contact Number",
                gst_number: "GST Number",
            };

            const validationErrors = {};
            Object.keys(requiredFields).forEach((field) => {
                if (!branchFormData[field] || branchFormData[field].trim() === "") {
                    validationErrors[field] = "This field is required";
                }
            });

            // Validate contact_no (phone)
            if (branchFormData.contact_no && branchFormData.contact_no.trim() !== "") {
                const phoneValidation = validatePhone(branchFormData.contact_no);
                if (!phoneValidation.isValid) {
                    validationErrors.contact_no = phoneValidation.message;
                }
            }

            // Validate email
            if (branchFormData.email && branchFormData.email.trim() !== "") {
                const emailValidation = validateEmail(branchFormData.email);
                if (!emailValidation.isValid) {
                    validationErrors.email = emailValidation.message;
                }
            }

            // Validate gst_number
            if (branchFormData.gst_number && branchFormData.gst_number.trim() !== "") {
                const gstValidation = validateGSTIN(branchFormData.gst_number);
                if (!gstValidation.isValid) {
                    validationErrors.gst_number = gstValidation.message;
                }
            }

            // If there are validation errors, set them and return
            if (Object.keys(validationErrors).length > 0) {
                setBranchErrors(validationErrors);
                setSaving(false);
                return;
            }

            // Clear errors if validation passes
            setBranchErrors({});

            let msg;
            if (editingBranch) {
                const res = await companyService.updateBranch(editingBranch.id, branchFormData);
                msg = res?.data?.message || res?.result?.message || "Branch updated successfully";
                setSuccess(msg);
            } else {
                const res = await companyService.createBranch(branchFormData);
                msg = res?.data?.message || res?.result?.message || "Branch created successfully";
                setSuccess(msg);
            }
            toastSuccess(msg);
            setBranchDialogOpen(false);
            setEditingBranch(null);
            setBranchFormData({
                name: "",
                address: "",
                email: "",
                contact_no: "",
                gst_number: "",
                is_active: true,
                is_default: false,
                quotation_template_id: null,
            });
            await loadBranches(true); // Force reload after save
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error saving branch:", err);
            const msg = err.response?.data?.message || "Failed to save branch";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEditBranch = (branch) => {
        setEditingBranch(branch);
        setBranchFormData({
            name: branch.name || "",
            address: branch.address || "",
            email: branch.email || "",
            contact_no: branch.contact_no || "",
            gst_number: branch.gst_number || "",
            is_active: branch.is_active !== undefined ? branch.is_active : true,
            is_default: branch.is_default !== undefined ? branch.is_default : false,
            quotation_template_id: branch.quotation_template_id ?? branch.quotation_template?.id ?? null,
        });
        setBranchErrors({});
        setBranchDialogOpen(true);
    };

    const handleDeleteBranch = async (id) => {
        const branch = branches.find((b) => b.id === id);
        if (branch?.is_default) {
            const msg = "Cannot delete the default branch. Please set another branch as default first.";
            setError(msg);
            toastError(msg);
            setTimeout(() => setError(""), 5000);
            return;
        }
        if (!confirm("Are you sure you want to deactivate this branch?")) return;
        try {
            const res = await companyService.deleteBranch(id);
            const msg = res?.data?.message || res?.result?.message || "Branch deactivated successfully";
            setSuccess(msg);
            toastSuccess(msg);
            await loadBranches(true); // Force reload after deactivate
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error deactivating branch:", err);
            const msg = err.response?.data?.message || "Failed to deactivate branch";
            setError(msg);
            toastError(msg);
        }
    };

    const handleNewBranch = () => {
        setEditingBranch(null);
        setBranchFormData({
            name: "",
            address: "",
            email: "",
            contact_no: "",
            gst_number: "",
            is_active: true,
            is_default: false,
            quotation_template_id: null,
        });
        setBranchErrors({});
        setBranchDialogOpen(true);
    };

    const handleCloseBranchDialog = () => {
        setBranchDialogOpen(false);
        setEditingBranch(null);
        setBranchFormData({
            name: "",
            address: "",
            email: "",
            contact_no: "",
            gst_number: "",
            is_active: true,
            is_default: false,
            quotation_template_id: null,
        });
        setBranchErrors({});
    };

    // Warehouse Handlers
    const handleWarehouseInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let processedValue = value;
        if (type === "checkbox") processedValue = checked;

        setWarehouseFormData((prev) => ({
            ...prev,
            [name]: processedValue,
        }));

        // Real-time validation
        if ((name === "mobile" || name === "phone_no") && processedValue && processedValue.trim() !== "") {
            const phoneValidation = validatePhone(processedValue);
            if (!phoneValidation.isValid) {
                setWarehouseErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
            } else {
                setWarehouseErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else if (name === "email" && processedValue && processedValue.trim() !== "") {
            const emailValidation = validateEmail(processedValue);
            if (!emailValidation.isValid) {
                setWarehouseErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
            } else {
                setWarehouseErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        } else {
            // Clear error for this field when user starts typing
            if (warehouseErrors[name]) {
                setWarehouseErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
        }
    };

    const handleWarehouseSave = async () => {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            // Validation: Check required fields
            const validationErrors = {};

            if (!warehouseFormData.name || warehouseFormData.name.trim() === "") {
                validationErrors.name = "This field is required";
            }
            if (!warehouseFormData.mobile || warehouseFormData.mobile.trim() === "") {
                validationErrors.mobile = "This field is required";
            } else {
                // Validate mobile format
                const phoneValidation = validatePhone(warehouseFormData.mobile);
                if (!phoneValidation.isValid) {
                    validationErrors.mobile = phoneValidation.message;
                }
            }

            // Validate optional phone_no
            if (warehouseFormData.phone_no && warehouseFormData.phone_no.trim() !== "") {
                const phoneValidation = validatePhone(warehouseFormData.phone_no);
                if (!phoneValidation.isValid) {
                    validationErrors.phone_no = phoneValidation.message;
                }
            }

            // Validate optional email
            if (warehouseFormData.email && warehouseFormData.email.trim() !== "") {
                const emailValidation = validateEmail(warehouseFormData.email);
                if (!emailValidation.isValid) {
                    validationErrors.email = emailValidation.message;
                }
            }

            if (!warehouseFormData.state_id || warehouseFormData.state_id === null || warehouseFormData.state_id === "") {
                validationErrors.state_id = "This field is required";
            }
            if (!warehouseFormData.address || warehouseFormData.address.trim() === "") {
                validationErrors.address = "This field is required";
            }
            if (!warehouseFormData.branch_id || warehouseFormData.branch_id === null || warehouseFormData.branch_id === "") {
                validationErrors.branch_id = "This field is required";
            }

            // If there are validation errors, set them and return
            if (Object.keys(validationErrors).length > 0) {
                setWarehouseErrors(validationErrors);
                setSaving(false);
                return;
            }

            // Clear errors if validation passes
            setWarehouseErrors({});

            let msg;
            if (editingWarehouse) {
                const res = await companyService.updateWarehouse(editingWarehouse.id, warehouseFormData);
                msg = res?.data?.message || res?.result?.message || "Warehouse updated successfully";
                setSuccess(msg);
            } else {
                const res = await companyService.createWarehouse(warehouseFormData);
                msg = res?.data?.message || res?.result?.message || "Warehouse created successfully";
                setSuccess(msg);
            }
            toastSuccess(msg);
            setWarehouseDialogOpen(false);
            setEditingWarehouse(null);
            setWarehouseFormData({
                name: "",
                contact_person: "",
                mobile: "",
                state_id: null,
                email: "",
                phone_no: "",
                address: "",
                branch_id: null,
                is_active: true,
            });
            await loadWarehouses(true); // Force reload after save
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error saving warehouse:", err);
            const msg = err.response?.data?.message || "Failed to save warehouse";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEditWarehouse = (warehouse) => {
        setEditingWarehouse(warehouse);
        setWarehouseFormData({
            name: warehouse.name || "",
            contact_person: warehouse.contact_person || "",
            mobile: warehouse.mobile || "",
            state_id: warehouse.state_id || null,
            email: warehouse.email || "",
            phone_no: warehouse.phone_no || "",
            address: warehouse.address || "",
            branch_id: warehouse.branch_id ?? warehouse.branch?.id ?? null,
            is_active: warehouse.is_active !== undefined ? warehouse.is_active : true,
        });
        setWarehouseErrors({});
        setWarehouseDialogOpen(true);
    };

    const handleDeleteWarehouse = async (id) => {
        if (!confirm("Are you sure you want to deactivate this warehouse?")) return;
        try {
            const res = await companyService.deleteWarehouse(id);
            const msg = res?.data?.message || res?.result?.message || "Warehouse deactivated successfully";
            setSuccess(msg);
            toastSuccess(msg);
            await loadWarehouses(true); // Force reload after deactivate
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error deactivating warehouse:", err);
            const msg = err.response?.data?.message || "Failed to deactivate warehouse";
            setError(msg);
            toastError(msg);
        }
    };

    const handleOpenManagersDialog = async (warehouse) => {
        setManagersDialogWarehouse(warehouse);
        setManagersDialogOpen(true);
        setManagersSelectedIds([]);
        setWarehouseManagersLoading(true);
        setError("");
        try {
            const [managersRes, usersRes] = await Promise.all([
                companyService.getWarehouseManagers(warehouse.id),
                userMasterService.listUserMasters({ limit: 1000 }),
            ]);
            const managers = managersRes?.result ?? managersRes?.data ?? managersRes;
            const managersList = Array.isArray(managers) ? managers : [];
            setManagersSelectedIds(managersList.map((m) => Number(m.id)));
            const usersPayload = usersRes?.result ?? usersRes?.data ?? usersRes;
            const usersList = Array.isArray(usersPayload) ? usersPayload : usersPayload?.data ?? [];
            setAllUsers(Array.isArray(usersList) ? usersList : []);
        } catch (err) {
            console.error("Error loading warehouse managers:", err);
            const msg = err.response?.data?.message || "Failed to load managers";
            setError(msg);
            toastError(msg);
        } finally {
            setWarehouseManagersLoading(false);
        }
    };

    const handleCloseManagersDialog = () => {
        setManagersDialogOpen(false);
        setManagersDialogWarehouse(null);
        setManagersSelectedIds([]);
        setAllUsers([]);
    };

    const handleManagerToggle = (userId, checked) => {
        const id = Number(userId);
        setManagersSelectedIds((prev) =>
            checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
        );
    };

    const handleSaveWarehouseManagers = async () => {
        if (!managersDialogWarehouse) return;
        try {
            setSaving(true);
            setError("");
            const res = await companyService.setWarehouseManagers(managersDialogWarehouse.id, managersSelectedIds);
            const msg = res?.data?.message || res?.result?.message || "Warehouse managers updated";
            setSuccess(msg);
            toastSuccess(msg);
            setTimeout(() => setSuccess(""), 3000);
            await loadWarehouses(true);
            handleCloseManagersDialog();
        } catch (err) {
            console.error("Error saving warehouse managers:", err);
            const msg = err.response?.data?.message || "Failed to save warehouse managers";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenBranchManagersDialog = async (branch) => {
        setBranchManagersDialogBranch(branch);
        setBranchManagersDialogOpen(true);
        setBranchManagersSelectedIds([]);
        setBranchManagersLoading(true);
        setError("");
        try {
            const [managersRes, usersRes] = await Promise.all([
                companyService.getBranchManagers(branch.id),
                userMasterService.listUserMasters({ limit: 1000 }),
            ]);
            const managers = managersRes?.result ?? managersRes?.data ?? managersRes;
            const managersList = Array.isArray(managers) ? managers : [];
            setBranchManagersSelectedIds(managersList.map((m) => Number(m.id)));
            const usersPayload = usersRes?.result ?? usersRes?.data ?? usersRes;
            const usersList = Array.isArray(usersPayload) ? usersPayload : usersPayload?.data ?? [];
            setAllUsers(Array.isArray(usersList) ? usersList : []);
        } catch (err) {
            console.error("Error loading branch managers:", err);
            const msg = err.response?.data?.message || "Failed to load branch managers";
            setError(msg);
            toastError(msg);
        } finally {
            setBranchManagersLoading(false);
        }
    };

    const handleCloseBranchManagersDialog = () => {
        setBranchManagersDialogOpen(false);
        setBranchManagersDialogBranch(null);
        setBranchManagersSelectedIds([]);
        setAllUsers([]);
    };

    const handleBranchManagerToggle = (userId, checked) => {
        const id = Number(userId);
        setBranchManagersSelectedIds((prev) =>
            checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
        );
    };

    const handleSaveBranchManagers = async () => {
        if (!branchManagersDialogBranch) return;
        try {
            setSaving(true);
            setError("");
            const res = await companyService.setBranchManagers(
                branchManagersDialogBranch.id,
                branchManagersSelectedIds
            );
            const msg = res?.data?.message || res?.result?.message || "Branch managers updated";
            setSuccess(msg);
            toastSuccess(msg);
            setTimeout(() => setSuccess(""), 3000);
            await loadBranches(true);
            handleCloseBranchManagersDialog();
        } catch (err) {
            console.error("Error saving branch managers:", err);
            const msg = err.response?.data?.message || "Failed to save branch managers";
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleNewWarehouse = async () => {
        setEditingWarehouse(null);
        const initialFormData = {
            name: "",
            contact_person: "",
            mobile: "",
            state_id: null,
            email: "",
            phone_no: "",
            address: "",
            branch_id: null,
            is_active: true,
        };

        // Try to load default state
        try {
            const defaultStateRes = await getDefaultState();
            const defaultState = defaultStateRes?.result || defaultStateRes?.data || defaultStateRes;
            if (defaultState?.id) {
                initialFormData.state_id = defaultState.id;
            }
        } catch (err) {
            console.error("Failed to load default state:", err);
            // Continue without default state
        }

        // Try to load default branch (same behavior as quotation branch field)
        try {
            const defaultBranchRes = await getDefaultBranch();
            const defaultBranch = defaultBranchRes?.result || defaultBranchRes?.data || defaultBranchRes;
            if (defaultBranch?.id) {
                initialFormData.branch_id = defaultBranch.id;
            }
        } catch (err) {
            console.error("Failed to load default branch:", err);
            // Continue without default branch
        }

        setWarehouseFormData(initialFormData);
        setWarehouseErrors({});
        setWarehouseDialogOpen(true);
    };

    const handleCloseWarehouseDialog = () => {
        setWarehouseDialogOpen(false);
        setEditingWarehouse(null);
        setWarehouseFormData({
            name: "",
            contact_person: "",
            mobile: "",
            state_id: null,
            email: "",
            phone_no: "",
            address: "",
            branch_id: null,
            is_active: true,
        });
        setWarehouseErrors({});
    };

    // Image Handlers: use signed URLs fetched when profile loads (imageUrls state)
    const getImageUrl = (imageType) => imageUrls[imageType] ?? null;

    const handleImageUpload = async (imageType, file) => {
        if (!file) {
            const msg = "Please select an image file";
            setError(msg);
            toastError(msg);
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await companyService.uploadCompanyImage(imageType, file);
            const msg = response?.data?.message || response?.result?.message || `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} uploaded successfully`;
            setSuccess(msg);
            toastSuccess(msg);

            // Reload company profile to get updated images
            await loadCompanyProfile();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error(`Error uploading ${imageType}:`, err);
            const msg = err.response?.data?.message || `Failed to upload ${imageType}`;
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleImageDelete = async (imageType) => {
        if (!confirm(`Are you sure you want to delete the ${imageType}?`)) return;

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const res = await companyService.deleteCompanyImage(imageType);
            const msg = res?.data?.message || res?.result?.message || `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} deleted successfully`;
            setSuccess(msg);
            toastSuccess(msg);

            // Reload company profile to get updated images
            await loadCompanyProfile();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error(`Error deleting ${imageType}:`, err);
            const msg = err.response?.data?.message || `Failed to delete ${imageType}`;
            setError(msg);
            toastError(msg);
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <ProtectedRoute>
                {/* <AppLayout> */}
                <div className="flex justify-center items-center min-h-[400px]">
                    <Loader />
                </div>
                {/* </AppLayout> */}
            </ProtectedRoute>
        );
    }

    // Calculate remaining days for plan
    const planValidTill = company?.plan_valid_till
        ? new Date(company.plan_valid_till)
        : null;
    const daysLeft = planValidTill
        ? Math.ceil((planValidTill - new Date()) / (1000 * 60 * 60 * 24))
        : 0;
    const formattedDate = planValidTill
        ? planValidTill.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : "N/A";

    const calculateMaxHeight = () => {
        const headerHeight = 10;
        const searchHeight = 10;
        const listHeight = 160;
        // Optimized: Navbar(56px) + Toolbar(40px) + Page header(~54px) = ~150px (no footer)
        return `calc(100vh - 150px)`;
    };

    return (
        <ProtectedRoute>
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* Page Title */}
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Company Profile
                </h2>

                {/* Success/Error Messages */}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{success}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccess("")}>
                            <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
                        </span>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError("")}>
                            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
                        </span>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Company Information */}
                    <div className="w-full lg:w-1/4 flex flex-col gap-6 overflow-y-auto" style={{ maxHeight: calculateMaxHeight() }}>
                        {/* Company Information Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5">
                                {/* Company Logo - Small */}
                                {company?.logo && (
                                    <div
                                        className="flex justify-center items-center mb-4 p-2 bg-white border-b border-gray-100"
                                    >
                                        <img
                                            src={getImageUrl("logo")}
                                            alt="Company Logo"
                                            style={{
                                                maxWidth: "100px",
                                                maxHeight: "60px",
                                                objectFit: "contain",
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Company Name - Highlighted */}
                                {company?.company_name && (
                                    <h2 className="text-center mb-4 pb-3 font-semibold text-primary text-lg border-b border-gray-200">
                                        {company.company_name}
                                    </h2>
                                )}
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-semibold text-gray-900">Company Information</h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Edit company information"
                                        onClick={() => {
                                            setErrors({});
                                            setCompanyEditDialogOpen(true);
                                        }}
                                    >
                                        <EditIcon sx={{ fontSize: 18 }} />
                                    </Button>
                                </div>
                                <dl className="space-y-4 text-sm">
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Name</dt>
                                        <dd className="mt-0.5 font-medium">{formData.company_name || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Code</dt>
                                        <dd className="mt-0.5 font-medium">{formData.company_code || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner Name</dt>
                                        <dd className="mt-0.5 font-medium">{formData.owner_name || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner Email</dt>
                                        <dd className="mt-0.5 font-medium">{formData.owner_email || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner Phone</dt>
                                        <dd className="mt-0.5 font-medium">{formData.owner_number || "—"}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Registered Office Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-semibold text-gray-900">Registered Office</h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Edit registered office"
                                        onClick={() => {
                                            setErrors({});
                                            setCompanyEditDialogOpen(true);
                                        }}
                                    >
                                        <EditIcon sx={{ fontSize: 18 }} />
                                    </Button>
                                </div>
                                <dl className="space-y-4 text-sm">
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</dt>
                                        <dd className="mt-0.5 font-medium whitespace-pre-wrap">{formData.address || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">City</dt>
                                        <dd className="mt-0.5 font-medium">{formData.city || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">State</dt>
                                        <dd className="mt-0.5 font-medium">{formData.state || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Number</dt>
                                        <dd className="mt-0.5 font-medium">{formData.contact_number || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Email</dt>
                                        <dd className="mt-0.5 font-medium">{formData.company_email || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Website</dt>
                                        <dd className="mt-0.5 font-medium">{formData.company_website || "—"}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Data */}
                    <div className="w-full lg:w-3/4 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* User Limit KPI */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm text-emerald-900">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <PersonIcon className="mr-2 text-emerald-600" />
                                        <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">User Limit</h3>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold mb-1">
                                    {company?.user_limit_used || 0} / {company?.user_limit_total || 0}
                                </div>
                                <div className="text-sm text-emerald-700 font-medium">
                                    {((company?.user_limit_total || 0) - (company?.user_limit_used || 0))} of{" "}
                                    {company?.user_limit_total || 0} Remaining
                                </div>
                            </div>

                            {/* Plan Valid Till KPI */}
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 shadow-sm text-orange-900">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <CalendarTodayIcon className="mr-2 text-orange-600" />
                                        <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider">Plan Valid Till</h3>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold mb-1">{formattedDate}</div>
                                <div className="text-sm text-orange-700 font-medium">
                                    {daysLeft > 0 ? `${daysLeft} Days Left` : "Expired"}
                                </div>
                            </div>
                            {/* SMS Credit KPI */}
                            <div
                                className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => {
                                    console.log("SMS Credit clicked", {
                                        used: company?.sms_credit_used || 0,
                                        total: company?.sms_credit_total || 0,
                                        percentage: company?.sms_credit_total
                                            ? Math.round(((company?.sms_credit_used || 0) / company.sms_credit_total) * 100)
                                            : 0,
                                    });
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <SmsIcon className="mr-2 text-blue-600" />
                                        <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">SMS Credit</h3>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold mb-1">
                                    {company?.sms_credit_used || 0} / {company?.sms_credit_total || 0}
                                </div>
                                <div className="text-sm text-blue-700 font-medium">
                                    {company?.sms_credit_total
                                        ? Math.round(((company?.sms_credit_used || 0) / company.sms_credit_total) * 100)
                                        : 0}
                                    % Used
                                </div>
                            </div>
                        </div>

                        {/* Tabs Container */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <Tabs
                                value={activeTab}
                                onValueChange={(v) => {
                                    setActiveTab(v);
                                    if (v === "0" && !branchesLoaded) loadBranches();
                                    else if (v === "1" && !branchesLoaded) loadBranches();
                                    else if (v === "3" && !warehousesLoaded) loadWarehouses();
                                }}
                                className="w-full"
                            >
                                <div className="border-b border-gray-200 px-4">
                                    <TabsList className="h-12 bg-transparent">
                                        <TabsTrigger value="0" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Bank Details</TabsTrigger>
                                        <TabsTrigger value="1" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Branch Details</TabsTrigger>
                                        <TabsTrigger value="2" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Images</TabsTrigger>
                                        <TabsTrigger value="3" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Warehouse</TabsTrigger>
                                    </TabsList>
                                </div>
                                <div className="p-5">
                                    <TabsContent value="0" className="m-0 focus-visible:outline-none">
                                        <div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewBankAccount}>
                                                + New Bank Details
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Bank Name</th>
                                                        <th className="px-4 py-3">Account Name</th>
                                                        <th className="px-4 py-3">Account No</th>
                                                        <th className="px-4 py-3">IFSC</th>
                                                        <th className="px-4 py-3">Company Branch</th>
                                                        <th className="px-4 py-3">Bank branch</th>
                                                        <th className="px-4 py-3">UPI ID</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3">Defaults</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {bankAccounts.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                                                No bank accounts found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        bankAccounts.map((account) => (
                                                            <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{account.bank_name}</td>
                                                                <td className="px-4 py-3">{account.bank_account_name}</td>
                                                                <td className="px-4 py-3">{account.bank_account_number}</td>
                                                                <td className="px-4 py-3">{account.bank_account_ifsc || "-"}</td>
                                                                <td className="px-4 py-3">{account.branch?.name ?? "—"}</td>
                                                                <td className="px-4 py-3">{account.bank_account_branch || "-"}</td>
                                                                <td className="px-4 py-3">{account.upi_id || "-"}</td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={account.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {account.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(account.is_default_b2c || account.is_default) && (
                                                                            <Badge variant="primary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-normal border-0 text-[10px] px-1.5 py-0 shadow-none">
                                                                                B2C
                                                                            </Badge>
                                                                        )}
                                                                        {account.is_default_b2b && (
                                                                            <Badge variant="primary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 font-normal border-0 text-[10px] px-1.5 py-0 shadow-none">
                                                                                B2B
                                                                            </Badge>
                                                                        )}
                                                                        {!account.is_default_b2c && !account.is_default_b2b && !account.is_default && "-"}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditBankAccount(account)}>Edit</Button>
                                                                        <Button
                                                                            size="xs"
                                                                            variant="destructive-outline"
                                                                            onClick={() => handleDeleteBankAccount(account.id)}
                                                                            disabled={
                                                                                account.is_default === true ||
                                                                                account.is_default_b2c === true ||
                                                                                account.is_default_b2b === true
                                                                            }
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="1" className="m-0 focus-visible:outline-none">
                                        <div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewBranch}>
                                                + New Branch
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Address</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3">Contact No</th>
                                                        <th className="px-4 py-3">GST Number</th>
                                                        <th className="px-4 py-3">Managers</th>
                                                        <th className="px-4 py-3">Quotation Template</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3">Default</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {branches.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                                                No branches found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        branches.map((branch) => (
                                                            <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{branch.name}</td>
                                                                <td className="px-4 py-3 max-w-xs truncate">{branch.address}</td>
                                                                <td className="px-4 py-3">{branch.email}</td>
                                                                <td className="px-4 py-3">{branch.contact_no}</td>
                                                                <td className="px-4 py-3">{branch.gst_number}</td>
                                                                <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate" title={(branch.manager_names || []).join(", ")}>
                                                                    {branch.manager_count > 0
                                                                        ? (branch.manager_names || []).join(", ")
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500">
                                                                    {branch.quotation_template?.name ?? branch.quotation_template_id ?? "—"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={branch.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {branch.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {branch.is_default && (
                                                                        <Badge variant="primary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-normal border-0 text-xs shadow-none">
                                                                            Default
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleOpenBranchManagersDialog(branch)}>Managers</Button>
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditBranch(branch)}>Edit</Button>
                                                                        <Button size="xs" variant="destructive-outline" onClick={() => handleDeleteBranch(branch.id)}>Delete</Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="2" className="m-0 focus-visible:outline-none">
                                        <div className="flex flex-col gap-8">
                                            {/* Company Logo */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Company Logo
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.logo ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("logo")}
                                                                    alt="Company Logo"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "150px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("logo")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            No logo uploaded
                                                        </p>
                                                    )}
                                                    {!company?.logo && (
                                                        <>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.logo = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("logo", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.logo?.click()}
                                                            >
                                                                Upload Logo
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Header */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Header
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.header ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("header")}
                                                                    alt="Header"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "200px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("header")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-gray-500">
                                                                No header uploaded
                                                            </p>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.header = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("header", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.header?.click()}
                                                            >
                                                                Upload Header
                                                            </Button>
                                                            <p className="text-xs text-red-500 mt-2">
                                                                Recommended: Image size 1900(w) x 300(h) px
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Footer
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.footer ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("footer")}
                                                                    alt="Footer"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "200px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("footer")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-gray-500">
                                                                No footer uploaded
                                                            </p>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.footer = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("footer", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.footer?.click()}
                                                            >
                                                                Upload Footer
                                                            </Button>
                                                            <p className="text-xs text-red-500 mt-2">
                                                                Recommended: Image size 1900(w) x 300(h) px
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stamp */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Stamp
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.stamp ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("stamp")}
                                                                    alt="Stamp"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "200px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("stamp")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            No stamp uploaded
                                                        </p>
                                                    )}
                                                    {!company?.stamp && (
                                                        <>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.stamp = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("stamp", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.stamp?.click()}
                                                            >
                                                                Upload Stamp
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Authorized Signature */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Authorized Signature
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.authorized_signature ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("authorized_signature")}
                                                                    alt="Authorized Signature"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "200px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("authorized_signature")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            No authorized signature uploaded
                                                        </p>
                                                    )}
                                                    {!company?.authorized_signature && (
                                                        <>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.authorized_signature = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("authorized_signature", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.authorized_signature?.click()}
                                                            >
                                                                Upload Authorized Signature
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stamp with Signature */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                                    Stamp with Signature
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    {company?.stamp_with_signature ? (
                                                        <>
                                                            <div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">
                                                                <img
                                                                    src={getImageUrl("stamp_with_signature")}
                                                                    alt="Stamp with Signature"
                                                                    style={{
                                                                        maxWidth: "100%",
                                                                        maxHeight: "200px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleImageDelete("stamp_with_signature")}
                                                                disabled={saving}
                                                            >
                                                                <DeleteIcon />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            No stamp with signature uploaded
                                                        </p>
                                                    )}
                                                    {!company?.stamp_with_signature && (
                                                        <>
                                                            <input
                                                                ref={(el) => { fileInputRefs.current.stamp_with_signature = el; }}
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload("stamp_with_signature", file);
                                                                        e.target.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                startIcon={<CloudUploadIcon />}
                                                                disabled={saving}
                                                                onClick={() => fileInputRefs.current.stamp_with_signature?.click()}
                                                            >
                                                                Upload Stamp with Signature
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="3" className="m-0 focus-visible:outline-none">
                                        <div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewWarehouse}>
                                                + New Warehouse
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Contact Person</th>
                                                        <th className="px-4 py-3">Mobile</th>
                                                        <th className="px-4 py-3">State</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3">Phone No</th>
                                                        <th className="px-4 py-3">Address</th>
                                                        <th className="px-4 py-3">Managers</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {warehouses.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                                                No warehouses found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        warehouses.map((warehouse) => (
                                                            <tr key={warehouse.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{warehouse.name}</td>
                                                                <td className="px-4 py-3">{warehouse.contact_person || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.mobile}</td>
                                                                <td className="px-4 py-3">{warehouse.state_name || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.email || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.phone_no || "-"}</td>
                                                                <td className="px-4 py-3 max-w-xs truncate">{warehouse.address}</td>
                                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                                    {warehouse.managers?.length
                                                                        ? `${warehouse.managers.length} manager${warehouse.managers.length !== 1 ? "s" : ""}`
                                                                        : "-"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={warehouse.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {warehouse.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleOpenManagersDialog(warehouse)}>Managers</Button>
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditWarehouse(warehouse)}>Edit</Button>
                                                                        <Button size="xs" variant="destructive-outline" onClick={() => handleDeleteWarehouse(warehouse.id)}>Delete</Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Branch Managers Dialog (theme) */}
                <Dialog
                    open={branchManagersDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCloseBranchManagersDialog();
                    }}
                >
                    <DialogContent className={DIALOG_FORM_SMALL} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>
                                Branch managers – {branchManagersDialogBranch?.name ?? ""}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="pt-2">
                            {branchManagersLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Managers</label>
                                    <div className="max-h-56 overflow-y-auto rounded-md border border-input p-2 space-y-1.5">
                                        {allUsers.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-2">No users available</p>
                                        ) : (
                                            allUsers.map((user) => (
                                                <Checkbox
                                                    key={user.id}
                                                    name={`branch-manager-${user.id}`}
                                                    label={
                                                        <>
                                                            {user.name}
                                                            {user.email ? (
                                                                <span className="text-muted-foreground font-normal">
                                                                    {" "}
                                                                    ({user.email})
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    }
                                                    checked={branchManagersSelectedIds.includes(Number(user.id))}
                                                    onChange={(e) =>
                                                        handleBranchManagerToggle(user.id, !!e.target.checked)
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Multiple users can be linked as managers for this branch.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" size="sm" onClick={handleCloseBranchManagersDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                loading={saving}
                                disabled={branchManagersLoading}
                                onClick={handleSaveBranchManagers}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Warehouse Managers Dialog (theme) */}
                <Dialog
                    open={managersDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCloseManagersDialog();
                    }}
                >
                    <DialogContent className={DIALOG_FORM_SMALL} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>
                                Warehouse managers – {managersDialogWarehouse?.name ?? ""}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="pt-2">
                            {warehouseManagersLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Managers</label>
                                    <div className="max-h-56 overflow-y-auto rounded-md border border-input p-2 space-y-1.5">
                                        {allUsers.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-2">No users available</p>
                                        ) : (
                                            allUsers.map((user) => (
                                                <Checkbox
                                                    key={user.id}
                                                    name={`manager-${user.id}`}
                                                    label={
                                                        <>
                                                            {user.name}
                                                            {user.email ? (
                                                                <span className="text-muted-foreground font-normal">
                                                                    {" "}
                                                                    ({user.email})
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    }
                                                    checked={managersSelectedIds.includes(Number(user.id))}
                                                    onChange={(e) =>
                                                        handleManagerToggle(user.id, !!e.target.checked)
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Multiple users can be linked as managers for this warehouse.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" size="sm" onClick={handleCloseManagersDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                loading={saving}
                                disabled={warehouseManagersLoading}
                                onClick={handleSaveWarehouseManagers}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Company Details Dialog */}
                <Dialog
                    open={companyEditDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCompanyEditDialogOpen(false);
                            setErrors({});
                            loadCompanyProfile();
                        }
                    }}
                >
                    <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>Edit company details</DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSave(() => setCompanyEditDialogOpen(false));
                            }}
                            onKeyDown={preventEnterSubmit}
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto pt-2 space-y-4">
                                <FormSection title="Company Information">
                                    <FormGrid>
                                        <Input
                                            name="company_name"
                                            label="Company Name"
                                            value={formData.company_name}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.company_name}
                                            helperText={errors.company_name || ""}
                                        />
                                        <Input
                                            name="company_code"
                                            label="Company Code"
                                            value={formData.company_code}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.company_code}
                                            helperText={errors.company_code || ""}
                                        />
                                        <Input
                                            name="owner_name"
                                            label="Owner Name"
                                            value={formData.owner_name}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.owner_name}
                                            helperText={errors.owner_name || ""}
                                        />
                                        <Input
                                            name="owner_email"
                                            label="Owner Email"
                                            type="email"
                                            value={formData.owner_email}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.owner_email}
                                            helperText={errors.owner_email || ""}
                                        />
                                        <Input
                                            name="owner_number"
                                            label="Owner Phone"
                                            value={formData.owner_number}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.owner_number}
                                            helperText={errors.owner_number || ""}
                                        />
                                    </FormGrid>
                                </FormSection>
                                <FormSection title="Registered Office">
                                    <FormGrid>
                                        <Input
                                            name="address"
                                            label="Address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            multiline
                                            rows={2}
                                            fullWidth
                                            required
                                            error={!!errors.address}
                                            helperText={errors.address || ""}
                                        />
                                        <Input
                                            name="city"
                                            label="City"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.city}
                                            helperText={errors.city || ""}
                                        />
                                        <Input
                                            name="state"
                                            label="State"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.state}
                                            helperText={errors.state || ""}
                                        />
                                        <Input
                                            name="contact_number"
                                            label="Contact Number"
                                            value={formData.contact_number}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.contact_number}
                                            helperText={errors.contact_number || ""}
                                        />
                                        <Input
                                            name="company_email"
                                            label="Company Email"
                                            type="email"
                                            value={formData.company_email}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!errors.company_email}
                                            helperText={errors.company_email || ""}
                                        />
                                        <Input
                                            name="company_website"
                                            label="Company Website"
                                            value={formData.company_website}
                                            onChange={handleInputChange}
                                            fullWidth
                                        />
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCompanyEditDialogOpen(false);
                                        setErrors({});
                                        loadCompanyProfile();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" loading={saving}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Bank Account Dialog (theme) */}
                <Dialog
                    open={bankDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCloseBankDialog();
                    }}
                >
                    <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingBankAccount ? "Edit Bank Account" : "New Bank Account"}
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleBankSave();
                            }}
                            onKeyDown={preventEnterSubmit}
                        >
                            <div className="flex-1 min-h-0 overflow-visible pt-2">
                                <FormSection title="">
                                    <FormGrid>
                                        <Input
                                            name="bank_name"
                                            label="Bank Name"
                                            value={bankFormData.bank_name}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                            required
                                        />
                                        <Input
                                            name="bank_account_name"
                                            label="Account Name"
                                            value={bankFormData.bank_account_name}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                            required
                                        />
                                        <Input
                                            name="bank_account_number"
                                            label="Account Number"
                                            value={bankFormData.bank_account_number}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                            required
                                        />
                                        <Select
                                            name="branch_id"
                                            label="Company Branch"
                                            value={bankFormData.branch_id ?? ""}
                                            onChange={(e) =>
                                                setBankFormData((prev) => ({
                                                    ...prev,
                                                    branch_id: e.target.value ? Number(e.target.value) : null,
                                                }))
                                            }
                                            placeholder="Select branch"
                                            className="min-w-[200px]"
                                        >
                                            <MenuItem value="">None</MenuItem>
                                            {branches.map((b) => (
                                                <MenuItem key={b.id} value={b.id}>
                                                    {b.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <Input
                                            name="bank_account_ifsc"
                                            label="IFSC Code"
                                            value={bankFormData.bank_account_ifsc}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                        />
                                        <Input
                                            name="bank_account_branch"
                                            label="Bank branch (name)"
                                            value={bankFormData.bank_account_branch}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                        />
                                        <Input
                                            name="upi_id"
                                            label="UPI ID (for payment QR)"
                                            placeholder="e.g. name@paytm"
                                            value={bankFormData.upi_id}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                        />
                                        <Checkbox
                                            name="is_active"
                                            label="Active"
                                            checked={bankFormData.is_active}
                                            onChange={(e) =>
                                                setBankFormData((prev) => ({
                                                    ...prev,
                                                    is_active: !!e.target.checked,
                                                    is_default_b2c: e.target.checked ? prev.is_default_b2c : false,
                                                    is_default_b2b: e.target.checked ? prev.is_default_b2b : false,
                                                }))
                                            }
                                        />
                                        <Checkbox
                                            name="is_default_b2c"
                                            label="Default for B2C (quotations, receipts)"
                                            checked={bankFormData.is_default_b2c}
                                            onChange={(e) =>
                                                setBankFormData((prev) => ({
                                                    ...prev,
                                                    is_default_b2c: !!e.target.checked,
                                                }))
                                            }
                                            disabled={!bankFormData.is_active}
                                        />
                                        <Checkbox
                                            name="is_default_b2b"
                                            label="Default for B2B (quotes, orders)"
                                            checked={bankFormData.is_default_b2b}
                                            onChange={(e) =>
                                                setBankFormData((prev) => ({
                                                    ...prev,
                                                    is_default_b2b: !!e.target.checked,
                                                }))
                                            }
                                            disabled={!bankFormData.is_active}
                                        />
                                        {!bankFormData.is_active &&
                                            (bankFormData.is_default_b2c || bankFormData.is_default_b2b) && (
                                            <p className="col-span-full text-xs text-destructive -mt-1 mb-1">
                                                Activate the account before using it as a default
                                            </p>
                                        )}
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={handleCloseBankDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" loading={saving}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Branch Dialog (theme) */}
                <Dialog
                    open={branchDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCloseBranchDialog();
                    }}
                >
                    <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingBranch ? "Edit Branch" : "New Branch"}
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleBranchSave();
                            }}
                            onKeyDown={preventEnterSubmit}
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto pt-2">
                                <FormSection title="">
                                    <FormGrid>
                                        <Input
                                            name="name"
                                            label="Name"
                                            value={branchFormData.name}
                                            onChange={handleBranchInputChange}
                                            fullWidth
                                            required
                                            error={!!branchErrors.name}
                                            helperText={branchErrors.name || ""}
                                        />
                                        <Input
                                            name="address"
                                            label="Address"
                                            value={branchFormData.address}
                                            onChange={handleBranchInputChange}
                                            multiline
                                            rows={3}
                                            fullWidth
                                            required
                                            error={!!branchErrors.address}
                                            helperText={branchErrors.address || ""}
                                        />
                                        <Input
                                            name="email"
                                            label="Email"
                                            type="email"
                                            value={branchFormData.email}
                                            onChange={handleBranchInputChange}
                                            fullWidth
                                            required
                                            error={!!branchErrors.email}
                                            helperText={branchErrors.email || ""}
                                        />
                                        <Input
                                            name="contact_no"
                                            label="Contact Number"
                                            value={branchFormData.contact_no}
                                            onChange={handleBranchInputChange}
                                            fullWidth
                                            required
                                            error={!!branchErrors.contact_no}
                                            helperText={branchErrors.contact_no || ""}
                                        />
                                        <Input
                                            name="gst_number"
                                            label="GST Number"
                                            value={branchFormData.gst_number}
                                            onChange={handleBranchInputChange}
                                            fullWidth
                                            required
                                            error={!!branchErrors.gst_number}
                                            helperText={branchErrors.gst_number || ""}
                                        />
                                        <Checkbox
                                            name="is_active"
                                            label="Active"
                                            checked={branchFormData.is_active}
                                            onChange={(e) =>
                                                setBranchFormData((prev) => ({
                                                    ...prev,
                                                    is_active: !!e.target.checked,
                                                }))
                                            }
                                        />
                                        <Checkbox
                                            name="is_default"
                                            label="Set as Default Branch"
                                            checked={branchFormData.is_default}
                                            onChange={(e) =>
                                                setBranchFormData((prev) => ({
                                                    ...prev,
                                                    is_default: !!e.target.checked,
                                                }))
                                            }
                                            disabled={!branchFormData.is_active}
                                        />
                                        <Select
                                            name="quotation_template_id"
                                            label="Quotation PDF Template"
                                            value={branchFormData.quotation_template_id ?? ""}
                                            onChange={(e) =>
                                                setBranchFormData((prev) => ({
                                                    ...prev,
                                                    quotation_template_id: e.target.value ? Number(e.target.value) : null,
                                                }))
                                            }
                                            placeholder="Default (use system default)"
                                            className="min-w-[200px]"
                                        >
                                            {quotationTemplateOptions.map((t) => (
                                                <MenuItem key={t.id} value={t.id}>
                                                    {t.name} {t.is_default ? "(default)" : ""}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={handleCloseBranchDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" loading={saving}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Warehouse Dialog (theme) */}
                <Dialog
                    open={warehouseDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCloseWarehouseDialog();
                    }}
                >
                    <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingWarehouse ? "Edit Warehouse" : "New Warehouse"}
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleWarehouseSave();
                            }}
                            onKeyDown={preventEnterSubmit}
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto pt-2">
                                <FormSection title="">
                                    <FormGrid>
                                        <Input
                                            name="name"
                                            label="Name"
                                            value={warehouseFormData.name}
                                            onChange={handleWarehouseInputChange}
                                            fullWidth
                                            required
                                            error={!!warehouseErrors.name}
                                            helperText={warehouseErrors.name || ""}
                                        />
                                        <Input
                                            name="contact_person"
                                            label="Contact Person"
                                            value={warehouseFormData.contact_person}
                                            onChange={handleWarehouseInputChange}
                                            fullWidth
                                        />
                                        <Input
                                            name="mobile"
                                            label="Mobile"
                                            value={warehouseFormData.mobile}
                                            onChange={handleWarehouseInputChange}
                                            fullWidth
                                            required
                                            error={!!warehouseErrors.mobile}
                                            helperText={warehouseErrors.mobile || ""}
                                        />
                                        <AutocompleteField
                                            name="state_id"
                                            label="State"
                                            asyncLoadOptions={(q) => getReferenceOptionsSearch("state.model", { q, limit: 20 })}
                                            referenceModel="state.model"
                                            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                                            value={warehouseFormData.state_id ? { id: warehouseFormData.state_id } : null}
                                            onChange={(e, newValue) =>
                                                handleWarehouseInputChange({
                                                    target: { name: "state_id", value: newValue?.id ?? newValue?.value ?? "" },
                                                })
                                            }
                                            placeholder="Type to search..."
                                            required
                                            error={!!warehouseErrors.state_id}
                                            helperText={warehouseErrors.state_id || ""}
                                        />
                                        <Input
                                            name="email"
                                            label="Email"
                                            type="email"
                                            value={warehouseFormData.email}
                                            onChange={handleWarehouseInputChange}
                                            fullWidth
                                            error={!!warehouseErrors.email}
                                            helperText={warehouseErrors.email || ""}
                                        />
                                        <Input
                                            name="phone_no"
                                            label="Phone No"
                                            value={warehouseFormData.phone_no}
                                            onChange={handleWarehouseInputChange}
                                            fullWidth
                                            error={!!warehouseErrors.phone_no}
                                            helperText={warehouseErrors.phone_no || ""}
                                        />
                                        <Input
                                            name="address"
                                            label="Address"
                                            value={warehouseFormData.address}
                                            onChange={handleWarehouseInputChange}
                                            multiline
                                            rows={3}
                                            fullWidth
                                            required
                                            error={!!warehouseErrors.address}
                                            helperText={warehouseErrors.address || ""}
                                        />
                                        <AutocompleteField
                                            name="branch_id"
                                            label="Branch"
                                            asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                                            referenceModel="company_branch.model"
                                            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                                            value={warehouseFormData.branch_id ? { id: warehouseFormData.branch_id } : null}
                                            onChange={(e, newValue) =>
                                                handleWarehouseInputChange({
                                                    target: { name: "branch_id", value: newValue?.id ?? newValue?.value ?? "" },
                                                })
                                            }
                                            placeholder="Type to search..."
                                            dropdownPlacement="top"
                                            required
                                            error={!!warehouseErrors.branch_id}
                                            helperText={warehouseErrors.branch_id || ""}
                                        />
                                        <Checkbox
                                            name="is_active"
                                            label="Active"
                                            checked={warehouseFormData.is_active}
                                            onChange={(e) =>
                                                setWarehouseFormData((prev) => ({
                                                    ...prev,
                                                    is_active: !!e.target.checked,
                                                }))
                                            }
                                        />
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={handleCloseWarehouseDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" loading={saving}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </ProtectedRoute >
    );
}

