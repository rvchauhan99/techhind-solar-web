"use client";

import { useState, useEffect } from "react";
import Input from "@/components/common/Input";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import Loader from "@/components/common/Loader";
import Checkbox from "@/components/common/Checkbox";
import CommonSelect from "@/components/common/Select";
import { MenuItem as CommonMenuItem } from "@/components/common/Select";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Breadcrumbs,
    Link,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Tabs,
    Tab,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SmsIcon from "@mui/icons-material/Sms";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button as ThemeButton } from "@/components/ui/button";
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
import { getReferenceOptions, getDefaultState } from "@/services/mastersService";
import { validatePhone, validateEmail, validateGSTIN, formatPhone, formatToUpperCase } from "@/utils/validators";
import { toastSuccess, toastError } from "@/utils/toast";

export default function CompanyProfilePage() {
    const [company, setCompany] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [states, setStates] = useState([]);
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
    const [allUsers, setAllUsers] = useState([]);
    const [managersSelectedIds, setManagersSelectedIds] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [imageUrls, setImageUrls] = useState({ logo: null, header: null, footer: null, stamp: null });
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
        bank_name: "",
        bank_account_name: "",
        bank_account_number: "",
        bank_account_ifsc: "",
        bank_account_branch: "",
        is_active: true,
        is_default: false,
    });
    const [branchFormData, setBranchFormData] = useState({
        name: "",
        address: "",
        email: "",
        contact_no: "",
        gst_number: "",
        is_active: true,
        is_default: false,
    });
    const [warehouseFormData, setWarehouseFormData] = useState({
        name: "",
        contact_person: "",
        mobile: "",
        state_id: null,
        email: "",
        phone_no: "",
        address: "",
        is_active: true,
    });

    useEffect(() => {
        loadCompanyProfile();
        loadBankAccounts();
        loadStates(); // Load states for warehouse dropdown
    }, []);

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
            setImageUrls({ logo: null, header: null, footer: null, stamp: null });
            const types = ["logo", "header", "footer", "stamp"];
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

    const loadStates = async () => {
        try {
            const response = await getReferenceOptions("state");
            console.log("States response:", response); // Debug log
            const statesData = response.result || response.data || response;
            console.log("States data:", statesData); // Debug log
            setStates(Array.isArray(statesData) ? statesData : []);
        } catch (err) {
            console.error("Error loading states:", err);
            toastError(err?.response?.data?.message || "Failed to load states");
            setStates([]);
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

            // Validation: Cannot set inactive account as default
            if (bankFormData.is_default === true && bankFormData.is_active === false) {
                setError("You must activate the account first before setting it as default");
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
                bank_name: "",
                bank_account_name: "",
                bank_account_number: "",
                bank_account_ifsc: "",
                bank_account_branch: "",
                is_active: true,
                is_default: false,
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
            bank_name: account.bank_name || "",
            bank_account_name: account.bank_account_name || "",
            bank_account_number: account.bank_account_number || "",
            bank_account_ifsc: account.bank_account_ifsc || "",
            bank_account_branch: account.bank_account_branch || "",
            is_active: account.is_active !== undefined ? account.is_active : true,
            is_default: account.is_default !== undefined ? account.is_default : false,
        });
        setBankDialogOpen(true);
    };

    const handleDeleteBankAccount = async (id) => {
        // Find the account to check if it's default
        const account = bankAccounts.find((acc) => acc.id === id);

        // Validation: Cannot delete default account
        if (account && account.is_default === true) {
            setError("Cannot deactivate the default bank account. Please set another account as default first.");
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
            bank_name: "",
            bank_account_name: "",
            bank_account_number: "",
            bank_account_ifsc: "",
            bank_account_branch: "",
            is_active: true,
            is_default: false,
        });
        setBankDialogOpen(true);
    };

    const handleCloseBankDialog = () => {
        setBankDialogOpen(false);
        setEditingBankAccount(null);
        setBankFormData({
            bank_name: "",
            bank_account_name: "",
            bank_account_number: "",
            bank_account_ifsc: "",
            bank_account_branch: "",
            is_active: true,
            is_default: false,
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
        });
        setBranchErrors({});
    };

    // Warehouse Handlers
    const handleWarehouseInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Convert state_id to number for Select component
        let processedValue = name === "state_id" && value !== "" ? Number(value) : (type === "checkbox" ? checked : value);

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
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
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
            <Box>

                {/* Page Title */}
                <Typography variant="h4" sx={{ mb: 3 }}>
                    Company Profile
                </Typography>

                {/* Success/Error Messages */}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
                        {success}
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                        {error}
                    </Alert>
                )}

                {/* Summary Cards */}


                {/* Main Content */}
                <Grid container spacing={2} >
                    {/* Left Column - Company Information */}
                    <Grid size={3} sx={{ maxHeight: calculateMaxHeight(), overflow: "auto" }}>
                        {/* Company Information Card */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                {/* Company Logo - Small */}
                                {company?.logo && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            mb: 2,
                                            p: 1,
                                            // border: "1px solid #e0e0e0",
                                            // borderRadius: 1,
                                            bgcolor: "#fff",
                                            underline: "1px solidrgb(88, 84, 198)",
                                        }}
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
                                    </Box>
                                )}
                                {/* Company Name - Highlighted */}
                                {company?.company_name && (
                                    <Typography
                                        variant="h6"
                                        style={{
                                           borderBottom: "1px solid rgb(189 189 189)",
                                        }}
                                        sx={{
                                            textAlign: "center",
                                            mb: 2,
                                            fontWeight: 600,
                                            color: "primary.main",
                                            fontSize: "1.1rem",
                                        }}
                                    >
                                        {company.company_name}
                                    </Typography>
                                )}
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-base font-semibold">Company Information</h3>
                                    <ThemeButton
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
                                    </ThemeButton>
                                </div>
                                <dl className="space-y-2.5 text-sm">
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
                            </CardContent>
                        </Card>

                        {/* Registered Office Card */}
                        <Card>
                            <CardContent>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-base font-semibold">Registered Office</h3>
                                    <ThemeButton
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
                                    </ThemeButton>
                                </div>
                                <dl className="space-y-2.5 text-sm">
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
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Right Column - Bank Details */}
                    <Grid size={9}>
                        <Grid container spacing={3} sx={{ mb: 3 }} justifyContent="space-between">
                            <Grid item xs={12} md={3} size={4}>
                                <Card
                                    sx={{
                                        bgcolor: "#4caf50",
                                        color: "white",
                                        height: "100%",
                                    }}
                                >
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <PersonIcon sx={{ mr: 1 }} />
                                            <Typography variant="h6">User Limit</Typography>
                                        </Box>
                                        <Typography variant="h4">
                                            {company?.user_limit_used || 0} / {company?.user_limit_total || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            {((company?.user_limit_total || 0) - (company?.user_limit_used || 0))} of{" "}
                                            {company?.user_limit_total || 0} Remaining
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3} size={4}>
                                <Card
                                    sx={{
                                        bgcolor: "#ff9800",
                                        color: "white",
                                        height: "100%",
                                    }}
                                >
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <CalendarTodayIcon sx={{ mr: 1 }} />
                                            <Typography variant="h6">Plan Valid Till</Typography>
                                        </Box>
                                        <Typography variant="h5">{formattedDate}</Typography>
                                        <Typography variant="body2">
                                            {daysLeft > 0 ? `${daysLeft} Days Left` : "Expired"}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3} size={4}>
                                <Card
                                    sx={{
                                        bgcolor: "#f44336",
                                        color: "white",
                                        height: "100%",
                                        cursor: "pointer",
                                        "&:hover": {
                                            opacity: 0.9,
                                        },
                                    }}
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
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <SmsIcon sx={{ mr: 1 }} />
                                            <Typography variant="h6">SMS Credit</Typography>
                                        </Box>
                                        <Typography variant="h4">
                                            {company?.sms_credit_used || 0} / {company?.sms_credit_total || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            {company?.sms_credit_total
                                                ? Math.round(((company?.sms_credit_used || 0) / company.sms_credit_total) * 100)
                                                : 0}
                                            % Used
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                        <Card>
                            <CardContent>
                                <Tabs
                                    value={activeTab}
                                    onChange={(e, v) => {
                                        setActiveTab(v);
                                        // Load data when tab is clicked
                                        if (v === 1 && !branchesLoaded) {
                                            // Branch Details tab
                                            loadBranches();
                                        } else if (v === 3 && !warehousesLoaded) {
                                            // Warehouse tab
                                            loadWarehouses();
                                        }
                                        // Tab 2 (Images) can be handled later if needed
                                    }}
                                    sx={{ mb: 0 }}
                                >
                                    <Tab label="Bank Details" />
                                    <Tab label="Branch Details" />
                                    <Tab label="Images" />
                                    <Tab label="Warehouse" />
                                </Tabs>
                                {activeTab === 0 && (
                                    <>
                                        <Box display="flex" justifyContent="flex-end" mb={2}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleNewBankAccount}
                                            >
                                                + New Bank Details
                                            </Button>
                                        </Box>
                                        <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                            <TableContainer
                                                component={Paper}
                                                variant="outlined"
                                            >
                                                <Table sx={{ minWidth: 800 }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {/* <TableCell>#</TableCell> */}
                                                            <TableCell>Bank Name</TableCell>
                                                            <TableCell>Account Name</TableCell>
                                                            <TableCell>Account No</TableCell>
                                                            <TableCell>IFSC</TableCell>
                                                            <TableCell>Branch</TableCell>
                                                            <TableCell>Active</TableCell>
                                                            <TableCell>Default</TableCell>
                                                            <TableCell>Actions</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {bankAccounts.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={9} align="center">
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        No bank accounts found
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            bankAccounts.map((account, index) => (
                                                                <TableRow key={account.id}>
                                                                    {/* <TableCell>{index + 1}</TableCell> */}
                                                                    <TableCell>{account.bank_name}</TableCell>
                                                                    <TableCell>{account.bank_account_name}</TableCell>
                                                                    <TableCell>{account.bank_account_number}</TableCell>
                                                                    <TableCell>{account.bank_account_ifsc || "-"}</TableCell>
                                                                    <TableCell>{account.bank_account_branch || "-"}</TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={account.is_active ? "Active" : "Inactive"}
                                                                            color={account.is_active ? "success" : "default"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {account.is_default ? (
                                                                            <Chip
                                                                                label="Default"
                                                                                color="primary"
                                                                                size="small"
                                                                            />
                                                                        ) : (
                                                                            "-"
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="contained"
                                                                                onClick={() => handleEditBankAccount(account)}
                                                                            >
                                                                                Edit
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="error"
                                                                                onClick={() => handleDeleteBankAccount(account.id)}
                                                                                disabled={account.is_default === true}
                                                                            >
                                                                                Delete
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                )}
                                {activeTab === 1 && (
                                    <>
                                        <Box display="flex" justifyContent="flex-end" mb={2}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleNewBranch}
                                            >
                                                + New Branch
                                            </Button>
                                        </Box>
                                        <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                            <TableContainer
                                                component={Paper}
                                                variant="outlined"
                                            >
                                                <Table sx={{ minWidth: 800 }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {/* <TableCell>#</TableCell> */}
                                                            <TableCell>Name</TableCell>
                                                            <TableCell>Address</TableCell>
                                                            <TableCell>Email</TableCell>
                                                            <TableCell>Contact No</TableCell>
                                                            <TableCell>GST Number</TableCell>
                                                            <TableCell>Active</TableCell>
                                                            <TableCell>Default</TableCell>
                                                            <TableCell>Actions</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {branches.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={9} align="center">
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        No branches found
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            branches.map((branch, index) => (
                                                                <TableRow key={branch.id}>
                                                                    {/* <TableCell>{index + 1}</TableCell> */}
                                                                    <TableCell>{branch.name}</TableCell>
                                                                    <TableCell>{branch.address}</TableCell>
                                                                    <TableCell>{branch.email}</TableCell>
                                                                    <TableCell>{branch.contact_no}</TableCell>
                                                                    <TableCell>{branch.gst_number}</TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={branch.is_active ? "Active" : "Inactive"}
                                                                            color={branch.is_active ? "success" : "default"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {branch.is_default && (
                                                                            <Chip
                                                                                label="Default"
                                                                                color="primary"
                                                                                size="small"
                                                                            />
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="contained"
                                                                                onClick={() => handleEditBranch(branch)}
                                                                            >
                                                                                Edit
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="error"
                                                                                onClick={() => handleDeleteBranch(branch.id)}
                                                                            >
                                                                                Delete
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                )}
                                {activeTab === 2 && (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {/* Company Logo */}
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2 }}>
                                                Company Logo
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                {company?.logo ? (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                border: "1px solid #ddd",
                                                                borderRadius: 1,
                                                                p: 2,
                                                                minWidth: 200,
                                                                minHeight: 100,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                bgcolor: "#fff",
                                                            }}
                                                        >
                                                            <img
                                                                src={getImageUrl("logo")}
                                                                alt="Company Logo"
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "150px",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        </Box>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => handleImageDelete("logo")}
                                                            disabled={saving}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        No logo uploaded
                                                    </Typography>
                                                )}
                                                {!company?.logo && (
                                                    <Button
                                                        variant="outlined"
                                                        component="label"
                                                        startIcon={<CloudUploadIcon />}
                                                        disabled={saving}
                                                    >
                                                        Upload Logo
                                                        <input
                                                            type="file"
                                                            hidden
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    handleImageUpload("logo", file);
                                                                }
                                                            }}
                                                        />
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Header */}
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2 }}>
                                                Header
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                {company?.header ? (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                border: "1px solid #ddd",
                                                                borderRadius: 1,
                                                                p: 1,
                                                                maxWidth: 600,
                                                                maxHeight: 200,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                bgcolor: "#fff",
                                                            }}
                                                        >
                                                            <img
                                                                src={getImageUrl("header")}
                                                                alt="Header"
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "200px",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        </Box>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => handleImageDelete("header")}
                                                            disabled={saving}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            No header uploaded
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            component="label"
                                                            startIcon={<CloudUploadIcon />}
                                                            disabled={saving}
                                                        >
                                                            Upload Header
                                                            <input
                                                                type="file"
                                                                hidden
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files[0];
                                                                    if (file) {
                                                                        handleImageUpload("header", file);
                                                                    }
                                                                }}
                                                            />
                                                        </Button>
                                                        <Typography variant="caption" color="error">
                                                            Recommended: Image size 1900(w) x 300(h) px
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Footer */}
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2 }}>
                                                Footer
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                {company?.footer ? (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                border: "1px solid #ddd",
                                                                borderRadius: 1,
                                                                p: 1,
                                                                maxWidth: 600,
                                                                maxHeight: 200,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                bgcolor: "#fff",
                                                            }}
                                                        >
                                                            <img
                                                                src={getImageUrl("footer")}
                                                                alt="Footer"
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "200px",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        </Box>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => handleImageDelete("footer")}
                                                            disabled={saving}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            No footer uploaded
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            component="label"
                                                            startIcon={<CloudUploadIcon />}
                                                            disabled={saving}
                                                        >
                                                            Upload Footer
                                                            <input
                                                                type="file"
                                                                hidden
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files[0];
                                                                    if (file) {
                                                                        handleImageUpload("footer", file);
                                                                    }
                                                                }}
                                                            />
                                                        </Button>
                                                        <Typography variant="caption" color="error">
                                                            Recommended: Image size 1900(w) x 300(h) px
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Stamp */}
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2 }}>
                                                Stamp
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                {company?.stamp ? (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                border: "1px solid #ddd",
                                                                borderRadius: 1,
                                                                p: 2,
                                                                minWidth: 200,
                                                                minHeight: 200,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                bgcolor: "#fff",
                                                            }}
                                                        >
                                                            <img
                                                                src={getImageUrl("stamp")}
                                                                alt="Stamp"
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "200px",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        </Box>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => handleImageDelete("stamp")}
                                                            disabled={saving}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        No stamp uploaded
                                                    </Typography>
                                                )}
                                                {!company?.stamp && (
                                                    <Button
                                                        variant="outlined"
                                                        component="label"
                                                        startIcon={<CloudUploadIcon />}
                                                        disabled={saving}
                                                    >
                                                        Upload Stamp
                                                        <input
                                                            type="file"
                                                            hidden
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    handleImageUpload("stamp", file);
                                                                }
                                                            }}
                                                        />
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                {activeTab === 3 && (
                                    <>
                                        <Box display="flex" justifyContent="flex-end" mb={2}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleNewWarehouse}
                                            >
                                                + New Warehouse
                                            </Button>
                                        </Box>
                                        <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                            <TableContainer
                                                component={Paper}
                                                variant="outlined"
                                            >
                                                <Table sx={{ minWidth: 800 }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {/* <TableCell>#</TableCell> */}
                                                            <TableCell>Name</TableCell>
                                                            <TableCell>Contact Person</TableCell>
                                                            <TableCell>Mobile</TableCell>
                                                            <TableCell>State</TableCell>
                                                            <TableCell>Email</TableCell>
                                                            <TableCell>Phone No</TableCell>
                                                            <TableCell>Address</TableCell>
                                                            <TableCell>Managers</TableCell>
                                                            <TableCell>Active</TableCell>
                                                            <TableCell>Actions</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {warehouses.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={11} align="center">
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        No warehouses found
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            warehouses.map((warehouse, index) => (
                                                                <TableRow key={warehouse.id}>
                                                                    {/* <TableCell>{index + 1}</TableCell> */}
                                                                    <TableCell>{warehouse.name}</TableCell>
                                                                    <TableCell>{warehouse.contact_person || "-"}</TableCell>
                                                                    <TableCell>{warehouse.mobile}</TableCell>
                                                                    <TableCell>{warehouse.state_name || "-"}</TableCell>
                                                                    <TableCell>{warehouse.email || "-"}</TableCell>
                                                                    <TableCell>{warehouse.phone_no || "-"}</TableCell>
                                                                    <TableCell>{warehouse.address}</TableCell>
                                                                    <TableCell>
                                                                        {warehouse.managers?.length
                                                                            ? `${warehouse.managers.length} manager${warehouse.managers.length !== 1 ? "s" : ""}`
                                                                            : "-"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={warehouse.is_active ? "Active" : "Inactive"}
                                                                            color={warehouse.is_active ? "success" : "default"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                onClick={() => handleOpenManagersDialog(warehouse)}
                                                                            >
                                                                                Managers
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="contained"
                                                                                onClick={() => handleEditWarehouse(warehouse)}
                                                                            >
                                                                                Edit
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="error"
                                                                                onClick={() => handleDeleteWarehouse(warehouse.id)}
                                                                            >
                                                                                Delete
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

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
                            <ThemeButton type="button" variant="outline" size="sm" onClick={handleCloseManagersDialog}>
                                Cancel
                            </ThemeButton>
                            <ThemeButton
                                type="button"
                                size="sm"
                                loading={saving}
                                disabled={warehouseManagersLoading}
                                onClick={handleSaveWarehouseManagers}
                            >
                                Save
                            </ThemeButton>
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
                                <ThemeButton
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
                                </ThemeButton>
                                <ThemeButton type="submit" size="sm" loading={saving}>
                                    Save
                                </ThemeButton>
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
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto pt-2">
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
                                        <Input
                                            name="bank_account_ifsc"
                                            label="IFSC Code"
                                            value={bankFormData.bank_account_ifsc}
                                            onChange={handleBankInputChange}
                                            fullWidth
                                        />
                                        <Input
                                            name="bank_account_branch"
                                            label="Branch"
                                            value={bankFormData.bank_account_branch}
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
                                                    is_default: e.target.checked ? prev.is_default : false,
                                                }))
                                            }
                                        />
                                        <Checkbox
                                            name="is_default"
                                            label="Set as Default Account"
                                            checked={bankFormData.is_default}
                                            onChange={(e) =>
                                                setBankFormData((prev) => ({
                                                    ...prev,
                                                    is_default: !!e.target.checked,
                                                }))
                                            }
                                            disabled={!bankFormData.is_active}
                                        />
                                        {!bankFormData.is_active && bankFormData.is_default && (
                                            <p className="col-span-full text-xs text-destructive -mt-1 mb-1">
                                                You must activate the account first before setting it as default
                                            </p>
                                        )}
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <ThemeButton type="button" variant="outline" size="sm" onClick={handleCloseBankDialog}>
                                    Cancel
                                </ThemeButton>
                                <ThemeButton type="submit" size="sm" loading={saving}>
                                    Save
                                </ThemeButton>
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
                                    </FormGrid>
                                </FormSection>
                            </div>
                            <DialogFooter className="mt-4">
                                <ThemeButton type="button" variant="outline" size="sm" onClick={handleCloseBranchDialog}>
                                    Cancel
                                </ThemeButton>
                                <ThemeButton type="submit" size="sm" loading={saving}>
                                    Save
                                </ThemeButton>
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
                                        <CommonSelect
                                            name="state_id"
                                            label="State"
                                            value={warehouseFormData.state_id ?? ""}
                                            onChange={handleWarehouseInputChange}
                                            required
                                            error={!!warehouseErrors.state_id}
                                            helperText={warehouseErrors.state_id || ""}
                                            placeholder={!states?.length ? "Loading states..." : "Select state"}
                                        >
                                            {states?.length > 0 &&
                                                states.map((state) => (
                                                    <CommonMenuItem key={state.id} value={state.id}>
                                                        {state.name || state.label || `State ${state.id}`}
                                                    </CommonMenuItem>
                                                ))}
                                        </CommonSelect>
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
                                <ThemeButton type="button" variant="outline" size="sm" onClick={handleCloseWarehouseDialog}>
                                    Cancel
                                </ThemeButton>
                                <ThemeButton type="submit" size="sm" loading={saving}>
                                    Save
                                </ThemeButton>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </Box>
        </ProtectedRoute>
    );
}

