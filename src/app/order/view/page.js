"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Tabs,
    Tab,
    Chip,
    Divider,
    Button,
    MenuItem,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select from "@/components/common/Select";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import orderPaymentsService from "@/services/orderPaymentsService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import PaginatedTable from "@/components/common/PaginatedTable";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";


function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index} style={{ padding: "20px 0" }}>
            {children}
        </div>
    );
}

function RegistrationForm({ orderData, orderId }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        discom_id: "",
        division_id: "",
        sub_division_id: "",
        date_of_registration_gov: "",
        application_no: "",
        feasibility_date: "",
    });
    const [registrationLetter, setRegistrationLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    // Master data states
    const [discoms, setDiscoms] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [subDivisions, setSubDivisions] = useState([]);

    useEffect(() => {
        if (orderData) {
            setFormData({
                discom_id: orderData.discom_id || "",
                division_id: orderData.division_id || "",
                sub_division_id: orderData.sub_division_id || "",
                date_of_registration_gov: orderData.date_of_registration_gov ? moment(orderData.date_of_registration_gov).format("YYYY-MM-DD") : "",
                application_no: orderData.application_no || "",
                feasibility_date: orderData.feasibility_date ? moment(orderData.feasibility_date).format("YYYY-MM-DD") : "",
            });
        }
    }, [orderData]);

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        // Only fetch if not already loaded
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true; // Set immediately to prevent duplicate calls

        // Fetch master data
        const fetchMasterData = async () => {
            try {
                const [discomsRes, divisionsRes, subDivisionsRes] = await Promise.all([
                    mastersService.getReferenceOptions("discom.model"),
                    mastersService.getReferenceOptions("division.model"),
                    mastersService.getReferenceOptions("sub_division.model"),
                ]);
                setDiscoms(Array.isArray(discomsRes?.result) ? discomsRes.result : []);
                setDivisions(Array.isArray(divisionsRes?.result) ? divisionsRes.result : []);
                setSubDivisions(Array.isArray(subDivisionsRes?.result) ? subDivisionsRes.result : []);
            } catch (err) {
                console.error("Failed to fetch master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setRegistrationLetter(file);
        setSuccess(false);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setErrors({});
            setSuccess(false);

            // Validate required fields
            const newErrors = {};
            if (!formData.discom_id) newErrors.discom_id = "Discom is required";
            if (!formData.date_of_registration_gov) newErrors.date_of_registration_gov = "Date of Registration is required";
            if (!formData.application_no) newErrors.application_no = "Application No is required";
            if (!formData.feasibility_date) newErrors.feasibility_date = "Date of Feasibility is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            // Update order with registration details and change status to confirmed
            await orderService.updateOrder(orderId, { ...formData, status: 'confirmed' });

            // Upload registration letter if provided
            if (registrationLetter) {
                const formDataUpload = new FormData();
                formDataUpload.append('document', registrationLetter);
                formDataUpload.append('order_id', orderId);
                formDataUpload.append('doc_type', 'registration_letter');
                formDataUpload.append('remarks', 'Registration Letter');

                await orderDocumentsService.createOrderDocument(formDataUpload);
            }

            setSuccess(true);
            toastSuccess("Registration details saved successfully");
            router.push('/order');
        } catch (err) {
            console.error("Failed to save registration details:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save registration details";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={2}>
            <Grid container spacing={3}>
                <Grid size={4}>
                    <Select
                        name="discom_id"
                        label="Discom"
                        required
                        value={formData.discom_id}
                        onChange={(e) => handleChange('discom_id', e.target.value)}
                        error={!!errors.discom_id}
                        helperText={errors.discom_id}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        {discoms.map((discom) => (
                            <MenuItem key={discom.id} value={discom.id}>
                                {discom.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>

                <Grid size={4}>
                    <Select
                        name="division_id"
                        label="Division"
                        value={formData.division_id}
                        onChange={(e) => handleChange('division_id', e.target.value)}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        {divisions.map((division) => (
                            <MenuItem key={division.id} value={division.id}>
                                {division.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>

                <Grid size={4}>
                    <Select
                        name="sub_division_id"
                        label="Sub Division"
                        value={formData.sub_division_id}
                        onChange={(e) => handleChange('sub_division_id', e.target.value)}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        {subDivisions.map((subDivision) => (
                            <MenuItem key={subDivision.id} value={subDivision.id}>
                                {subDivision.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>

                <Grid size={4}>
                    <DateField
                        fullWidth
                        label="Date of Registration"
                        required
                        name="date_of_registration_gov"
                        value={formData.date_of_registration_gov}
                        onChange={(e) => handleChange("date_of_registration_gov", e.target.value)}
                        error={!!errors.date_of_registration_gov}
                        helperText={errors.date_of_registration_gov}
                    />
                </Grid>

                <Grid size={4}>
                    <Input
                        fullWidth
                        label="Application No"
                        name="application_no"
                        required
                        value={formData.application_no}
                        onChange={(e) => handleChange('application_no', e.target.value)}
                        error={!!errors.application_no}
                        helperText={errors.application_no}
                    />
                </Grid>

                <Grid size={4}>
                    <DateField
                        fullWidth
                        label="Date of Feasibility"
                        name="feasibility_date"
                        required
                        value={formData.feasibility_date}
                        onChange={(e) => handleChange("feasibility_date", e.target.value)}
                        error={!!errors.feasibility_date}
                        helperText={errors.feasibility_date}
                    />
                </Grid>

                <Grid size={12}>
                    <Typography variant="body2" gutterBottom>
                        Upload Registration Letter
                    </Typography>
                    <Button
                        variant="outlined"
                        component="label"
                        size="small"
                    >
                        Choose File
                        <input
                            type="file"
                            hidden
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                        />
                    </Button>
                    {registrationLetter && (
                        <Typography variant="caption" ml={2}>
                            {registrationLetter.name}
                        </Typography>
                    )}
                </Grid>

                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Registration details saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSave}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Save
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}

function ReceivePaymentForm({ orderData, orderId, onPaymentSaved }) {
    const [formData, setFormData] = useState({
        order_id: orderId,
        date_of_payment: "",
        payment_amount: "",
        payment_mode_id: "",
        company_bank_account_id: "",
        transaction_cheque_date: "",
        transaction_cheque_number: "",
        payment_remarks: "",
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to reset file input
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    const [paymentModes, setPaymentModes] = useState([]);
    const [companyBankAccounts, setCompanyBankAccounts] = useState([]);

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        // Only fetch if not already loaded
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true; // Set immediately to prevent duplicate calls

        const fetchMasterData = async () => {
            try {
                const [paymentModesRes, bankAccountsRes] = await Promise.all([
                    mastersService.getReferenceOptions("payment_mode.model"),
                    companyService.listBankAccounts(),
                ]);
                setPaymentModes(Array.isArray(paymentModesRes?.result) ? paymentModesRes.result : []);
                const accounts = Array.isArray(bankAccountsRes?.result) ? bankAccountsRes.result : (Array.isArray(bankAccountsRes?.data) ? bankAccountsRes.data : []);
                setCompanyBankAccounts(accounts);
                // If only one company bank account, select it by default
                if (accounts.length === 1) {
                    setFormData((prev) => ({ ...prev, company_bank_account_id: String(accounts[0].id) }));
                }
            } catch (err) {
                console.error("Failed to fetch master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    // Auto-select when company bank accounts load and there is exactly one
    useEffect(() => {
        if (companyBankAccounts.length === 1 && !formData.company_bank_account_id) {
            setFormData((prev) => ({ ...prev, company_bank_account_id: String(companyBankAccounts[0].id) }));
        }
    }, [companyBankAccounts]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setErrors({});

            // Validate required fields
            const newErrors = {};
            if (!formData.date_of_payment) newErrors.date_of_payment = "Date of Payment is required";
            if (!formData.payment_amount || formData.payment_amount <= 0) newErrors.payment_amount = "Payment Amount is required and must be greater than 0";
            if (!formData.payment_mode_id) newErrors.payment_mode_id = "Payment Mode is required";
            if (!formData.company_bank_account_id) newErrors.company_bank_account_id = "Company Bank Account is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            const formDataUpload = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key]) formDataUpload.append(key, formData[key]);
            });

            if (receiptFile) {
                formDataUpload.append('receipt_cheque_file', receiptFile);
            }

            await orderPaymentsService.createPayment(formDataUpload);

            // Also save receipt to order_documents if file exists
            if (receiptFile) {
                try {
                    const docFormData = new FormData();
                    docFormData.append('document', receiptFile);
                    docFormData.append('order_id', orderId);
                    docFormData.append('doc_type', 'payment_receipt');
                    docFormData.append('remarks', `Payment Receipt - ${formData.date_of_payment}`);
                    await orderDocumentsService.createOrderDocument(docFormData);
                } catch (docErr) {
                    console.error("Failed to save receipt to order_documents:", docErr);
                    // Don't fail the whole operation if document save fails
                }
            }

            setSuccess(true);
            toastSuccess("Payment saved successfully");
            const defaultCompanyAccount = companyBankAccounts.length === 1 ? String(companyBankAccounts[0].id) : "";
            setFormData({
                order_id: orderId,
                date_of_payment: "",
                payment_amount: "",
                payment_mode_id: "",
                company_bank_account_id: defaultCompanyAccount,
                transaction_cheque_date: "",
                transaction_cheque_number: "",
                payment_remarks: "",
            });
            setReceiptFile(null);
            setFileInputKey(Date.now());

            if (onPaymentSaved) {
                onPaymentSaved();
            }

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save payment:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save payment";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={2}>
            <Grid container spacing={3}>
                <Grid size={3}>
                    <DateField
                        fullWidth
                        label="Date of Payment"
                        name="date_of_payment"
                        required
                        value={formData.date_of_payment}
                        onChange={(e) => handleChange("date_of_payment", e.target.value)}
                        error={!!errors.date_of_payment}
                        helperText={errors.date_of_payment}
                    />
                </Grid>

                <Grid size={3}>
                    <Input
                        fullWidth
                        label="Payment Amount"
                        type="number"
                        name="payment_amount"
                        required
                        value={formData.payment_amount}
                        onChange={(e) => handleChange('payment_amount', e.target.value)}
                        error={!!errors.payment_amount}
                        helperText={errors.payment_amount}
                    />
                </Grid>

                <Grid size={3}>
                    <Select
                        name="payment_mode_id"
                        label="Payment Mode"
                        required
                        value={formData.payment_mode_id}
                        onChange={(e) => handleChange('payment_mode_id', e.target.value)}
                        error={!!errors.payment_mode_id}
                        helperText={errors.payment_mode_id}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        {paymentModes.map((mode) => (
                            <MenuItem key={mode.id} value={mode.id}>
                                {mode.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>

                <Grid size={3}>
                    <Select
                        name="company_bank_account_id"
                        label="Company Bank Account"
                        required
                        value={formData.company_bank_account_id}
                        onChange={(e) => handleChange('company_bank_account_id', e.target.value)}
                        error={!!errors.company_bank_account_id}
                        helperText={errors.company_bank_account_id}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        {companyBankAccounts.map((acc) => (
                            <MenuItem key={acc.id} value={String(acc.id)}>
                                {acc.bank_name} - {acc.bank_account_number}
                                {acc.bank_account_name ? ` (${acc.bank_account_name})` : ""}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>

                <Grid size={3}>
                    <DateField
                        fullWidth
                        label="Transaction / Cheque Date"
                        name="transaction_cheque_date"
                        value={formData.transaction_cheque_date}
                        onChange={(e) => handleChange("transaction_cheque_date", e.target.value)}
                    />
                </Grid>

                <Grid size={3}>
                    <Input
                        fullWidth
                        label="Transaction / Cheque No."
                        name="transaction_cheque_number"
                        value={formData.transaction_cheque_number}
                        onChange={(e) => handleChange('transaction_cheque_number', e.target.value)}
                    />
                </Grid>

                <Grid size={3}>
                    <Button variant="outlined" component="label" size="small">
                        Upload Receipt / Cheque
                        <input
                            key={fileInputKey}
                            type="file"
                            hidden
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                        />
                    </Button>
                    {receiptFile && <Typography variant="caption" ml={2}>{receiptFile.name}</Typography>}
                </Grid>

                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Payment Remarks"
                        name="payment_remarks"
                        multiline
                        rows={2}
                        value={formData.payment_remarks}
                        onChange={(e) => handleChange('payment_remarks', e.target.value)}
                    />
                </Grid>
                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Payment saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSave}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Save
                    </Button>
                </Grid>

            </Grid>
        </Box>
    );
}
const calculatedTableHeight = () => {
    return `calc(100vh - 153px)`;
};
function PreviousPaymentsTable({ orderId }) {
    const fetchPayments = async (params) => {
        const result = await orderPaymentsService.getPayments({
            ...params,
            order_id: orderId,
        });
        return result;
    };

    const paymentsColumns = [
        {
            id: "date_of_payment",
            label: "Date",
            field: "date_of_payment",
            sortable: true,
            render: (row) => moment(row.date_of_payment).format("DD-MM-YYYY"),
        },
        {
            id: "payment_amount",
            label: "Amount",
            field: "payment_amount",
            render: (row) => `₹${Number(row.payment_amount).toLocaleString()}`,
        },
        {
            id: "payment_mode_name",
            label: "Payment Mode",
            field: "payment_mode_name",
            render: (row) => row.payment_mode_name || "-",
        },
        {
            id: "company_bank",
            label: "Company Bank Account",
            field: "company_bank_name",
            render: (row) =>
                row.company_bank_name && row.company_bank_account_number
                    ? `${row.company_bank_name} - ${row.company_bank_account_number}`
                    : "-",
        },
        {
            id: "transaction_cheque_number",
            label: "Transaction/Cheque No.",
            field: "transaction_cheque_number",
            render: (row) => row.transaction_cheque_number || "-",
        },
        {
            id: "payment_remarks",
            label: "Remarks",
            field: "payment_remarks",
            render: (row) => row.payment_remarks || "-",
        },
    ];

    return (
        <PaginatedTable
            columns={paymentsColumns}
            fetcher={fetchPayments}
            initialPage={1}
            initialLimit={10}
            showSearch={true}
            height={calculatedTableHeight()}
            getRowKey={(row) => row.id}
        />
    );
}

function RemarksForm({ orderData, orderId }) {
    const [remarks, setRemarks] = useState(orderData?.order_remarks || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (orderData?.order_remarks) {
            setRemarks(orderData.order_remarks);
        }
    }, [orderData]);

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);
            await orderService.updateOrder(orderId, { order_remarks: remarks });
            setSuccess(true);
            toastSuccess("Remarks saved successfully");
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save remarks:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save remarks";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={2}>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Order Remarks"
                        multiline
                        rows={10}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter any remarks or notes about this order..."
                    />
                </Grid>

                {error && (
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Remarks saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Remarks"}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}

function UploadDocumentsForm({ orderId }) {
    const [formData, setFormData] = useState({
        doc_type: "",
        remarks: "",
    });
    const [documentFile, setDocumentFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to reset file input
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDocumentFile(file);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setErrors({});

            // Validate
            const newErrors = {};
            if (!formData.doc_type) newErrors.doc_type = "Document Type is required";
            if (!documentFile) newErrors.document = "Document File is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            const uploadFormData = new FormData();
            uploadFormData.append('document', documentFile);
            uploadFormData.append('order_id', orderId);
            uploadFormData.append('doc_type', formData.doc_type);
            uploadFormData.append('remarks', formData.remarks);

            await orderDocumentsService.createOrderDocument(uploadFormData);

            setSuccess(true);
            toastSuccess("Document uploaded successfully");
            setFormData({ doc_type: "", remarks: "" });
            setDocumentFile(null);
            setFileInputKey(Date.now());
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to upload document:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to upload document";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={2}>
            <Grid container spacing={3}>
                <Grid size={6}>
                    <Select
                        name="doc_type"
                        label="Document Type"
                        required
                        value={formData.doc_type}
                        onChange={(e) => handleChange('doc_type', e.target.value)}
                        error={!!errors.doc_type}
                        helperText={errors.doc_type}
                    >
                        <MenuItem value="">-- Select --</MenuItem>
                        <MenuItem value="aadhar_card">Aadhar Card</MenuItem>
                        <MenuItem value="pan_card">PAN Card</MenuItem>
                        <MenuItem value="electricity_bill">Electricity Bill</MenuItem>
                        <MenuItem value="registration_letter">Registration Letter</MenuItem>
                        <MenuItem value="payment_receipt">Payment Receipt</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                    </Select>
                </Grid>

                <Grid size={6}>
                    <Typography variant="body2" gutterBottom>
                        Document File *
                    </Typography>
                    <Button variant="outlined" component="label" fullWidth>
                        Choose File
                        <input key={fileInputKey} type="file" hidden onChange={handleFileChange} />
                    </Button>
                    {documentFile && <Typography variant="caption" mt={1}>{documentFile.name}</Typography>}
                    {errors.document && <Typography variant="caption" color="error">{errors.document}</Typography>}
                </Grid>

                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.remarks}
                        onChange={(e) => handleChange('remarks', e.target.value)}
                    />
                </Grid>

                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Document uploaded successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Uploading..." : "Upload Document"}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}


export default function OrderViewPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<CircularProgress />}>
                <OrderViewPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function OrderViewPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");
    const initialTab = parseInt(searchParams.get("tab")) || null; // Get tab from URL or default to 0

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [tabValue, setTabValue] = useState(initialTab || 0); // Use initialTab from URL
    const [visitedTabs, setVisitedTabs] = useState(new Set([initialTab || 0])); // Track visited tabs, start with initialTab
    const [totalReceivedAmount, setTotalReceivedAmount] = useState(0);

    // Determine which tabs should be visible based on initial tab
    const getVisibleTabs = () => {
        // Documents (tab 1) is always visible
        switch (initialTab) {
            case 0: // Registration
                return [0, 1]; // Registration + Documents
            case 2: // Receive Payment
            case 3: // Previous Payments
                return [1, 2, 3]; // Documents + Receive Payment + Previous Payments
            case 4: // Remarks
                return [4]; // Remarks
            case 5: // Upload Documents
                return [1, 5]; // Documents + Upload Documents
            default:
                return [0, 1, 2, 3, 4, 5]; // All tabs (when no specific tab is selected)
        }
    };
    const visibleTabs = getVisibleTabs();
    console.warn('visibleTabs', visibleTabs);

    useEffect(() => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                setLoading(true);
                const response = await orderService.getOrderById(orderId);
                setOrderData(response?.result || response);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch order:", err);
                const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
                setError(msg);
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };

        const fetchTotalReceivedAmount = async () => {
            try {
                const response = await orderPaymentsService.getPayments({ order_id: orderId, limit: 1000 });
                const payments = response?.result || [];
                const total = payments.reduce((sum, payment) => sum + parseFloat(payment.payment_amount || 0), 0);
                setTotalReceivedAmount(total);
            } catch (err) {
                console.error("Failed to fetch payment total:", err);
            }
        };

        fetchOrder();
        fetchTotalReceivedAmount();
    }, [orderId]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setVisitedTabs(prev => new Set([...prev, newValue])); // Mark tab as visited
    };

    const refreshPaymentTotal = async () => {
        try {
            const response = await orderPaymentsService.getPayments({ order_id: orderId, limit: 1000 });
            const payments = response?.result || [];
            const total = payments.reduce((sum, payment) => sum + parseFloat(payment.payment_amount || 0), 0);
            setTotalReceivedAmount(total);
        } catch (err) {
            console.error("Failed to refresh payment total:", err);
        }
    };

    const fetchDocuments = async (params) => {
        const result = await orderDocumentsService.getOrderDocuments({
            ...params,
            order_id: orderId,
        });
        return result;
    };

    const documentsColumns = [
        {
            id: "created_at",
            label: "Uploaded On",
            field: "created_at",
            sortable: true,
            render: (row) => moment(row.created_at).format("DD-MM-YYYY"),
        },
        {
            id: "doc_type",
            label: "Document Type",
            field: "doc_type",
            sortable: true,
            render: (row) => {
                const labels = {
                    electricity_bill: "Electricity Bill",
                    house_tax_bill: "House Tax Bill",
                    aadhar_card: "Aadhar Card",
                    passport_photo: "Passport Size Picture",
                    pan_card: "PAN Card or Driving Licence",
                    cancelled_cheque: "Cancelled Cheque",
                    customer_sign: "Customer Sign",
                };
                return labels[row.doc_type] || row.doc_type;
            },
        },
        {
            id: "remarks",
            label: "Document No / Remarks",
            field: "remarks",
            render: (row) => row.remarks || "-",
        },
        {
            id: "uploaded_by",
            label: "Uploaded By",
            render: (row) => orderData?.handled_by_name || "System",
        },
        {
            id: "actions",
            label: "Actions",
            render: (row) => (
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={async () => {
                            try {
                                const url = await orderDocumentsService.getDocumentUrl(row.id);
                                if (url) window.open(url, "_blank");
                            } catch (e) {
                                console.error("Failed to get document URL", e);
                            }
                        }}
                    >
                        View Document
                    </Button>
                </Box>
            ),
        },
    ];
    const calculateInquiryDetailsHeight = () => {
        return `calc(100vh - 85px)`;
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress />
                </Box>
            </ProtectedRoute>
        );
    }

    if (error) {
        return (
            <ProtectedRoute>
                <Box p={3}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <Box >
                <Grid container spacing={2} >
                    {/* Left Sidebar - 20% */}
                    <Grid size={3} >
                        {/* Customer Details */}
                        <Paper sx={{ p: 2, mb: 2, height: calculateInquiryDetailsHeight(), overflowY: "auto" }}>
                            <Typography variant="h6" borderRadius={0.5} gutterBottom sx={{ bgcolor: "#1976d2", color: "#fff", px: 1, py: 0.5 }}>
                                Customer Details
                            </Typography>
                            <Box mt={2} mb={2}>
                                <Typography variant="body2" color="text.secondary">Order No:</Typography>
                                <Typography variant="body1" color="primary" fontWeight="bold">
                                    {orderData?.order_number || "N/A"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mt={2}>Name:</Typography>
                                <Typography variant="body1" color="primary" fontWeight="bold">
                                    {orderData?.customer_name || "N/A"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Mobile No:</Typography>
                                <Typography variant="body1" display="flex" alignItems="center" gap={0.5}>
                                    <PhoneIcon fontSize="small" color="primary" />
                                    {orderData?.mobile_number || "N/A"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Address:</Typography>
                                <Typography variant="body1">{orderData?.address || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Reference:</Typography>
                                <Typography variant="body1">{orderData?.reference_from || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Channel Partner:</Typography>
                                <Typography variant="body1">{orderData?.channel_partner_name || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Handled By:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.handled_by_name || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Branch:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.branch_name || "N/A"}</Typography>
                            </Box>
                            <Typography variant="h6" borderRadius={0.5} gutterBottom sx={{ bgcolor: "#1976d2", color: "#fff", px: 1, py: 0.5 }}>
                                Project Details
                            </Typography>
                            <Box mt={2} mb={2}>
                                <Typography variant="body2" color="text.secondary">Order Date:</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {orderData?.order_date ? moment(orderData.order_date).format("DD-MM-YYYY") : "N/A"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Consumer No:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.consumer_no || "N/A"}</Typography>

                                <Grid container spacing={2} mt={1}>
                                    <Grid size={6}>
                                        <Typography variant="body2" color="text.secondary">Capacity:</Typography>
                                        <Typography variant="body1" fontWeight="bold">{orderData?.capacity || "N/A"}</Typography>
                                    </Grid>
                                    <Grid size={6}>
                                        <Typography variant="body2" color="text.secondary">Order Type:</Typography>
                                        <Chip label={orderData?.order_type_name || "New"} color="success" size="small" />
                                    </Grid>
                                </Grid>

                                <Typography variant="body2" color="text.secondary" mt={2}>Scheme:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.project_scheme_name || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Application:</Typography>
                                <Typography variant="body1">{orderData?.application_no || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Registration Date:</Typography>
                                <Typography variant="body1">
                                    {orderData?.date_of_registration_gov ? moment(orderData.date_of_registration_gov).format("DD-MM-YYYY") : "N/A"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Discom:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.discom_name || "N/A"}</Typography>
                            </Box>
                            <Typography variant="h6" borderRadius={0.5} gutterBottom sx={{ bgcolor: "#1976d2", color: "#fff", px: 1, py: 0.5, }}>
                                Payment Details
                            </Typography>
                            <Box mt={2} mb={2}>
                                <Typography variant="body2" color="text.secondary">Payment Mode:</Typography>
                                <Typography variant="body1" fontWeight="bold">{orderData?.payment_type || orderData?.loan_type_name || "N/A"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Project Cost:</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    Rs. {orderData?.project_cost ? Number(orderData.project_cost).toLocaleString() : "0"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Discount:</Typography>
                                <Typography variant="body1">Rs. {orderData?.discount || "0"}</Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Payable Cost:</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    Rs. {orderData?.project_cost ? (Number(orderData.project_cost) - (Number(orderData.discount) || 0)).toLocaleString() : "0"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Received:</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    Rs. {totalReceivedAmount.toLocaleString()}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" mt={2}>Outstanding:</Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight="bold"
                                    color="white"
                                    bgcolor="error.main"
                                    px={1}
                                    py={0.5}
                                    borderRadius={0.5}
                                    mt={1}
                                >
                                    Rs. {orderData?.project_cost ? ((Number(orderData.project_cost) - (Number(orderData.discount) || 0)) - totalReceivedAmount).toLocaleString() : "0"}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Content Area - 80% */}
                    <Grid size={9}>
                        <Paper sx={{ height: calculateInquiryDetailsHeight(), overflowY: "hidden" }}>
                            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
                                {visibleTabs.includes(0) && <Tab label="Registration" value={0} />}
                                {visibleTabs.includes(1) && <Tab label="Documents" value={1} />}
                                {visibleTabs.includes(2) && <Tab label="Receive Payment" value={2} />}
                                {visibleTabs.includes(3) && <Tab label="Previous Payments" value={3} />}
                                {visibleTabs.includes(4) && <Tab label="Remarks" value={4} />}
                                {visibleTabs.includes(5) && <Tab label="Upload Documents" value={5} />}
                            </Tabs>

                            <TabPanel value={tabValue} index={0}>
                                {visitedTabs.has(0) && <RegistrationForm orderData={orderData} orderId={orderId} />}
                            </TabPanel>

                            <TabPanel value={tabValue} index={1}>
                                {visitedTabs.has(1) && (
                                    <PaginatedTable
                                        columns={documentsColumns}
                                        fetcher={fetchDocuments}
                                        initialPage={1}
                                        initialLimit={10}
                                        showSearch={true}
                                        height={calculatedTableHeight()}
                                        getRowKey={(row) => row.id}
                                    />
                                )}
                            </TabPanel>

                            <TabPanel value={tabValue} index={2}>
                                {visitedTabs.has(2) && <ReceivePaymentForm orderData={orderData} orderId={orderId} onPaymentSaved={refreshPaymentTotal} />}
                            </TabPanel>

                            <TabPanel value={tabValue} index={3}>
                                {visitedTabs.has(3) && <PreviousPaymentsTable orderId={orderId} />}
                            </TabPanel>

                            <TabPanel value={tabValue} index={4}>
                                {visitedTabs.has(4) && <RemarksForm orderData={orderData} orderId={orderId} />}
                            </TabPanel>

                            <TabPanel value={tabValue} index={5}>
                                {visitedTabs.has(5) && <UploadDocumentsForm orderId={orderId} />}
                            </TabPanel>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </ProtectedRoute >
    );
}
