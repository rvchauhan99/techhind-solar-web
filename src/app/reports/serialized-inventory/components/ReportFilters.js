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
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import DateField from "@/components/common/DateField";
import productService from "@/services/productService";
import companyService from "@/services/companyService";

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
      const [productsRes, warehousesRes] = await Promise.all([
        productService.getProducts({ limit: 1000 }),
        companyService.listWarehouses(),
      ]);

      const productsData = productsRes?.result?.data || productsRes?.data || [];
      const warehousesData = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];

      setProducts(Array.isArray(productsData) ? productsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
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
            <AutocompleteField
              name="product_id"
              label="Product"
              options={products}
              getOptionLabel={(p) => p?.product_name ?? p?.name ?? ""}
              value={localFilters.product_id ? { id: localFilters.product_id } : null}
              onChange={(e, newValue) => handleFilterChange("product_id", newValue?.id ?? null)}
              placeholder="All Products"
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <AutocompleteField
              name="warehouse_id"
              label="Warehouse"
              options={warehouses}
              getOptionLabel={(w) => w?.name ?? w?.label ?? ""}
              value={localFilters.warehouse_id ? { id: localFilters.warehouse_id } : null}
              onChange={(e, newValue) => handleFilterChange("warehouse_id", newValue?.id ?? null)}
              placeholder="All Warehouses"
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <AutocompleteField
              name="product_type_id"
              label="Product Type"
              asyncLoadOptions={(q) => getReferenceOptionsSearch("product_type.model", { q, limit: 20 })}
              referenceModel="product_type.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={localFilters.product_type_id ? { id: localFilters.product_type_id } : null}
              onChange={(e, newValue) => handleFilterChange("product_type_id", newValue?.id ?? null)}
              placeholder="All Product Types"
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 3 }}>
            <AutocompleteField
              name="status"
              label="Status"
              multiple
              options={SERIAL_STATUSES}
              getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
              value={(Array.isArray(localFilters.status) ? localFilters.status : []).map((v) => SERIAL_STATUSES.find((s) => s.value === v)).filter(Boolean)}
              onChange={(e, newValue) => handleFilterChange("status", newValue?.length ? newValue.map((o) => o.value) : null)}
              placeholder="All Statuses"
            />
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
