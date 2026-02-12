"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Alert,
  Typography,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  Grid,
  CircularProgress,
} from "@mui/material";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import { Button as ActionButton } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import siteVisitService from "@/services/siteVisitService";
import userService from "@/services/userMasterService";

export default function SiteVisitForm({
  defaultValues = null,
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => { },
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    inquiry_id: "",
    isFromInquiry: false,
    visit_status: "Visited",
    remarks: "",
    next_reminder_date: "",
    site_latitude: "0",
    site_longitude: "0",
    has_shadow_casting_object: null,
    shadow_reduce_suggestion: "",
    height_of_parapet: "",
    roof_type: "",
    solar_panel_size_capacity: "",
    approx_roof_area_sqft: "",
    inverter_size_capacity: "",
    earthing_cable_size_location: "",
    do_not_send_message: false,
    visit_date: "",
    visited_by: "",
    visit_assign_to: "",
    schedule_on: "",
    schedule_remarks: "",
  });

  const [files, setFiles] = useState({
    visit_photo: null,
    left_corner_site_image: null,
    right_corner_site_image: null,
    left_top_corner_site_image: null,
    right_top_corner_site_image: null,
    drawing_image: null,
    house_building_outside_photo: null,
    other_images_videos: [],
  });

  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [roofTypes, setRoofTypes] = useState([]);
  const [loadingRoofTypes, setLoadingRoofTypes] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (defaultValues) {
      // Ensure all string fields are strings (not null or undefined)
      const sanitizedValues = {
        inquiry_id: defaultValues.inquiry_id ?? "",
        visit_status: defaultValues.visit_status || "Visited",
        remarks: defaultValues.remarks ?? "",
        next_reminder_date: defaultValues.next_reminder_date ?? "",
        site_latitude: defaultValues.site_latitude ?? "0",
        site_longitude: defaultValues.site_longitude ?? "0",
        has_shadow_casting_object: defaultValues.has_shadow_casting_object,
        shadow_reduce_suggestion: defaultValues.shadow_reduce_suggestion ?? "",
        height_of_parapet: defaultValues.height_of_parapet ?? "",
        roof_type: defaultValues.roof_type ?? "",
        solar_panel_size_capacity: defaultValues.solar_panel_size_capacity ?? "",
        approx_roof_area_sqft: defaultValues.approx_roof_area_sqft ?? "",
        inverter_size_capacity: defaultValues.inverter_size_capacity ?? "",
        earthing_cable_size_location: defaultValues.earthing_cable_size_location ?? "",
        do_not_send_message: defaultValues.do_not_send_message ?? false,
        visit_date: defaultValues.visit_date ?? "",
        visited_by: defaultValues.visited_by ?? "",
        visit_assign_to: defaultValues.visit_assign_to ?? "",
        schedule_on: defaultValues.schedule_on ?? "",
        schedule_remarks: defaultValues.schedule_remarks ?? "",
        isFromInquiry: defaultValues.isFromInquiry ?? false
      };
      setFormData(sanitizedValues);
    }
    fetchInquiries();
    fetchRoofTypes();
    fetchUsers();
  }, [defaultValues]);

  const fetchInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const response = await siteVisitService.getInquiries();
      const result = response.result || response;
      const data = result.data || result || [];
      setInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      setInquiries([]);
    } finally {
      setLoadingInquiries(false);
    }
  };

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

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e, fieldName, multiple = false) => {
    if (multiple) {
      const fileList = Array.from(e.target.files);
      setFiles((prev) => ({ ...prev, [fieldName]: fileList }));
    } else {
      const file = e.target.files[0];
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
    }
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

    // Validate required fields
    const validationErrors = {};

    if (!formData.visit_status) {
      validationErrors.visit_status = "Visit status is required";
    }

    // If Pending is selected, only validate schedule fields
    if (formData.visit_status === "Pending") {
      if (!formData.inquiry_id) {
        validationErrors.inquiry_id = "Inquiry is required";
      }
      if (!formData.schedule_on) {
        validationErrors.schedule_on = "Pending date is required";
      }
      if (!formData.visit_assign_to) {
        validationErrors.visit_assign_to = "Visit assign to is required";
      }
      // schedule_remarks is optional, no validation needed
    } else if (formData.visit_status === "Rescheduled") {
      // For Rescheduled status, validate schedule fields + remarks
      if (!formData.inquiry_id) {
        validationErrors.inquiry_id = "Inquiry is required";
      }
      if (!formData.schedule_on) {
        validationErrors.schedule_on = "Pending date is required";
      }
      if (!formData.visit_assign_to) {
        validationErrors.visit_assign_to = "Visit assign to is required";
      }
      if (!formData.remarks || formData.remarks.trim() === "") {
        validationErrors.remarks = "Remarks is required";
      }
      // schedule_remarks is optional, no validation needed
    } else if (formData.visit_status === "Cancelled") {
      // For Cancelled status, only validate inquiry and remarks
      if (!formData.inquiry_id) {
        validationErrors.inquiry_id = "Inquiry is required";
      }
      if (!formData.remarks || formData.remarks.trim() === "") {
        validationErrors.remarks = "Remarks is required";
      }
    } else {
      // For Visited status, validate regular fields
      if (!formData.inquiry_id) {
        validationErrors.inquiry_id = "Inquiry is required";
      }
      if (!formData.remarks || formData.remarks.trim() === "") {
        validationErrors.remarks = "Remarks is required";
      }
      if (!formData.next_reminder_date) {
        validationErrors.next_reminder_date = "Next reminder date is required";
      }
      if (!files.visit_photo) {
        validationErrors.visit_photo = "Visit photo is required";
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    // If Pending is selected, only send schedule-related fields
    if (formData.visit_status === "Pending") {
      const scheduleData = {
        visit_status: "Pending", // Send "Pending" to database when user selects "Pending"
        inquiry_id: formData.inquiry_id,
        schedule_on: formData.schedule_on,
        visit_assign_to: formData.visit_assign_to,
        schedule_remarks: formData.schedule_remarks || "",
        do_not_send_message: formData.do_not_send_message,
      };
      onSubmit(scheduleData, {});
    } else if (formData.visit_status === "Rescheduled") {
      // For Rescheduled status, send schedule fields + remarks
      const rescheduledData = {
        visit_status: formData.visit_status,
        inquiry_id: formData.inquiry_id,
        schedule_on: formData.schedule_on,
        visit_assign_to: formData.visit_assign_to,
        schedule_remarks: formData.schedule_remarks || "",
        remarks: formData.remarks,
        do_not_send_message: formData.do_not_send_message,
      };
      onSubmit(rescheduledData, {});
    } else if (formData.visit_status === "Cancelled") {
      // For Cancelled status, only send inquiry and remarks
      const cancelledData = {
        visit_status: formData.visit_status,
        inquiry_id: formData.inquiry_id,
        remarks: formData.remarks,
        do_not_send_message: formData.do_not_send_message,
      };
      onSubmit(cancelledData, {});
    } else {
      // For Visited status, send all form data
      onSubmit(formData, files);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearServerError}>
          {serverError}
        </Alert>
      )}

      <Grid container spacing={2} >
        {/* Visit Status - Required (Radio Buttons) - Full Width */}
        <Grid size={12}>
          <FormControl component="fieldset" fullWidth required error={!!errors.visit_status}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Visit Status
            </Typography>
            <RadioGroup
              row
              name="visit_status"
              value={formData.visit_status}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, visit_status: e.target.value }));
                if (errors.visit_status) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.visit_status;
                    return newErrors;
                  });
                }
                // Clear schedule fields when switching away from Pending/Rescheduled
                if (e.target.value !== "Pending" && e.target.value !== "Rescheduled") {
                  setFormData((prev) => ({ ...prev, schedule_on: "", schedule_remarks: "", visit_assign_to: "" }));
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.schedule_on;
                    delete newErrors.schedule_remarks;
                    delete newErrors.visit_assign_to;
                    return newErrors;
                  });
                }

                // Clear fields when switching to/from Cancelled
                if (e.target.value === "Cancelled") {
                  setFormData((prev) => ({
                    ...prev,
                    schedule_on: "",
                    schedule_remarks: "",
                    visit_assign_to: "",
                    next_reminder_date: "",
                  }));
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.schedule_on;
                    delete newErrors.schedule_remarks;
                    delete newErrors.visit_assign_to;
                    delete newErrors.next_reminder_date;
                    delete newErrors.visit_photo;
                    return newErrors;
                  });
                } else if (e.target.value === "Pending") {
                  // When switching to Pending, clear other required fields errors (but keep inquiry_id)
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.remarks;
                    delete newErrors.next_reminder_date;
                    delete newErrors.visit_photo;
                    return newErrors;
                  });
                } else if (e.target.value === "Rescheduled") {
                  // When switching to Rescheduled, clear visit photo and next reminder date errors
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.next_reminder_date;
                    delete newErrors.visit_photo;
                    return newErrors;
                  });
                } else {
                  // When switching to Visited, clear schedule errors
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.schedule_on;
                    delete newErrors.schedule_remarks;
                    delete newErrors.visit_assign_to;
                    return newErrors;
                  });
                }
              }}
            >
              <FormControlLabel value="Visited" control={<Radio />} label="Visited" />
              <FormControlLabel value="Rescheduled" control={<Radio />} label="Rescheduled" />
              <FormControlLabel value="Cancelled" control={<Radio />} label="Cancelled" />
              <FormControlLabel value="Pending" control={<Radio />} label="Schedule" />
            </RadioGroup>
            {errors.visit_status && (
              <FormHelperText error>{errors.visit_status}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Pending Fields - Show when Pending or Rescheduled is selected */}
        {(formData.visit_status === "Pending" || formData.visit_status === "Rescheduled") && (
          <>
            {/* Inquiry ID - Required */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required error={!!errors.inquiry_id}>
                <InputLabel>Inquiry</InputLabel>
                {loadingInquiries ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading inquiries...</Typography>
                  </Box>
                ) : (
                  <Select
                    name="inquiry_id"
                    value={formData.inquiry_id}
                    onChange={handleChange}
                    label="Inquiry"
                    disabled={formData.isFromInquiry}
                  >
                    {inquiries.map((inquiry) => (
                      <MenuItem key={inquiry.id} value={inquiry.id}>
                        Inquiry #{inquiry.inquiry_number}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {errors.inquiry_id && (
                  <FormHelperText error>{errors.inquiry_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Pending Date - Mandatory */}
            <Grid size={{ xs: 12, md: 4 }}>
              <DateField
                name="schedule_on"
                label="Schedule On"
                value={formData.schedule_on}
                onChange={handleChange}
                required
                error={!!errors.schedule_on}
                helperText={errors.schedule_on}
              />
            </Grid>

            {/* Visit Assign To - Mandatory when Pending */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required error={!!errors.visit_assign_to}>
                <InputLabel>Visit Assign To</InputLabel>
                {loadingUsers ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading users...</Typography>
                  </Box>
                ) : (
                  <Select
                    name="visit_assign_to"
                    value={formData.visit_assign_to}
                    onChange={handleChange}
                    label="Visit Assign To"
                  >
                    <MenuItem value="">-- Select --</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name || user.email || `User #${user.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {errors.visit_assign_to && (
                  <FormHelperText error>{errors.visit_assign_to}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Pending Remarks - Optional */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="schedule_remarks"
                label="Schedule Remarks"
                value={formData.schedule_remarks}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>

            {/* Remarks - Required when Rescheduled */}
            {formData.visit_status === "Rescheduled" && (
              <Grid size={{ xs: 12, md: 8 }}>
                <Input
                  fullWidth
                  name="remarks"
                  label="Remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  required
                  error={!!errors.remarks}
                  helperText={errors.remarks}
                />
              </Grid>
            )}
          </>
        )}

        {/* Cancelled Fields - Only show when Cancelled is selected */}
        {formData.visit_status === "Cancelled" && (
          <>
            {/* Inquiry ID - Required */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required error={!!errors.inquiry_id}>
                <InputLabel>Inquiry</InputLabel>
                {loadingInquiries ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading inquiries...</Typography>
                  </Box>
                ) : (
                  <Select
                    name="inquiry_id"
                    value={formData.inquiry_id}
                    onChange={handleChange}
                    label="Inquiry"
                    disabled={formData.isFromInquiry}
                  >
                    {inquiries.map((inquiry) => (
                      <MenuItem key={inquiry.id} value={inquiry.id}>
                        Inquiry #{inquiry.inquiry_number}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {errors.inquiry_id && (
                  <FormHelperText error>{errors.inquiry_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Remarks - Required - Full Width */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                fullWidth
                name="remarks"
                label="Remarks"
                value={formData.remarks}
                onChange={handleChange}
                multiline
                rows={1}
                required
                error={!!errors.remarks}
                helperText={errors.remarks}
              />
            </Grid>
          </>
        )}

        {/* Regular Fields - Only show when Visited is selected */}
        {formData.visit_status === "Visited" && (
          <>
            {/* Remarks - Required - Full Width */}
            <Grid size={12}>
              <Input
                fullWidth
                name="remarks"
                label="Remarks"
                value={formData.remarks}
                onChange={handleChange}
                multiline
                rows={4}
                required
                error={!!errors.remarks}
                helperText={errors.remarks}
              />
            </Grid>

            {/* Inquiry ID - Required */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required error={!!errors.inquiry_id}>
                <InputLabel>Inquiry</InputLabel>
                {loadingInquiries ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading inquiries...</Typography>
                  </Box>
                ) : (
                  <Select
                    name="inquiry_id"
                    value={formData.inquiry_id}
                    onChange={handleChange}
                    label="Inquiry"
                    disabled={formData.isFromInquiry}
                  >
                    {inquiries.map((inquiry) => (
                      <MenuItem key={inquiry.id} value={inquiry.id}>
                        Inquiry #{inquiry.inquiry_number}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {errors.inquiry_id && (
                  <FormHelperText error>{errors.inquiry_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Next Reminder Date - Required */}
            <Grid size={{ xs: 12, md: 4 }}>
              <DateField
                name="next_reminder_date"
                label="Next Reminder Date"
                value={formData.next_reminder_date}
                onChange={handleChange}
                required
                error={!!errors.next_reminder_date}
                helperText={errors.next_reminder_date}
              />
            </Grid>
          </>
        )}

        {/* Regular Fields - Only show when Visited is selected */}
        {formData.visit_status === "Visited" && (
          <>
            {/* Site Latitude */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="site_latitude"
                label="Site Latitude"
                type="number"
                value={formData.site_latitude}
                onChange={handleChange}
              />
            </Grid>

            {/* Site Longitude */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="site_longitude"
                label="Site Longitude"
                type="number"
                value={formData.site_longitude}
                onChange={handleChange}
              />
            </Grid>

            {/* Height of Parapet */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="height_of_parapet"
                label="Height of Parapet"
                value={formData.height_of_parapet}
                onChange={handleChange}
              />
            </Grid>

            {/* Solar Panel Size and Capacity */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="solar_panel_size_capacity"
                label="Solar Panel's Size and Capacity"
                value={formData.solar_panel_size_capacity}
                onChange={handleChange}
              />
            </Grid>

            {/* Inverter Size and Capacity */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="inverter_size_capacity"
                label="Inverter's Size and Capacity"
                value={formData.inverter_size_capacity}
                onChange={handleChange}
              />
            </Grid>

            {/* Has Shadow Casting Object */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl component="fieldset" fullWidth>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Is there any major Shadow-Casting Object?
                </Typography>
                <RadioGroup
                  row
                  name="has_shadow_casting_object"
                  value={formData.has_shadow_casting_object === null ? "" : formData.has_shadow_casting_object ? "Yes" : "No"}
                  onChange={(e) => {
                    const value = e.target.value === "Yes" ? true : e.target.value === "No" ? false : null;
                    setFormData((prev) => ({
                      ...prev,
                      has_shadow_casting_object: value,
                      // Clear shadow_reduce_suggestion if user selects "No"
                      shadow_reduce_suggestion: value === false ? "" : prev.shadow_reduce_suggestion
                    }));
                  }}
                >
                  <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="No" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Shadow Reduce Suggestion - Conditional Field */}
            {formData.has_shadow_casting_object === true && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Input
                  fullWidth
                  name="shadow_reduce_suggestion"
                  label="If yes, suggest how to reduce shadows"
                  value={formData.shadow_reduce_suggestion}
                  onChange={handleChange}
                  multiline
                  rows={3}
                />
              </Grid>
            )}

            {/* Type of Roof */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Type of Roof</InputLabel>
                {loadingRoofTypes ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading roof types...</Typography>
                  </Box>
                ) : (
                  <Select
                    name="roof_type"
                    value={formData.roof_type}
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
              </FormControl>
            </Grid>

            {/* Approx Roof Area */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="approx_roof_area_sqft"
                label="Approx Roof Area (sq. ft)"
                type="number"
                value={formData.approx_roof_area_sqft}
                onChange={handleChange}
              />
            </Grid>

            {/* Earthing Cable Size and Location */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Input
                fullWidth
                name="earthing_cable_size_location"
                label="Earthing Cable Size and Location"
                value={formData.earthing_cable_size_location}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            {/* Visit Photo - Required */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required error={!!errors.visit_photo}>
                <InputLabel shrink>Visit Photo</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "visit_photo")}
                    style={{ display: "none" }}
                    id="visit_photo"
                  />
                  <label htmlFor="visit_photo">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      sx={{
                        borderColor: errors.visit_photo ? 'error.main' : undefined,
                        color: errors.visit_photo ? 'error.main' : undefined,
                        '&:hover': {
                          borderColor: errors.visit_photo ? 'error.main' : undefined,
                        }
                      }}
                    >
                      {files.visit_photo ? files.visit_photo.name : "Choose file"}
                    </Button>
                  </label>
                  {errors.visit_photo && (
                    <FormHelperText error sx={{ mt: 0.5, ml: 0 }}>
                      {errors.visit_photo}
                    </FormHelperText>
                  )}
                </Box>
              </FormControl>
            </Grid>

            {/* Upload Other Images/Video */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Upload Other Images/Video</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => handleFileChange(e, "other_images_videos", true)}
                    style={{ display: "none" }}
                    id="other_images_videos"
                  />
                  <label htmlFor="other_images_videos">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.other_images_videos.length > 0
                        ? `${files.other_images_videos.length} file(s) selected`
                        : "Choose files"}
                    </Button>
                  </label>
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                    Select Multiple Images
                  </Typography>
                </Box>
              </FormControl>
            </Grid>

            {/* Left Corner Site Image */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Left Corner Site Image</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "left_corner_site_image")}
                    style={{ display: "none" }}
                    id="left_corner_site_image"
                  />
                  <label htmlFor="left_corner_site_image">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.left_corner_site_image ? files.left_corner_site_image.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* Right Corner Site Image */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Right Corner Site Image</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "right_corner_site_image")}
                    style={{ display: "none" }}
                    id="right_corner_site_image"
                  />
                  <label htmlFor="right_corner_site_image">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.right_corner_site_image ? files.right_corner_site_image.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* Left Top Corner Site Image */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Left Top Corner Site Image</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "left_top_corner_site_image")}
                    style={{ display: "none" }}
                    id="left_top_corner_site_image"
                  />
                  <label htmlFor="left_top_corner_site_image">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.left_top_corner_site_image ? files.left_top_corner_site_image.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* Right Top Corner Site Image */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Right Top Corner Site Image</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "right_top_corner_site_image")}
                    style={{ display: "none" }}
                    id="right_top_corner_site_image"
                  />
                  <label htmlFor="right_top_corner_site_image">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.right_top_corner_site_image ? files.right_top_corner_site_image.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* Drawing Image */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Add Drawing Image</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "drawing_image")}
                    style={{ display: "none" }}
                    id="drawing_image"
                  />
                  <label htmlFor="drawing_image">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.drawing_image ? files.drawing_image.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* House/Building Outside Photo */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel shrink>House/Building Outside Photo</InputLabel>
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "house_building_outside_photo")}
                    style={{ display: "none" }}
                    id="house_building_outside_photo"
                  />
                  <label htmlFor="house_building_outside_photo">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.house_building_outside_photo ? files.house_building_outside_photo.name : "Choose file"}
                    </Button>
                  </label>
                </Box>
              </FormControl>
            </Grid>

            {/* Do not send message checkbox */}

          </>
        )}

        <Grid size={12}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="do_not_send_message"
                  checked={formData.do_not_send_message}
                  onChange={handleCheckboxChange}
                />
              }
              label="Do not send message to customer"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              {onCancel && (
                <ActionButton type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </ActionButton>
              )}
              <LoadingButton type="submit" loading={loading} className="min-w-[120px]">
                Add
              </LoadingButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

