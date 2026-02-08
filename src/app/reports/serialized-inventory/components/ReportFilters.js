"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Button,
  Collapse,
  Typography,
  IconButton,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterListIcon from "@mui/icons-material/FilterList";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import { MenuItem } from "@mui/material";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";

const SERIAL_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ISSUED", label: "Issued" },
  { value: "BLOCKED", label: "Blocked" },
];

export default function ReportFilters({ filters, onFiltersChange, onApply, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  const loadFilterOptions = async () => {
    setLoading(true);
    try {
      const [productsRes, warehousesRes, productTypesRes] = await Promise.all([
        productService.getProducts({ limit: 1000 }),
        companyService.listWarehouses(),
        mastersService.getReferenceOptions("product_type.model"),
      ]);

      const productsData = productsRes?.result?.data || productsRes?.data || [];
      const warehousesData = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
      const productTypesData = productTypesRes?.result || productTypesRes?.data || productTypesRes || [];

      setProducts(Array.isArray(productsData) ? productsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      setProductTypes(Array.isArray(productTypesData) ? productTypesData : []);
    } catch (err) {
      console.error("Failed to load filter options", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...localFilters, [name]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleApply = () => {
    onApply?.(localFilters);
  };

  const handleClear = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
    onClear?.();
  };

  const hasActiveFilters = Object.values(localFilters).some(
    (value) => value !== null && value !== undefined && value !== ""
  );

  return (
    <Paper sx={{ mb: 2, p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: expanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterListIcon />
          <Typography variant="h6">Filters</Typography>
          {hasActiveFilters && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Active
            </Typography>
          )}
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={2}>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Select
              name="product_id"
              label="Product"
              value={localFilters.product_id || ""}
              onChange={(e) => handleFilterChange("product_id", e.target.value || null)}
            >
              <MenuItem value="">All Products</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.product_name}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <Select
              name="warehouse_id"
              label="Warehouse"
              value={localFilters.warehouse_id || ""}
              onChange={(e) => handleFilterChange("warehouse_id", e.target.value || null)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <Select
              name="product_type_id"
              label="Product Type"
              value={localFilters.product_type_id || ""}
              onChange={(e) => handleFilterChange("product_type_id", e.target.value || null)}
            >
              <MenuItem value="">All Product Types</MenuItem>
              {productTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <Select
              multiple
              name="status"
              label="Status"
              value={localFilters.status || []}
              onChange={(e) => {
                const value = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
                handleFilterChange("status", value.length > 0 ? value : null);
              }}
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return "All Statuses";
                return selected
                  .map((s) => SERIAL_STATUSES.find((st) => st.value === s)?.label || s)
                  .join(", ");
              }}
            >
              {SERIAL_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <Input
              name="serial_number"
              label="Serial Number"
              value={localFilters.serial_number || ""}
              onChange={(e) => handleFilterChange("serial_number", e.target.value || null)}
              placeholder="Search by serial number..."
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <DateField
              name="start_date"
              label="Inward Date From"
              value={localFilters.start_date || ""}
              onChange={(e) => handleFilterChange("start_date", e.target.value || null)}
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <DateField
              name="end_date"
              label="Inward Date To"
              value={localFilters.end_date || ""}
              onChange={(e) => handleFilterChange("end_date", e.target.value || null)}
              minDate={localFilters.start_date || undefined}
            />
          </Grid>

          <Grid item size={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleClear} disabled={!hasActiveFilters}>
                Clear Filters
              </Button>
              <Button variant="contained" onClick={handleApply}>
                Apply Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
}
