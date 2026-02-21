"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    Alert,
    Typography,
    InputLabel,
    Select,
    MenuItem,
    Radio,
    RadioGroup,
    FormControlLabel,
    Grid,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Divider,
    Snackbar,
} from "@mui/material";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import { Button as ActionButton } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import siteVisitService from "@/services/siteVisitService";
import userService from "@/services/userMasterService";
import billOfMaterialService from "@/services/billOfMaterialService";
import productService from "@/services/productService";
import mastersService from "@/services/mastersService";
import { useAuth } from "@/hooks/useAuth";

export default function SiteSurveyForm({
    siteVisitId = null,
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => { },
    onCancel = null,
}) {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        site_visit_id: siteVisitId || "",
        survey_date: "",
        surveyor_id: user?.id || "",
        type_of_roof: "",
        remarks: "",
        height_of_structure: "",
        has_shadow_object: false,
        bom_detail: [],
    });

    const [files, setFiles] = useState({
        building_front_photo: null,
        roof_front_left_photo: null,
        roof_front_right_photo: null,
        roof_rear_left_photo: null,
        roof_rear_right_photo: null,
        drawing_photo: null,
        shadow_object_photo: null,
    });

    const [roofTypes, setRoofTypes] = useState([]);
    const [loadingRoofTypes, setLoadingRoofTypes] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errors, setErrors] = useState({});

    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info' // 'error', 'warning', 'info', 'success'
    });

    // BOM related state
    const [selectedBomId, setSelectedBomId] = useState("");
    const [boms, setBoms] = useState([]);
    const [loadingBoms, setLoadingBoms] = useState(false);

    // Product selection state
    const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [productTypes, setProductTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loadingProductTypes, setLoadingProductTypes] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Product table data with full product details
    const [productTableData, setProductTableData] = useState([]);

    // All products with their details (for lookup)
    const [allProductsMap, setAllProductsMap] = useState({});
    const [allProductTypesMap, setAllProductTypesMap] = useState({});
    const [allMeasurementUnitsMap, setAllMeasurementUnitsMap] = useState({});

    useEffect(() => {
        if (siteVisitId) {
            setFormData((prev) => ({ ...prev, site_visit_id: siteVisitId }));
        }
        if (user?.id) {
            setFormData((prev) => ({ ...prev, surveyor_id: user.id }));
        }
        fetchRoofTypes();
        fetchUsers();
        fetchBoms();
        fetchProductTypes();
        fetchProducts();
        fetchMeasurementUnits();
    }, [siteVisitId, user]);

    const fetchRoofTypes = async () => {
        setLoadingRoofTypes(true);
        try {
            const response = await siteVisitService.getRoofTypes();
            const result = response.result || [];
            setRoofTypes(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Error fetching roof types:", error);
            setRoofTypes([]);
        } finally {
            setLoadingRoofTypes(false);
        }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await userService.listUserMasters();
            const data = response?.data || response?.result?.data || response?.rows || [];
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching users:", error);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchBoms = async () => {
        setLoadingBoms(true);
        try {
            const response = await billOfMaterialService.getBillOfMaterials();
            const data = response?.data || response?.result?.data || response?.rows || [];
            setBoms(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching BOMs:", error);
            setBoms([]);
        } finally {
            setLoadingBoms(false);
        }
    };

    const fetchProductTypes = async () => {
        setLoadingProductTypes(true);
        try {
            const response = await mastersService.getList('product_type.model');
            const data = response?.data || response?.result?.data || response?.rows || [];
            setProductTypes(Array.isArray(data) ? data : []);

            // Create a map for quick lookup
            const typeMap = {};
            data.forEach(type => {
                typeMap[type.id] = type;
            });
            setAllProductTypesMap(typeMap);
        } catch (error) {
            console.error("Error fetching product types:", error);
            setProductTypes([]);
        } finally {
            setLoadingProductTypes(false);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const response = await productService.getProducts();
            const data = response?.data || response?.result?.data || response?.rows || [];
            setProducts(Array.isArray(data) ? data : []);

            // Create a map for quick lookup
            const productMap = {};
            data.forEach(product => {
                productMap[product.id] = product;
            });
            setAllProductsMap(productMap);
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchMeasurementUnits = async () => {
        try {
            const response = await mastersService.getList('measurement_unit.model');
            const data = response?.data || response?.result?.data || response?.rows || [];

            // Create a map for quick lookup
            const unitMap = {};
            data.forEach(unit => {
                unitMap[unit.id] = unit;
            });
            setAllMeasurementUnitsMap(unitMap);
        } catch (error) {
            console.error("Error fetching measurement units:", error);
        }
    };

    // Filter products when product type changes
    useEffect(() => {
        if (selectedProductTypeId) {
            const filtered = products.filter(p => p.product_type_id === parseInt(selectedProductTypeId));
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts([]);
        }
        setSelectedProductId(""); // Reset product selection when type changes
    }, [selectedProductTypeId, products]);

    // Handle BOM selection and populate table
    const handleBomSelect = async () => {
        if (!selectedBomId) return;

        try {
            const response = await billOfMaterialService.getBillOfMaterialById(selectedBomId);
            const bomData = response?.data || response?.result || response;

            if (bomData && bomData.bom_detail && Array.isArray(bomData.bom_detail)) {
                const newTableData = bomData.bom_detail.map(item => {
                    const product = allProductsMap[item.product_id];
                    if (!product) return null;

                    return {
                        product_id: item.product_id,
                        product_name: product.product_name,
                        product_capacity: product.capacity || null,
                        product_type_name: allProductTypesMap[product.product_type_id]?.name || '',
                        measurement_unit: allMeasurementUnitsMap[product.measurement_unit_id]?.unit || '',
                        quantity: item.quantity || 0,
                        remark: ''
                    };
                }).filter(item => item !== null);

                setProductTableData(newTableData);
                setSelectedBomId("");
            }
        } catch (error) {
            console.error("Error fetching BOM details:", error);
            setSnackbar({
                open: true,
                message: 'Failed to load BOM details',
                severity: 'error'
            });
        }
    };

    // Handle adding a product to the table
    const handleAddProduct = () => {
        if (!selectedProductId) return;

        const product = allProductsMap[selectedProductId];
        if (!product) return;

        // Check if product already exists in table
        const existingIndex = productTableData.findIndex(item => item.product_id === product.id);
        if (existingIndex !== -1) {
            setSnackbar({
                open: true,
                message: 'This product is already in the table',
                severity: 'warning'
            });
            return;
        }

        const newProduct = {
            product_id: product.id,
            product_name: product.product_name,
            product_capacity: product.capacity || null,
            product_type_name: allProductTypesMap[product.product_type_id]?.name || '',
            measurement_unit: allMeasurementUnitsMap[product.measurement_unit_id]?.unit || '',
            quantity: 0,
            remark: ''
        };

        setProductTableData([...productTableData, newProduct]);
        setSelectedProductId("");
        setSelectedProductTypeId("");
    };

    // Handle quantity change in table
    const handleQuantityChange = (index, value) => {
        const newData = [...productTableData];
        newData[index].quantity = value;
        setProductTableData(newData);
    };

    // Handle remark change in table
    const handleRemarkChange = (index, value) => {
        const newData = [...productTableData];
        newData[index].remark = value;
        setProductTableData(newData);
    };

    // Handle delete row from table
    const handleDeleteRow = (index) => {
        const newData = productTableData.filter((_, i) => i !== index);
        setProductTableData(newData);
    };

    // Update formData.bom_detail whenever productTableData changes
    useEffect(() => {
        const bomDetail = productTableData.map(item => ({
            product_id: item.product_id,
            quantity: parseFloat(item.quantity) || 0,
            remark: item.remark || ''
        }));
        setFormData(prev => ({ ...prev, bom_detail: bomDetail }));
    }, [productTableData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (serverError) {
            onClearServerError();
        }
    };

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0];
        setFiles((prev) => ({ ...prev, [fieldName]: file }));
        if (errors[fieldName]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate required fields (photos are now optional)
        const validationErrors = {};

        if (!formData.site_visit_id) {
            validationErrors.site_visit_id = "Site visit is required";
        }
        if (!formData.survey_date) {
            validationErrors.survey_date = "Survey date is required";
        }
        if (!formData.surveyor_id) {
            validationErrors.surveyor_id = "Surveyor is required";
        }
        if (!formData.type_of_roof) {
            validationErrors.type_of_roof = "Type of roof is required";
        }

        // All photo uploads are now optional - no validation needed

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        onSubmit(formData, files);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
            {serverError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={onClearServerError}>
                    {serverError}
                </Alert>
            )}

            <Grid container spacing={2}>
                {/* Survey Date - Required */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <DateField
                        name="survey_date"
                        label="Survey Date"
                        value={formData.survey_date}
                        onChange={handleChange}
                        required
                        error={!!errors.survey_date}
                        helperText={errors.survey_date}
                    />
                </Grid>

                {/* Surveyor Selection */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <AutocompleteField
                        label="Surveyor Name *"
                        placeholder="Type to search..."
                        options={users}
                        getOptionLabel={(u) => (u ? `${u.name ?? ""} (${u.email ?? ""})`.trim() || String(u?.id ?? "") : "")}
                        value={users.find((u) => u.id === parseInt(formData.surveyor_id)) || (formData.surveyor_id ? { id: formData.surveyor_id } : null)}
                        onChange={(e, newValue) => handleChange({ target: { name: "surveyor_id", value: newValue?.id ?? "" } })}
                        required
                        error={!!errors.surveyor_id}
                        helperText={errors.surveyor_id}
                        loading={loadingUsers}
                    />
                </Grid>

                {/* Type of Roof - Required */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <AutocompleteField
                        label="Type of Roof *"
                        placeholder="Type to search..."
                        options={roofTypes.map((t) => ({ id: t, label: t }))}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.type_of_roof ? { id: formData.type_of_roof, label: formData.type_of_roof } : null}
                        onChange={(e, newValue) => handleChange({ target: { name: "type_of_roof", value: newValue?.id ?? "" } })}
                        required
                        error={!!errors.type_of_roof}
                        helperText={errors.type_of_roof}
                        loading={loadingRoofTypes}
                    />
                </Grid>

                {/* Height of Structure */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Input
                        fullWidth
                        name="height_of_structure"
                        label="Height of Structure"
                        value={formData.height_of_structure}
                        onChange={handleChange}
                    />
                </Grid>

                {/* Remarks */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Input
                        fullWidth
                        name="remarks"
                        label="Remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        multiline
                        rows={1}
                        className="resize-y"
                    />
                </Grid>

                {/* Divider for Photo Section */}
                <Grid size={12}>
                    <Divider sx={{ mt: 1 }} />
                </Grid>

                {/* Photo Upload Section */}
                <Grid size={12}>
                    <Typography variant="h6" sx={{ mt: 0, mb: 1 }}>
                        Upload Photos
                    </Typography>
                </Grid>

                {/* Building Front Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Building Front Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "building_front_photo")}
                                style={{ display: "none" }}
                                id="building_front_photo"
                            />
                            <label htmlFor="building_front_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.building_front_photo ? files.building_front_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Roof Front-Left Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Roof Front-Left Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "roof_front_left_photo")}
                                style={{ display: "none" }}
                                id="roof_front_left_photo"
                            />
                            <label htmlFor="roof_front_left_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.roof_front_left_photo ? files.roof_front_left_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Roof Front-Right Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Roof Front-Right Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "roof_front_right_photo")}
                                style={{ display: "none" }}
                                id="roof_front_right_photo"
                            />
                            <label htmlFor="roof_front_right_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.roof_front_right_photo ? files.roof_front_right_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Roof Rear-Left Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Roof Rear-Left Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "roof_rear_left_photo")}
                                style={{ display: "none" }}
                                id="roof_rear_left_photo"
                            />
                            <label htmlFor="roof_rear_left_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.roof_rear_left_photo ? files.roof_rear_left_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Roof Rear-Right Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Roof Rear-Right Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "roof_rear_right_photo")}
                                style={{ display: "none" }}
                                id="roof_rear_right_photo"
                            />
                            <label htmlFor="roof_rear_right_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.roof_rear_right_photo ? files.roof_rear_right_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Drawing Photo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink>Drawing Photo</InputLabel>
                        <Box sx={{ mt: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "drawing_photo")}
                                style={{ display: "none" }}
                                id="drawing_photo"
                            />
                            <label htmlFor="drawing_photo">
                                <Button variant="outlined" component="span" fullWidth>
                                    {files.drawing_photo ? files.drawing_photo.name : "Choose File"}
                                </Button>
                            </label>
                        </Box>
                    </FormControl>
                </Grid>

                {/* Is There Any Shadow Object? */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl component="fieldset" fullWidth>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                            Is There Any Shadow Object?
                        </Typography>
                        <RadioGroup
                            row
                            name="has_shadow_object"
                            value={formData.has_shadow_object ? "Yes" : "No"}
                            onChange={(e) => {
                                const value = e.target.value === "Yes";
                                setFormData((prev) => ({
                                    ...prev,
                                    has_shadow_object: value,
                                }));
                                // Clear shadow object photo if user selects "No"
                                if (!value) {
                                    setFiles((prev) => ({ ...prev, shadow_object_photo: null }));
                                }
                            }}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                            <FormControlLabel value="No" control={<Radio />} label="No" />
                        </RadioGroup>
                    </FormControl>
                </Grid>

                {/* Shadow Object Photo - Conditional */}
                {formData.has_shadow_object && (
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Shadow Object Photo</InputLabel>
                            <Box sx={{ mt: 2 }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, "shadow_object_photo")}
                                    style={{ display: "none" }}
                                    id="shadow_object_photo"
                                />
                                <label htmlFor="shadow_object_photo">
                                    <Button variant="outlined" component="span" fullWidth>
                                        {files.shadow_object_photo ? files.shadow_object_photo.name : "Choose File"}
                                    </Button>
                                </label>
                            </Box>
                        </FormControl>
                    </Grid>
                )}

                {/* Divider for BOM Section */}
                <Grid size={12}>
                    <Divider sx={{ mt: 1 }} />
                </Grid>

                {/* BOM Selection */}
                <Grid size={{ xs: 12, md: 11 }}>
                    <AutocompleteField
                        label="Bill of Material"
                        placeholder="Type to search..."
                        options={boms}
                        getOptionLabel={(b) => b?.name ?? String(b?.id ?? "")}
                        value={boms.find((b) => b.id === parseInt(selectedBomId)) || (selectedBomId ? { id: selectedBomId } : null)}
                        onChange={(e, newValue) => setSelectedBomId(newValue?.id ?? "")}
                        loading={loadingBoms}
                    />
                </Grid>

                {/* BOM Select Button */}
                <Grid size={{ xs: 12, md: 1 }}>
                    <IconButton
                        color="primary"
                        onClick={handleBomSelect}
                        disabled={!selectedBomId}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&:disabled': { bgcolor: 'grey.300' },
                            width: '100%',
                            height: '40px',
                            borderRadius: 1
                        }}
                    >
                        <CheckCircleIcon />
                    </IconButton>
                </Grid>

                {/* Product Type Selection */}
                <Grid size={{ xs: 12, md: 5.5 }}>
                    <AutocompleteField
                        label="Products Type"
                        placeholder="Type to search..."
                        options={productTypes}
                        getOptionLabel={(t) => t?.name ?? String(t?.id ?? "")}
                        value={productTypes.find((t) => t.id === parseInt(selectedProductTypeId)) || (selectedProductTypeId ? { id: selectedProductTypeId } : null)}
                        onChange={(e, newValue) => setSelectedProductTypeId(newValue?.id ?? "")}
                        loading={loadingProductTypes}
                    />
                </Grid>

                {/* Product Selection */}
                <Grid size={{ xs: 12, md: 5.5 }}>
                    <AutocompleteField
                        label="Products"
                        placeholder="Type to search..."
                        options={filteredProducts}
                        getOptionLabel={(p) => p?.product_name ?? String(p?.id ?? "")}
                        value={filteredProducts.find((p) => p.id === parseInt(selectedProductId)) || (selectedProductId ? { id: selectedProductId } : null)}
                        onChange={(e, newValue) => setSelectedProductId(newValue?.id ?? "")}
                        disabled={!selectedProductTypeId}
                    />
                </Grid>

                {/* Add Product Button */}
                <Grid size={{ xs: 12, md: 1 }}>
                    <IconButton
                        color="primary"
                        onClick={handleAddProduct}
                        disabled={!selectedProductId}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&:disabled': { bgcolor: 'grey.300' },
                            width: '100%',
                            height: '40px',
                            borderRadius: 1
                        }}
                    >
                        <CheckCircleIcon />
                    </IconButton>
                </Grid>

                {/* Product Table */}
                <Grid size={12}>
                    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Type</strong></TableCell>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Unit</strong></TableCell>
                                    <TableCell><strong>Quantity</strong></TableCell>
                                    <TableCell><strong>Remark</strong></TableCell>
                                    <TableCell align="center"><strong>Action</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {productTableData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                No products added yet
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    productTableData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.product_type_name}</TableCell>
                                            <TableCell>
                                                {row.product_capacity
                                                    ? `${row.product_name} (${row.product_capacity})`
                                                    : row.product_name}
                                            </TableCell>
                                            <TableCell>{row.measurement_unit}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={row.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    size="small"
                                                    inputProps={{ min: 0 }}
                                                    sx={{ width: '120px' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={row.remark}
                                                    onChange={(e) => handleRemarkChange(index, e.target.value)}
                                                    size="small"
                                                    multiline
                                                    rows={1}
                                                    sx={{ width: '200px' }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteRow(index)}
                                                    size="small"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {/* Form Actions */}
                <Grid size={12}>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 3 }}>
                        {onCancel && (
                            <ActionButton type="button" variant="outline" onClick={onCancel} disabled={loading}>
                                Cancel
                            </ActionButton>
                        )}
                        <LoadingButton type="submit" loading={loading} className="min-w-[120px]">
                            Add
                        </LoadingButton>
                    </Box>
                </Grid>
            </Grid>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
