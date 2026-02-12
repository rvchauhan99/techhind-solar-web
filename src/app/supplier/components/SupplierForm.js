"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/common/Select";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import mastersService, { getDefaultState } from "@/services/mastersService";
import { getNextSupplierCode } from "@/services/supplierService";
import {
  validateGSTIN,
  validatePAN,
  validateEmail,
  validatePhone,
  validatePincode,
  formatPhone,
  formatToUpperCase,
  derivePanFromGstin,
} from "@/utils/validators";
import { cn } from "@/lib/utils";

const COMPACT_FORM_SPACING = 2;
const FORM_PADDING = 3;

export default function SupplierForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    supplier_code: "",
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state_id: "",
    pincode: "",
    gstin: "",
    pan_number: "",
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({
    states: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingNextCode, setLoadingNextCode] = useState(false);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        supplier_code: defaultValues.supplier_code || "",
        supplier_name: defaultValues.supplier_name || "",
        contact_person: defaultValues.contact_person || "",
        phone: defaultValues.phone || "",
        email: defaultValues.email || "",
        address: defaultValues.address || "",
        city: defaultValues.city || "",
        state_id: defaultValues.state_id || "",
        pincode: defaultValues.pincode || "",
        gstin: defaultValues.gstin || "",
        pan_number: defaultValues.pan_number || "",
        is_active: defaultValues.is_active !== undefined ? defaultValues.is_active : true,
      });
    }
  }, [defaultValues]);

  useEffect(() => {
    const isAdd = !defaultValues?.id;
    const noCode = !defaultValues?.supplier_code || String(defaultValues?.supplier_code || "").trim() === "";
    if (isAdd && noCode) {
      getNextSupplierCode()
        .then((code) => {
          if (code) setFormData((prev) => ({ ...prev, supplier_code: code }));
        })
        .catch(() => {});
    }
  }, [defaultValues?.id, defaultValues?.supplier_code]);

  const handleGenerateCode = () => {
    setLoadingNextCode(true);
    getNextSupplierCode()
      .then((code) => {
        if (code) setFormData((prev) => ({ ...prev, supplier_code: code }));
      })
      .catch(() => {})
      .finally(() => setLoadingNextCode(false));
  };

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const statesRes = await mastersService.getReferenceOptions("state.model");
        const statesData = statesRes?.result || statesRes?.data || statesRes || [];
        setOptions({
          states: Array.isArray(statesData) ? statesData : [],
        });
      } catch (err) {
        console.error("Failed to load reference options", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const loadDefaultState = async () => {
      if (!defaultValues || Object.keys(defaultValues).length === 0) {
        if (!formData.state_id) {
          try {
            const defaultStateRes = await getDefaultState();
            const defaultState =
              defaultStateRes?.result || defaultStateRes?.data || defaultStateRes;
            if (defaultState?.id) {
              setFormData((prev) => {
                if (!prev.state_id) {
                  return { ...prev, state_id: defaultState.id };
                }
                return prev;
              });
            }
          } catch (err) {
            console.error("Failed to load default state:", err);
          }
        }
      }
    };
    loadDefaultState();
  }, [defaultValues, formData.state_id]);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "supplier_code":
        if (!value || value.trim() === "") error = "Supplier Code is required";
        break;
      case "supplier_name":
        if (!value || value.trim() === "") error = "Supplier Name is required";
        break;
      case "email":
        if (value && value.trim() !== "") {
          const emailValidation = validateEmail(value);
          if (!emailValidation.isValid) error = emailValidation.message;
        }
        break;
      case "phone":
        if (value && value.trim() !== "") {
          const phoneValidation = validatePhone(value);
          if (!phoneValidation.isValid) error = phoneValidation.message;
        }
        break;
      case "gstin":
        if (value && value.trim() !== "") {
          const gstinValidation = validateGSTIN(value);
          if (!gstinValidation.isValid) error = gstinValidation.message;
        }
        break;
      case "pan_number":
        if (value && value.trim() !== "") {
          const panValidation = validatePAN(value);
          if (!panValidation.isValid) error = panValidation.message;
        }
        break;
      case "pincode":
        if (value && value.trim() !== "") {
          const pincodeValidation = validatePincode(value);
          if (!pincodeValidation.isValid) error = pincodeValidation.message;
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === "checkbox" ? checked : value;
    if (type !== "checkbox") {
      if (name === "gstin" || name === "pan_number") {
        processedValue = formatToUpperCase(value);
      } else if (name === "phone") {
        processedValue = value;
      }
    }
    if (name === "gstin") {
      const newGstin = processedValue;
      const isGstinEmpty = !newGstin || newGstin.trim() === "";
      const derivedPan = isGstinEmpty ? null : derivePanFromGstin(newGstin);
      setFormData((prev) => ({
        ...prev,
        gstin: newGstin,
        pan_number: isGstinEmpty ? "" : (derivedPan != null ? derivedPan : prev.pan_number),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: processedValue }));
    }
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (serverError) onClearServerError();
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "phone" && value && value.trim() !== "") {
      const formatted = formatPhone(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    }
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = {};
    if (!formData.supplier_code || formData.supplier_code.trim() === "") {
      validationErrors.supplier_code = "Supplier Code is required";
    }
    if (!formData.supplier_name || formData.supplier_name.trim() === "") {
      validationErrors.supplier_name = "Supplier Name is required";
    }
    if (formData.email && formData.email.trim() !== "") {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) validationErrors.email = emailValidation.message;
    }
    if (formData.phone && formData.phone.trim() !== "") {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) validationErrors.phone = phoneValidation.message;
    }
    if (formData.gstin && formData.gstin.trim() !== "") {
      const gstinValidation = validateGSTIN(formData.gstin);
      if (!gstinValidation.isValid) validationErrors.gstin = gstinValidation.message;
    }
    if (formData.pan_number && formData.pan_number.trim() !== "") {
      const panValidation = validatePAN(formData.pan_number);
      if (!panValidation.isValid) validationErrors.pan_number = panValidation.message;
    }
    if (formData.pincode && formData.pincode.trim() !== "") {
      const pincodeValidation = validatePincode(formData.pincode);
      if (!pincodeValidation.isValid) validationErrors.pincode = pincodeValidation.message;
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const submitData = {
      ...formData,
      supplier_code: formData.supplier_code.trim(),
      supplier_name: formData.supplier_name.trim(),
      contact_person: formData.contact_person?.trim() || "",
      phone: formData.phone?.trim() || "",
      email: formData.email?.trim() || "",
      address: formData.address?.trim() || "",
      city: formData.city?.trim() || "",
      pincode: formData.pincode?.trim() || "",
      gstin: formData.gstin?.trim().toUpperCase() || "",
      pan_number: formData.pan_number?.trim().toUpperCase() || "",
    };
    setErrors({});
    onSubmit(submitData);
  };

  if (loadingOptions) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <FormContainer>
        <div className={cn("p-4 space-y-4")}>
          {serverError && (
            <div
              role="alert"
              className="mb-2 rounded-md bg-destructive/10 text-destructive text-sm p-3 flex items-center justify-between"
            >
              <span>{serverError}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:opacity-80"
                aria-label="Dismiss"
                onClick={onClearServerError}
              >
                ×
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  fullWidth
                  name="supplier_code"
                  label="Supplier Code"
                  value={formData.supplier_code}
                  onChange={handleChange}
                  required
                  error={!!errors.supplier_code}
                  helperText={errors.supplier_code}
                />
                {!defaultValues?.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={loadingNextCode}
                    className="shrink-0 self-end"
                  >
                    {loadingNextCode ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent block" />
                    ) : (
                      "Generate"
                    )}
                  </Button>
                )}
              </div>
            </div>
            <Input
              fullWidth
              name="supplier_name"
              label="Supplier Name"
              value={formData.supplier_name}
              onChange={handleChange}
              required
              error={!!errors.supplier_name}
              helperText={errors.supplier_name}
            />
            <Input
              fullWidth
              name="contact_person"
              label="Contact Person"
              value={formData.contact_person}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="phone"
              label="Phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.phone}
              helperText={errors.phone}
              placeholder="9876543210 or +91 9876543210"
            />
            <Input
              fullWidth
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.email}
              helperText={errors.email}
            />
            <Select
              name="state_id"
              label="State"
              value={formData.state_id}
              onChange={handleChange}
            >
              <MenuItem value="">-- Select --</MenuItem>
              {options.states.map((state) => (
                <MenuItem key={state.id} value={state.id}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
            <Input
              fullWidth
              name="city"
              label="City"
              value={formData.city}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="pincode"
              label="Pincode"
              value={formData.pincode}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.pincode}
              helperText={errors.pincode}
              inputProps={{ maxLength: 6 }}
            />
            <Input
              fullWidth
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleChange}
              multiline
              rows={2}
              className="md:col-span-2"
            />
            <Input
              fullWidth
              name="gstin"
              label="GSTIN"
              value={formData.gstin}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.gstin}
              helperText={errors.gstin}
              inputProps={{ maxLength: 15 }}
              placeholder="27AAAAA0000A1Z5"
            />
            <Input
              fullWidth
              name="pan_number"
              label="PAN Number"
              value={formData.pan_number}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.pan_number}
              helperText={errors.pan_number}
              inputProps={{ maxLength: 10 }}
              placeholder="ABCDE1234F"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supplier-is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="size-4 rounded border-input"
              />
              <label htmlFor="supplier-is_active" className="text-sm font-medium cursor-pointer">
                Is Active
              </label>
            </div>
          </div>
        </div>

        <FormActions>
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" loading={loading} className="min-w-[120px]">
            {defaultValues?.id ? "Update" : "Add"}
          </Button>
        </FormActions>
      </FormContainer>
    </form>
  );
}
