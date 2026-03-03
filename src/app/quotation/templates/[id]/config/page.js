"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Box, Typography, Card, CardContent, Grid } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import quotationTemplateService from "@/services/quotationTemplateService";
import { Button as ThemeButton } from "@/components/ui/button";

const IMAGE_FIELDS = [
  { key: "default_background", label: "Default background image", help: "Used when page-wise background is not set" },
  { key: "default_footer", label: "Default footer image" },
  ...Array.from({ length: 9 }, (_, i) => ({
    key: `page_${i + 1}`,
    label: `Page ${i + 1} background`,
    help: "A4 portrait ratio (e.g. 1240×1754 px). For full-page look, use an image that fills the frame; avoid large white margins.",
  })),
];

export default function QuotationTemplateConfigPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? Number(params.id) : null;
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await quotationTemplateService.getTemplateById(id);
        const data = res?.result ?? res?.data ?? res;
        if (!cancelled) setTemplate(data || null);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Failed to load template");
          setTemplate(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleFileChange = async (fieldKey, e) => {
    const file = e?.target?.files?.[0];
    if (!file || !id) return;
    e.target.value = ""; // reset so same file can be selected again
    setUploading((p) => ({ ...p, [fieldKey]: true }));
    try {
      const res = await quotationTemplateService.uploadTemplateConfigImage(id, fieldKey, file);
      const data = res?.result ?? res?.data ?? res;
      if (data?.template) setTemplate(data.template);
      else if (data?.config) setTemplate((prev) => (prev ? { ...prev, config: data.config } : null));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading((p) => ({ ...p, [fieldKey]: false }));
    }
  };

  const getConfigValue = (fieldKey) => {
    const config = template?.config;
    if (!config) return null;
    if (fieldKey === "default_background") return config.default_background_image_path;
    if (fieldKey === "default_footer") return config.default_footer_image_path;
    if (fieldKey.startsWith("page_")) {
      const num = fieldKey.replace("page_", "");
      return config.page_backgrounds?.[num] ?? null;
    }
    return null;
  };

  if (!id) {
    return (
      <ProtectedRoute>
        <Container className="py-2"><p>Invalid template.</p></Container>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Container className="flex flex-col gap-2 py-2 max-w-[900px] mx-auto">
        <div className="flex items-center gap-2">
          <ThemeButton
            variant="ghost"
            size="sm"
            onClick={() => router.push("/quotation/templates")}
            className="text-muted-foreground"
          >
            ← Templates
          </ThemeButton>
          <h1 className="text-xl font-semibold">
            Template images {template ? `: ${template.name}` : ""}
          </h1>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !template ? (
          <div className="p-8 text-center text-muted-foreground">Template not found.</div>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Upload images for quotation PDF. They are stored in the bucket as public. Default background is used when a page-specific one is not set. For full-page backgrounds (e.g. Page 2), use A4 portrait aspect ratio (~0.7) so the image fills the page without large empty sides.
            </Typography>
            <Grid container spacing={2}>
              {IMAGE_FIELDS.map(({ key, label, help }) => {
                const value = getConfigValue(key);
                const isUploading = uploading[key];
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {label}
                        </Typography>
                        {help && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {help}
                          </Typography>
                        )}
                        {value && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, wordBreak: "break-all" }}>
                            {value}
                          </Typography>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[key] = el; }}
                          disabled={isUploading}
                          onChange={(e) => handleFileChange(key, e)}
                        />
                        <ThemeButton
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={isUploading}
                          className="gap-1"
                          onClick={() => fileInputRefs.current[key]?.click()}
                        >
                          <CloudUploadIcon sx={{ fontSize: 18 }} />
                          {value ? "Replace" : "Upload"}
                        </ThemeButton>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Container>
    </ProtectedRoute>
  );
}
