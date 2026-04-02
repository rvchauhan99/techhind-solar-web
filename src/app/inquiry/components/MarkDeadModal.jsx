"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import mastersService from "@/services/mastersService";
import followupService from "@/services/followupService";
import { toastSuccess, toastError } from "@/utils/toast";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 500,
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 1,
  p: 3,
};

export default function MarkDeadModal({ open, onClose, inquiryId, onRefresh }) {
  const [formData, setFormData] = useState({
    dead_reason_id: "",
    dead_remarks: "",
  });
  const [deadReasonOptions, setDeadReasonOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      const fetchDeadReasons = async () => {
        setLoadingOptions(true);
        try {
          const response = await mastersService.getReferenceOptionsSearch("reason.model", {
            reason_type: "inquiry_dead",
          });
          setDeadReasonOptions(Array.isArray(response) ? response : []);
        } catch (error) {
          console.error("Error fetching dead reasons:", error);
          setDeadReasonOptions([]);
        } finally {
          setLoadingOptions(false);
        }
      };
      fetchDeadReasons();
      setFormData({ dead_reason_id: "", dead_remarks: "" });
      setErrors({});
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dead_reason_id) {
      setErrors({ dead_reason_id: "Dead reason is required" });
      return;
    }

    setLoading(true);
    try {
      const selectedReason = deadReasonOptions.find((o) => o.id == formData.dead_reason_id);
      await followupService.createFollowup({
        inquiry_id: inquiryId,
        inquiry_status: "Dead",
        dead_reason_id: formData.dead_reason_id,
        dead_reason: selectedReason?.label || selectedReason?.reason || "",
        dead_remarks: formData.dead_remarks,
        remarks: "Marked as dead", // Default followup remarks
      });
      toastSuccess("Inquiry marked as dead successfully");
      onClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Failed to mark inquiry as dead";
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>Mark Inquiry as Dead</Typography>
          <IconButton onClick={onClose} size="small" color="error">
            <CloseIcon />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <AutocompleteField
              name="dead_reason_id"
              label="Dead Reason"
              options={deadReasonOptions}
              getOptionLabel={(o) => o?.label ?? o?.reason ?? ""}
              value={deadReasonOptions.find((o) => o.id == formData.dead_reason_id) || null}
              onChange={(e, newValue) => handleChange({ target: { name: "dead_reason_id", value: newValue?.id ?? "" } })}
              placeholder="Select Reason"
              disabled={loadingOptions}
              required
              error={!!errors.dead_reason_id}
              helperText={errors.dead_reason_id}
            />

            <Input
              name="dead_remarks"
              label="Dead Remarks"
              value={formData.dead_remarks}
              onChange={handleChange}
              multiline
              rows={3}
              placeholder="Optional remarks..."
            />

            <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
              <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <LoadingButton type="submit" loading={loading} variant="destructive">
                Mark as Dead
              </LoadingButton>
            </Box>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
}
