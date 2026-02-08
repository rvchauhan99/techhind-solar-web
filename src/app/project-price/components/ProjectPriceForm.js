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
  Divider,
  Alert,
} from "@mui/material";
import mastersService, { getDefaultState } from "@/services/mastersService";
import projectPriceService from "@/services/projectPriceService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";

export default function ProjectPriceForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => { },
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    state_id: "",
    project_for_id: "",
    order_type_id: "",
    bill_of_material_id: "",
    project_capacity: "",
    price_per_kwa: "",
    total_project_value: "",
    state_subsidy: "",
    structure_amount: "",
    netmeter_amount: "",
    subsidy_amount: "",
    system_warranty: "",
    is_locked: false,
  });

  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({
    states: [],
    projectSchemes: [],
    orderTypes: [],
    billOfMaterials: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const fetchbillOfMaterials = async () => {
      setLoadingOptions(true)
      try {
        const billOfMaterialsOpt = await projectPriceService.getAllBom();
        console.log(billOfMaterialsOpt.result)
        setOptions((prev) => ({
          ...prev,
          billOfMaterials: billOfMaterialsOpt.result || [],
        }));
      } catch (error) {
        console.error("Error fetching rating options:", error);
        setOptions((prev) => ({ ...prev, billOfMaterials: [] }));
      } finally {
        setLoadingOptions(false)
      }
    };
    fetchbillOfMaterials();
  }, []);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        state_id: defaultValues.state_id ?? "",
        project_for_id: defaultValues.project_for_id ?? "",
        order_type_id: defaultValues.order_type_id ?? "",
        bill_of_material_id: defaultValues.bill_of_material_id ?? "",
        project_capacity: defaultValues.project_capacity ?? "",
        price_per_kwa: defaultValues.price_per_kwa ?? "",
        total_project_value: defaultValues.total_project_value ?? "",
        state_subsidy: defaultValues.state_subsidy ?? "",
        structure_amount: defaultValues.structure_amount ?? "",
        netmeter_amount: defaultValues.netmeter_amount ?? "",
        subsidy_amount: defaultValues.subsidy_amount ?? "",
        system_warranty: defaultValues.system_warranty ?? "",
        is_locked:
          defaultValues.is_locked !== undefined ? defaultValues.is_locked : false,
      });
    }
  }, [defaultValues]);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [statesRes, schemesRes, orderTypesRes] = await Promise.all([
          mastersService.getReferenceOptions("state.model"),
          mastersService.getReferenceOptions("project_scheme.model"),
          mastersService.getReferenceOptions("order_type.model"),
        ]);
        console.log(statesRes, schemesRes, orderTypesRes)
        const normalize = (res) => res?.result || res?.data || res || [];

        setOptions((vv) => ({
          ...vv,
          states: Array.isArray(normalize(statesRes)) ? normalize(statesRes) : [],
          projectSchemes: Array.isArray(normalize(schemesRes))
            ? normalize(schemesRes)
            : [],
          orderTypes: Array.isArray(normalize(orderTypesRes))
            ? normalize(orderTypesRes)
            : [],
        }));
      } catch (err) {
        console.error("Failed to load reference options", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  // Auto-populate default state for new project prices
  useEffect(() => {
    const loadDefaultState = async () => {
      // Only auto-populate if no defaultValues (new project price) and state_id is not set
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) {
      onClearServerError();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!formData.state_id) validationErrors.state_id = "State is required";
    if (!formData.project_for_id)
      validationErrors.project_for_id = "Project For is required";
    if (!formData.order_type_id)
      validationErrors.order_type_id = "Order Type is required";
    if (!formData.bill_of_material_id)
      validationErrors.bill_of_material_id = "Bill Of Material is required";
    if (!formData.project_capacity)
      validationErrors.project_capacity = "Project Capacity is required";
    if (!formData.total_project_value)
      validationErrors.total_project_value = "Total Project Value is required";
    if (!formData.price_per_kwa)
      validationErrors.price_per_kwa = "Price per KWA is required";

    if (
      formData.project_capacity &&
      Number(formData.project_capacity) <= 0
    ) {
      validationErrors.project_capacity =
        "Project Capacity must be greater than 0";
    }
    if (
      formData.total_project_value &&
      Number(formData.total_project_value) <= 0
    ) {
      validationErrors.total_project_value =
        "Total Project Value must be greater than 0";
    }
    if (
      formData.price_per_kwa &&
      Number(formData.price_per_kwa) <= 0
    ) {
      validationErrors.price_per_kwa =
        "Price per KWA must be greater than 0";
    }
    [
      "state_subsidy",
      "structure_amount",
      "netmeter_amount",
      "subsidy_amount",
    ].forEach((field) => {
      if (
        formData[field] !== "" &&
        formData[field] !== null &&
        Number(formData[field]) < 0
      ) {
        validationErrors[field] = "Value cannot be negative";
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const toNumber = (v) =>
      v === "" || v === null || v === undefined ? null : Number(v);

    const payload = {
      state_id: Number(formData.state_id),
      project_for_id: Number(formData.project_for_id),
      order_type_id: Number(formData.order_type_id),
      bill_of_material_id: formData.bill_of_material_id
        ? Number(formData.bill_of_material_id)
        : null,
      project_capacity: Number(formData.project_capacity),
      total_project_value: Number(formData.total_project_value),
      price_per_kwa: Number(formData.price_per_kwa),
      state_subsidy: toNumber(formData.state_subsidy),
      structure_amount: toNumber(formData.structure_amount),
      netmeter_amount: toNumber(formData.netmeter_amount),
      subsidy_amount: toNumber(formData.subsidy_amount),
      system_warranty: formData.system_warranty || null,
      is_locked: !!formData.is_locked,
    };

    onSubmit(payload);
  };

  const handleBomChange = function (dataValue) {
    let singleBom = options.billOfMaterials.find((d) => d.id == dataValue);
    if (singleBom.bom_detail.length > 0) {
      singleBom.bom_detail.forEach(function (dd) {
        if (dd?.product?.product_type?.name?.toLowerCase() == 'panel') {
          let bomQty = (isNaN(dd.quantity) || !dd.quantity) ? 1 : parseFloat(dd.quantity)
          setFormData((prev) => ({
            ...prev,
            project_capacity: (parseFloat(dd?.product?.capacity ?? 0) * bomQty) / 1000
          }));
        }
      })
    }
  }

  return (
    <FormContainer>
      <Box component="form" id="project-price-form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        {serverError && (
          <Box mb={1}>
            <Alert severity="error">{serverError}</Alert>
          </Box>
        )}

        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
          <Typography variant="subtitle1" fontWeight={600}>Basic Details</Typography>
        </Box>
        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid item size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Select
              name="state_id"
              label="State"
              value={formData.state_id}
              onChange={handleChange}
              required
              disabled={loadingOptions}
              error={!!errors.state_id}
              helperText={errors.state_id}
            >
              {options.states.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Select
              name="project_for_id"
              label="Project For"
              value={formData.project_for_id}
              onChange={handleChange}
              required
              error={!!errors.project_for_id}
              helperText={errors.project_for_id}
              disabled={loadingOptions}
            >
              {options.projectSchemes.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Select
              name="order_type_id"
              label="Order Type"
              value={formData.order_type_id}
              onChange={handleChange}
              required
              error={!!errors.order_type_id}
              helperText={errors.order_type_id}
              disabled={loadingOptions}
            >
              {options.orderTypes.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Select
              name="bill_of_material_id"
              label="Bill Of Material"
              value={formData.bill_of_material_id}
              onChange={(e) => {
                handleChange(e);
                handleBomChange(e.target.value);
              }}
              required
              error={!!errors.bill_of_material_id}
              helperText={errors.bill_of_material_id}
              disabled={loadingOptions}
            >
              <MenuItem value="">None</MenuItem>
              {options.billOfMaterials.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.bom_name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Project Capacity (kW)"
              name="project_capacity"
              value={formData.project_capacity}
              onChange={handleChange}
              error={!!errors.project_capacity}
              helperText={errors.project_capacity}
              required
            />
          </Grid>
        </Grid>

        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
          <Typography variant="subtitle1" fontWeight={600}>Financial Details</Typography>
        </Box>
        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Price per KWA"
              name="price_per_kwa"
              value={formData.price_per_kwa}
              error={!!errors.price_per_kwa}
              helperText={errors.price_per_kwa}
              disabled={Number(formData.project_capacity) <= 0}
              required
              slotProps={{
                input: {
                  sx: {
                    '&.Mui-disabled': { bgcolor: 'grey.300' }
                  }
                }
              }}
              onChange={(e) => {
                handleChange(e);
                let totalProjectValue = (Number(e.target.value) * Number(formData.project_capacity)).toFixed(2)
                setFormData({
                  ...formData,
                  price_per_kwa: Number(e.target.value),
                  total_project_value: Number(totalProjectValue)
                })
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Total Project Value"
              name="total_project_value"
              value={formData.total_project_value}
              error={!!errors.total_project_value}
              helperText={errors.total_project_value}
              disabled={Number(formData.project_capacity) <= 0}
              required
              slotProps={{
                input: {
                  sx: {
                    '&.Mui-disabled': { bgcolor: 'grey.300' }
                  }
                }
              }}
              onChange={(e) => {
                // handleChange(e);
                let pricePerKwa = (Number(e.target.value) / Number(formData.project_capacity)).toFixed(2)
                setFormData({
                  ...formData,
                  total_project_value: Number(e.target.value),
                  price_per_kwa: Number(pricePerKwa)
                })
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="State Subsidy"
              name="state_subsidy"
              value={formData.state_subsidy}
              onChange={handleChange}
              error={!!errors.state_subsidy}
              helperText={errors.state_subsidy}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Structure Amount"
              name="structure_amount"
              value={formData.structure_amount}
              onChange={handleChange}
              error={!!errors.structure_amount}
              helperText={errors.structure_amount}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Netmeter Amount"
              name="netmeter_amount"
              value={formData.netmeter_amount}
              onChange={handleChange}
              error={!!errors.netmeter_amount}
              helperText={errors.netmeter_amount}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Subsidy Amount"
              name="subsidy_amount"
              value={formData.subsidy_amount}
              onChange={handleChange}
              error={!!errors.subsidy_amount}
              helperText={errors.subsidy_amount}
            />
          </Grid>
        </Grid>

        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
          <Typography variant="subtitle1" fontWeight={600}>Additional Details</Typography>
        </Box>
        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid item xs={12} sm={6} md={4}>
            <Input
              fullWidth
              size="small"
              label="System Warranty"
              name="system_warranty"
              value={formData.system_warranty}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="is_locked"
                  checked={formData.is_locked}
                  onChange={handleChange}
                />
              }
              label="Is Locked"
            />
          </Grid>
        </Grid>

      </Box>

      <FormActions>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          form="project-price-form"
          variant="contained"
          disabled={loading || loadingOptions}
        >
          {loading ? "Saving..." : "Submit"}
        </Button>
      </FormActions>
    </FormContainer>
  );
}
