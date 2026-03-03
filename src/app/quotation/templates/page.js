"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconSettings, IconEdit, IconPlus } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import Input from "@/components/common/Input";
import Checkbox from "@/components/common/Checkbox";
import quotationTemplateService from "@/services/quotationTemplateService";
import { Button as ThemeButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function QuotationTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    template_key: "",
    description: "",
    is_default: false,
  });
  const [formErrors, setFormErrors] = useState({});

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await quotationTemplateService.listTemplates();
      const data = res?.result ?? res?.data ?? res;
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load templates", err);
      toast.error(err?.response?.data?.message || "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      template_key: "",
      description: "",
      is_default: false,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name || "",
      template_key: t.template_key || "",
      description: t.description || "",
      is_default: !!t.is_default,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", template_key: "", description: "", is_default: false });
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.name?.trim()) errs.name = "Name is required";
    if (!formData.template_key?.trim()) errs.template_key = "Template key is required";
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      if (editingTemplate) {
        await quotationTemplateService.updateTemplate(editingTemplate.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          is_default: formData.is_default,
        });
        toast.success("Template updated");
      } else {
        await quotationTemplateService.createTemplate({
          name: formData.name.trim(),
          template_key: formData.template_key.trim(),
          description: formData.description?.trim() || null,
          is_default: formData.is_default,
        });
        toast.success("Template created");
      }
      handleCloseDialog();
      await loadTemplates();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save";
      toast.error(msg);
      if (err?.response?.data?.errors) setFormErrors(err.response.data.errors);
    } finally {
      setSaving(false);
    }
  };

  const handleConfig = (id) => router.push(`/quotation/templates/${id}/config`);

  return (
    <ProtectedRoute>
      <Container className="flex flex-col gap-2 py-2 h-full min-h-0 max-w-[1536px] mx-auto">
        <div className="flex flex-shrink-0 justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <ThemeButton
              variant="ghost"
              size="sm"
              onClick={() => router.push("/quotation")}
              className="text-muted-foreground"
            >
              ← Quotations
            </ThemeButton>
            <h1 className="text-xl font-semibold">Quotation PDF Templates</h1>
          </div>
          <ThemeButton size="sm" className="gap-1" onClick={handleOpenAdd}>
            <IconPlus className="size-4" />
            Add Template
          </ThemeButton>
        </div>

        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No templates yet. Add one to get started.</div>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Template Key</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.template_key}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }} className="text-muted-foreground truncate">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell>
                        {t.is_default && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex justify-end gap-1">
                          <ThemeButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(t)}
                            className="gap-1"
                          >
                            <IconEdit className="size-4" />
                            Edit
                          </ThemeButton>
                          <ThemeButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfig(t.id)}
                            className="gap-1"
                          >
                            <IconSettings className="size-4" />
                            Images
                          </ThemeButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave}>
              <div className="space-y-3 py-2">
                <Input
                  name="name"
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  fullWidth
                  required
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
                <Input
                  name="template_key"
                  label="Template Key"
                  value={formData.template_key}
                  onChange={(e) => setFormData((p) => ({ ...p, template_key: e.target.value }))}
                  fullWidth
                  required
                  disabled={!!editingTemplate}
                  placeholder="e.g. default"
                  error={!!formErrors.template_key}
                  helperText={formErrors.template_key || (editingTemplate ? "Cannot change after create" : "Must match folder name under templates/quotation/")}
                />
                <Input
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Checkbox
                  name="is_default"
                  label="Set as default template"
                  checked={formData.is_default}
                  onChange={(e) => setFormData((p) => ({ ...p, is_default: !!e.target.checked }))}
                />
              </div>
              <DialogFooter className="mt-4">
                <ThemeButton type="button" variant="outline" size="sm" onClick={handleCloseDialog}>
                  Cancel
                </ThemeButton>
                <ThemeButton type="submit" size="sm" loading={saving}>
                  Save
                </ThemeButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Container>
    </ProtectedRoute>
  );
}
