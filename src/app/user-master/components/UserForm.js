"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Box, Alert } from "@mui/material";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import Checkbox from "@/components/common/Checkbox";
import { validateE164Phone, validateEmail, normalizeEmail } from "@/utils/validators";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import locationTrackingService from "@/services/locationTrackingService";

const UserForm = forwardRef(function UserForm({
  defaultValues = null,
  onSubmit,
  loading,
  roles = [],
  managers = [],
  serverError = null,
  onClearServerError = () => {},
  viewMode = false,
}, ref) {
  const base = {
    name: "",
    email: "",
    role_id: null,
    manager_id: "",
    status: "active",
    location_tracking_enabled: false,
    location_tracking_capture_interval_minutes: "",
    location_tracking_sync_interval_minutes: "",
  };

  const contactDefaults = {
    address: "",
    brith_date: "",
    blood_group: "",
    mobile_number: "",
  };

  const [formData, setFormData] = useState({
    ...base,
    ...contactDefaults,
    ...(defaultValues || {}),
  });
  const [errors, setErrors] = useState({});
  const [tenantTrackingEnabled, setTenantTrackingEnabled] = useState(false);
  const [tenantDefaults, setTenantDefaults] = useState({
    capture_interval_minutes: 5,
    sync_interval_minutes: 10,
  });

  useEffect(() => {
    const applyDefaults = (data) => {
      setTenantTrackingEnabled(!!data?.enabled);
      setTenantDefaults({
        capture_interval_minutes: Number(data?.capture_interval_minutes) || 5,
        sync_interval_minutes: Number(data?.sync_interval_minutes) || 10,
      });
    };

    locationTrackingService
      .getTenantDefaults()
      .then(applyDefaults)
      .catch(() =>
        locationTrackingService
          .getSettings()
          .then(applyDefaults)
          .catch(() => {
            setTenantTrackingEnabled(false);
          })
      );
  }, []);

  useEffect(() => {
    if (
      defaultValues &&
      (defaultValues.id || Object.keys(defaultValues).length)
    ) {
      setFormData({
        ...base,
        ...contactDefaults,
        ...defaultValues,
        location_tracking_capture_interval_minutes:
          defaultValues.location_tracking_capture_interval_minutes ?? "",
        location_tracking_sync_interval_minutes:
          defaultValues.location_tracking_sync_interval_minutes ?? "",
      });
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (serverError) onClearServerError();

    if (name === "email") value = normalizeEmail(value);

    if (name === "email" && value !== "") {
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
    } else if (name === "mobile_number" && value && value.trim() !== "") {
      const phoneValidation = validateE164Phone(value, { required: false });
      if (!phoneValidation.isValid) {
        setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
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

    setFormData((s) => ({ ...s, [name]: value }));
  };

  const formRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = {};

    if (!formData.email || formData.email.trim() === "") {
      validationErrors.email = "Email is required";
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        validationErrors.email = emailValidation.message;
      }
    }

    if (formData.mobile_number && formData.mobile_number.trim() !== "") {
      const phoneValidation = validateE164Phone(formData.mobile_number, { required: false });
      if (!phoneValidation.isValid) {
        validationErrors.mobile_number = phoneValidation.message;
      }
    }

    if (tenantTrackingEnabled && formData.location_tracking_enabled) {
      const captureRaw = formData.location_tracking_capture_interval_minutes;
      const syncRaw = formData.location_tracking_sync_interval_minutes;
      const capture =
        captureRaw === "" || captureRaw == null ? null : Number(captureRaw);
      const sync = syncRaw === "" || syncRaw == null ? null : Number(syncRaw);
      if (capture != null && (!Number.isInteger(capture) || capture < 1 || capture > 60)) {
        validationErrors.location_tracking_capture_interval_minutes =
          "Capture override must be 1-60 or blank";
      }
      if (sync != null && (!Number.isInteger(sync) || sync < 5 || sync > 60)) {
        validationErrors.location_tracking_sync_interval_minutes =
          "Sync override must be 5-60 or blank";
      }
      const effectiveCapture = capture ?? tenantDefaults.capture_interval_minutes;
      const effectiveSync = sync ?? tenantDefaults.sync_interval_minutes;
      if (effectiveSync < effectiveCapture) {
        validationErrors.location_tracking_sync_interval_minutes =
          "Sync must be ≥ capture interval";
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = { ...formData };
    if (tenantTrackingEnabled) {
      payload.location_tracking_enabled = !!formData.location_tracking_enabled;
      payload.location_tracking_capture_interval_minutes =
        formData.location_tracking_capture_interval_minutes === "" ||
        formData.location_tracking_capture_interval_minutes == null
          ? null
          : Number(formData.location_tracking_capture_interval_minutes);
      payload.location_tracking_sync_interval_minutes =
        formData.location_tracking_sync_interval_minutes === "" ||
        formData.location_tracking_sync_interval_minutes == null
          ? null
          : Number(formData.location_tracking_sync_interval_minutes);
    } else {
      delete payload.location_tracking_enabled;
      delete payload.location_tracking_capture_interval_minutes;
      delete payload.location_tracking_sync_interval_minutes;
    }

    onSubmit(payload);
  };

  useImperativeHandle(ref, () => ({
    requestSubmit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }));

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {serverError ? <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert> : null}

      <Box
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={preventEnterSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          maxWidth: "760px",
          mx: "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            flex: 1,
            overflowY: "auto",
            pr: 1,
            pt: 1,
            width: "100%",
          }}
        >
          <Input
            name="name"
            label="Name"
            value={formData.name || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
          />
          <Input
            name="email"
            label="Email"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
            error={!!errors.email}
            helperText={errors.email}
          />

          <PhoneField
            name="mobile_number"
            label="Mobile Number"
            value={formData.mobile_number || ""}
            onChange={handleChange}
            disabled={viewMode}
            error={!!errors.mobile_number}
            helperText={errors.mobile_number}
          />
          <Input
            name="blood_group"
            label="Blood Group"
            value={formData.blood_group || ""}
            onChange={handleChange}
            disabled={viewMode}
          />
          <Input
            name="address"
            label="Address"
            value={formData.address || ""}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={viewMode}
          />
          <DateField
            name="brith_date"
            label="Date of Birth"
            value={formData.brith_date || ""}
            onChange={handleChange}
            disabled={viewMode}
          />

          <AutocompleteField
            name="role_id"
            label="Role"
            options={roles}
            getOptionLabel={(r) => r?.name ?? r?.label ?? ""}
            value={roles.find((r) => r.id === formData.role_id) || (formData.role_id ? { id: formData.role_id } : null)}
            onChange={(e, newValue) => handleChange({ target: { name: "role_id", value: newValue?.id ?? "" } })}
            placeholder="Type to search..."
            required={!viewMode}
            disabled={viewMode}
          />

          <AutocompleteField
            name="manager_id"
            label="Manager"
            options={managers}
            getOptionLabel={(m) => m?.name ?? m?.label ?? ""}
            value={managers.find((m) => m.id === formData.manager_id) || (formData.manager_id ? { id: formData.manager_id } : null)}
            onChange={(e, newValue) => handleChange({ target: { name: "manager_id", value: newValue?.id ?? "" } })}
            placeholder="Type to search..."
            disabled={viewMode}
          />

          <AutocompleteField
            name="status"
            label="Status"
            options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
            getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
            value={formData.status ? { value: formData.status, label: formData.status === "active" ? "Active" : "Inactive" } : null}
            onChange={(e, newValue) => handleChange({ target: { name: "status", value: newValue?.value ?? "" } })}
            placeholder="Type to search..."
            disabled={viewMode}
          />

          {tenantTrackingEnabled ? (
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Checkbox
                name="location_tracking_enabled"
                label="Enable location tracking for this user"
                checked={!!formData.location_tracking_enabled}
                disabled={viewMode}
                onChange={(e) =>
                  handleChange({
                    target: { name: "location_tracking_enabled", value: e.target.checked },
                  })
                }
              />
              {formData.location_tracking_enabled ? (
                <>
                  <Input
                    name="location_tracking_capture_interval_minutes"
                    label="Capture interval override (min)"
                    type="number"
                    value={formData.location_tracking_capture_interval_minutes ?? ""}
                    onChange={handleChange}
                    disabled={viewMode}
                    placeholder={`Inherit tenant default (${tenantDefaults.capture_interval_minutes})`}
                    error={!!errors.location_tracking_capture_interval_minutes}
                    helperText={
                      errors.location_tracking_capture_interval_minutes ||
                      "Blank inherits tenant default"
                    }
                  />
                  <Input
                    name="location_tracking_sync_interval_minutes"
                    label="Sync interval override (min)"
                    type="number"
                    value={formData.location_tracking_sync_interval_minutes ?? ""}
                    onChange={handleChange}
                    disabled={viewMode}
                    placeholder={`Inherit tenant default (${tenantDefaults.sync_interval_minutes})`}
                    error={!!errors.location_tracking_sync_interval_minutes}
                    helperText={
                      errors.location_tracking_sync_interval_minutes ||
                      "Blank inherits tenant default; must be ≥ capture"
                    }
                  />
                </>
              ) : null}
            </Box>
          ) : null}

          {viewMode && (
            <Input
              name="first_login"
              label="First Time Logged In"
              value={formData.first_login ? "Yes" : "No"}
              disabled
            />
          )}
        </Box>
      </Box>
    </>
  );
});

export default UserForm;
