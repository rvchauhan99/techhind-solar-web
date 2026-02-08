"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getReferenceOptions } from "@/services/mastersService";
import userService from "@/services/userMasterService";
import followupService from "@/services/followupService";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { cn } from "@/lib/utils";

const inquiryStatusOptions = [
  { key: "Live", value: "Live" },
  { key: "Dead", value: "Dead" },
  { key: "Convert", value: "Convert" },
];

export default function FollowupForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    inquiry_id: defaultValues.inquiry_id || "",
    inquiry_status: defaultValues.inquiry_status || "",
    remarks: defaultValues.remarks || "",
    next_reminder: defaultValues.next_reminder || "",
    call_by: defaultValues.call_by || user?.id || "",
    is_schedule_site_visit: defaultValues.is_schedule_site_visit || false,
    is_msg_send_to_customer: defaultValues.is_msg_send_to_customer || false,
    rating: defaultValues.rating || "",
    isFromInquiry: defaultValues.isFromInquiry || false,
  });

  const [inquiries, setInquiries] = useState([]);
  const [users, setUsers] = useState([]);
  const [ratingOptions, setRatingOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingOptions, setLoadingOptions] = useState({
    inquiries: false,
    users: false,
    ratings: false,
  });

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const getTodayDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDefaultReminderDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setFormData({
      inquiry_id: defaultValues.inquiry_id || "",
      inquiry_status: defaultValues.inquiry_status || "Live",
      remarks: defaultValues.remarks || "",
      next_reminder: defaultValues.next_reminder
        ? formatDateForInput(defaultValues.next_reminder)
        : getDefaultReminderDate(),
      call_by: defaultValues.call_by || user?.id || "",
      is_schedule_site_visit: defaultValues.is_schedule_site_visit || false,
      is_msg_send_to_customer: defaultValues.is_msg_send_to_customer || false,
      rating: defaultValues.rating || "",
      isFromInquiry: defaultValues.isFromInquiry || false,
    });
  }, [defaultValues, user]);

  useEffect(() => {
    const fetchInquiries = async () => {
      setLoadingOptions((prev) => ({ ...prev, inquiries: true }));
      try {
        const response = await followupService.getAllInquiry();
        setInquiries(response);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
        setInquiries([]);
      } finally {
        setLoadingOptions((prev) => ({ ...prev, inquiries: false }));
      }
    };
    fetchInquiries();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingOptions((prev) => ({ ...prev, users: true }));
      try {
        const response = await userService.listUserMasters();
        const data =
          response?.data || response?.result?.data || response?.rows || [];
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoadingOptions((prev) => ({ ...prev, users: false }));
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchRatingOptions = async () => {
      setLoadingOptions((prev) => ({ ...prev, ratings: true }));
      try {
        const options = await followupService.getRatingOptions();
        setRatingOptions(Array.isArray(options) ? options : []);
      } catch (error) {
        console.error("Error fetching rating options:", error);
        setRatingOptions([]);
      } finally {
        setLoadingOptions((prev) => ({ ...prev, ratings: false }));
      }
    };
    fetchRatingOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (serverError) onClearServerError();

    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.inquiry_id) {
      newErrors.inquiry_id = "Inquiry is required";
    }
    if (!formData.inquiry_status) {
      newErrors.inquiry_status = "Inquiry Status is required";
    }
    if (!formData.remarks || formData.remarks.trim() === "") {
      newErrors.remarks = "Call Remarks is required";
    }
    if (!formData.next_reminder) {
      newErrors.next_reminder = "Next Reminder Date is required";
    }
    if (!formData.call_by && !user?.id) {
      newErrors.call_by = "Call By is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const payload = {
      ...formData,
      inquiry_id: formData.inquiry_id || null,
      call_by: formData.call_by || user?.id || null,
      next_reminder: formData.next_reminder
        ? new Date(formData.next_reminder + "T00:00:00").toISOString()
        : null,
      remarks: formData.remarks || null,
      rating: formData.rating || "",
    };
    onSubmit(payload);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <FormContainer>
      <form
        id="followup-form"
        onSubmit={handleSubmit}
        noValidate
        className={cn("grid gap-4 max-w-[700px]")}
      >
        {loadingOptions.inquiries ? (
          <div className="flex items-center gap-2">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading inquiries...</span>
          </div>
        ) : (
          <Select
            name="inquiry_id"
            label="Inquiry"
            value={formData.inquiry_id}
            onChange={handleChange}
            disabled={loadingOptions.inquiries || formData.isFromInquiry}
            required
            error={!!errors.inquiry_id}
            helperText={errors.inquiry_id}
          >
            <MenuItem value="">Select Inquiry</MenuItem>
            {inquiries.map((inquiry) => (
              <MenuItem key={inquiry.id} value={inquiry.id}>
                Inquiry #{inquiry.inquiry_number}
              </MenuItem>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loadingOptions.ratings ? (
            <div className="flex items-center gap-2">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading ratings...</span>
            </div>
          ) : (
            <Select
              name="rating"
              label="Rating"
              value={formData.rating}
              onChange={handleChange}
              disabled={loadingOptions.ratings}
              error={!!errors.rating}
              helperText={errors.rating}
            >
              <MenuItem value="">Select Rating</MenuItem>
              {ratingOptions.map((option) => (
                <MenuItem
                  key={option.id || option.value}
                  value={option.value || option.id}
                >
                  {option.label || option.value || option.id}
                </MenuItem>
              ))}
            </Select>
          )}

          <Select
            name="inquiry_status"
            label="Inquiry Status"
            value={formData.inquiry_status}
            onChange={handleChange}
            required
            error={!!errors.inquiry_status}
            helperText={errors.inquiry_status}
          >
            {inquiryStatusOptions.map((option) => (
              <MenuItem key={option.key} value={option.value}>
                {option.value}
              </MenuItem>
            ))}
          </Select>
        </div>

        <DateField
          name="next_reminder"
          label="Next Reminder"
          value={formData.next_reminder}
          onChange={handleChange}
          inputProps={{ min: getTodayDate() }}
          required
          error={!!errors.next_reminder}
          helperText={errors.next_reminder}
        />

        <Input
          name="remarks"
          label="Call Remarks"
          value={formData.remarks}
          onChange={handleChange}
          multiline
          rows={1}
          required
          error={!!errors.remarks}
          helperText={errors.remarks}
        />

        <Input
          fullWidth
          name="call_by"
          label="Call By"
          value={user?.name || user?.email || "Current User"}
          disabled
          required
          error={!!errors.call_by}
          helperText={errors.call_by}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_msg_send_to_customer"
            checked={formData.is_msg_send_to_customer}
            onChange={handleChange}
            className="size-4 rounded border-input"
          />
          <span className="text-sm font-medium">Message Sent to Customer</span>
        </label>
      </form>

      <FormActions>
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" form="followup-form" disabled={loading}>
          {defaultValues?.id ? "Update" : "Create"}
        </Button>
      </FormActions>
    </FormContainer>
  );
}
