"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import Input from "@/components/common/Input";
import { validatePincode } from "@/utils/validators";

export default function ShipToForm({
  clientId,
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    ship_to_name: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    landmark: "",
    country: "India",
    contact_person: "",
    phone: "",
    email: "",
    is_default: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        ship_to_name: defaultValues.ship_to_name || "",
        address: defaultValues.address || "",
        city: defaultValues.city || "",
        district: defaultValues.district || "",
        state: defaultValues.state || "",
        pincode: defaultValues.pincode || "",
        landmark: defaultValues.landmark || "",
        country: defaultValues.country || "India",
        contact_person: defaultValues.contact_person || "",
        phone: defaultValues.phone || "",
        email: defaultValues.email || "",
        is_default: defaultValues.is_default === true,
      });
    }
  }, [defaultValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const processedValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) onClearServerError();
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "pincode" && value && value.trim() !== "") {
      const pincodeValidation = validatePincode(value);
      if (!pincodeValidation.isValid) {
        setErrors((prev) => ({ ...prev, [name]: pincodeValidation.message }));
        return;
      }
    }
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverError) onClearServerError();
    const validationErrors = {};
    if (!formData.address || formData.address.trim() === "") {
      validationErrors.address = "Address is required";
    }
    if (formData.pincode && formData.pincode.trim() !== "") {
      const pincodeValidation = validatePincode(formData.pincode);
      if (!pincodeValidation.isValid) validationErrors.pincode = pincodeValidation.message;
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const payload = {
      ship_to_name: formData.ship_to_name?.trim() || null,
      address: formData.address?.trim() || " ",
      city: formData.city?.trim() || null,
      district: formData.district?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      landmark: formData.landmark?.trim() || null,
      country: formData.country?.trim() || "India",
      contact_person: formData.contact_person?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      is_default: !!formData.is_default,
    };
    if (clientId && !defaultValues?.id) {
      payload.client_id = clientId;
    }
    setErrors({});
    onSubmit(payload);
  };

  return (
    <FormContainer>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>
        )}
        <Input
          fullWidth
          name="ship_to_name"
          label="Ship-to Name"
          value={formData.ship_to_name}
          onChange={handleChange}
          placeholder="e.g. Billing Address / Warehouse"
        />
        <Input
          fullWidth
          name="address"
          label="Street / Area"
          value={formData.address}
          onChange={handleChange}
          multiline
          rows={2}
          error={!!errors.address}
          helperText={errors.address}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input fullWidth name="city" label="City" value={formData.city} onChange={handleChange} />
          <Input fullWidth name="district" label="District" value={formData.district} onChange={handleChange} />
          <Input fullWidth name="state" label="State" value={formData.state} onChange={handleChange} />
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
          <Input fullWidth name="landmark" label="Landmark" value={formData.landmark} onChange={handleChange} />
          <Input fullWidth name="country" label="Country" value={formData.country} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            fullWidth
            name="contact_person"
            label="Contact Person"
            value={formData.contact_person}
            onChange={handleChange}
          />
          <Input fullWidth name="phone" label="Phone" value={formData.phone} onChange={handleChange} />
          <Input fullWidth name="email" label="Email" type="email" value={formData.email} onChange={handleChange} />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_default"
            checked={formData.is_default}
            onChange={handleChange}
            className="size-4 rounded border-input"
          />
          <span className="text-sm font-medium">Use as default shipping address</span>
        </label>
        <FormActions>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : defaultValues?.id ? "Update" : "Add"}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );
}
