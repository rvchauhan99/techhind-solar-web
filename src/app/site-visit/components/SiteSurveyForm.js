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
import DateField from "@/components/common/DateField";
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
                    <FormControl fullWidth required error={!!errors.surveyor_id}>
                        <InputLabel>Surveyor Name</InputLabel>
                        {loadingUsers ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Loading users...</Typography>
                            </Box>
                        ) : (
                            <Select
                                name="surveyor_id"
                                value={formData.surveyor_id}
                                onChange={handleChange}
                                label="Surveyor Name"
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                        {errors.surveyor_id && (
                            <FormHelperText error>{errors.surveyor_id}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>

                {/* Type of Roof - Required */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth required error={!!errors.type_of_roof}>
                        <InputLabel>Type of Roof</InputLabel>
                        {loadingRoofTypes ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Loading roof types...</Typography>
                            </Box>
                        ) : (
                            <Select
                                name="type_of_roof"
                                value={formData.type_of_roof}
                                onChange={handleChange}
                                label="Type of Roof"
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {roofTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                        {errors.type_of_roof && (
                            <FormHelperText error>{errors.type_of_roof}</FormHelperText>
                        )}
                    </FormControl>
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
                        InputProps={{
                            sx: {
                                '& textarea': {
                                    resize: 'vertical'
                                }
                            }
                        }}
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
                    <FormControl fullWidth>
                        <InputLabel>Bill of Material</InputLabel>
                        {loadingBoms ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Loading BOMs...</Typography>
                            </Box>
                        ) : (
                            <Select
                                value={selectedBomId}
                                onChange={(e) => setSelectedBomId(e.target.value)}
                                label="Bill of Material"
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {boms.map((bom) => (
                                    <MenuItem key={bom.id} value={bom.id}>
                                        {bom.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>
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
                    <FormControl fullWidth>
                        <InputLabel>Products Type</InputLabel>
                        {loadingProductTypes ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Loading product types...</Typography>
                            </Box>
                        ) : (
                            <Select
                                value={selectedProductTypeId}
                                onChange={(e) => setSelectedProductTypeId(e.target.value)}
                                label="Products Type"
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {productTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>
                </Grid>

                {/* Product Selection */}
                <Grid size={{ xs: 12, md: 5.5 }}>
                    <FormControl fullWidth>
                        <InputLabel>Products</InputLabel>
                        <Select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            label="Products"
                            disabled={!selectedProductTypeId}
                            sx={{
                                '&.Mui-disabled': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                }
                            }}
                        >
                            <MenuItem value="">-- Select --</MenuItem>
                            {filteredProducts.map((product) => (
                                <MenuItem key={product.id} value={product.id}>
                                    {product.product_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                            <Button variant="outlined" onClick={onCancel} disabled={loading}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : "Add"}
                        </Button>
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
