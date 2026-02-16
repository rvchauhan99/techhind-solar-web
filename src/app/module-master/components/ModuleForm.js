"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { getAvailableIcons, getIcon, isValidIcon } from "@/utils/iconMapper";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModuleForm = forwardRef(function ModuleForm(
  {
    defaultValues = {},
    onSubmit,
    loading,
    parentOptions = [],
    serverError = null,
    onClearServerError = () => {},
    viewMode = false,
    onCancel = null,
  },
  ref
) {
  const base = {
    name: "",
    key: "",
    icon: "",
    parent_id: null,
    route: "",
    sequence: 0,
    status: "active",
    authorize_with_params: false,
  };

  const [formData, setFormData] = useState({
    ...base,
    ...(defaultValues || {}),
  });
  const [iconError, setIconError] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    if (
      defaultValues &&
      (defaultValues.id || Object.keys(defaultValues).length)
    ) {
      setFormData({ ...base, ...defaultValues });
    } else {
      setFormData(base);
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isCheckbox = typeof e.target.checked === "boolean";
    const nextValue = isCheckbox ? e.target.checked : value;

    if (serverError) onClearServerError();

    if (name === "icon") {
      const selectedIcon = value;
      if (selectedIcon && selectedIcon.trim() !== "") {
        if (!isValidIcon(selectedIcon)) {
          setIconError(`Invalid icon: "${selectedIcon}"`);
        } else {
          setIconError("");
        }
      } else {
        setIconError("");
      }
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.icon && formData.icon.trim() !== "") {
      if (!isValidIcon(formData.icon)) {
        setIconError(
          `Invalid icon: "${formData.icon}". Please select a valid icon from the list.`
        );
        return;
      }
    }

    const seqVal = formData.sequence;
    const isAutoSeq = seqVal === "" || seqVal == null || Number(seqVal) === 0;
    const payload = {
      ...formData,
      parent_id: formData.parent_id ? formData.parent_id : null,
      sequence: isAutoSeq ? null : Number(seqVal),
      authorize_with_params: !!formData.authorize_with_params,
    };

    onSubmit(payload);
  };

  useImperativeHandle(ref, () => ({
    requestSubmit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
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

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col h-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Input
            name="name"
            label="Name"
            value={formData.name || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
          />
          <Input
            name="key"
            label="Key"
            value={formData.key || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
          />
          <Select
            name="parent_id"
            label="Parent Module"
            value={formData.parent_id ?? ""}
            onChange={handleChange}
            disabled={viewMode}
          >
            <MenuItem value="">None</MenuItem>
            {parentOptions.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="icon"
            label="Icon"
            value={formData.icon || ""}
            onChange={handleChange}
            disabled={viewMode}
            error={!!iconError}
            helperText={iconError}
            placeholder="Select an icon"
            renderValue={(value) => {
              if (!value) return "Select an icon";
              const IconComponent = getIcon(value);
              const valid = isValidIcon(value);
              return (
                <span className="flex items-center gap-2">
                  <IconComponent className="size-4 shrink-0" />
                  <span>{value}</span>
                  {!valid && value && (
                    <span className="text-xs text-destructive ml-1">(Invalid)</span>
                  )}
                </span>
              );
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {getAvailableIcons()
              .sort((a, b) => {
                if (a.category !== b.category) {
                  return a.category.localeCompare(b.category);
                }
                return a.label.localeCompare(b.label);
              })
              .map((icon) => {
                const IconComponent = icon.component;
                return (
                  <MenuItem key={icon.name} value={icon.name}>
                    <span className="flex items-center gap-2 w-full">
                      <IconComponent className="size-4 shrink-0" />
                      <span className="flex flex-col">
                        <span className="text-sm">{icon.label}</span>
                        <span className="text-xs text-muted-foreground">{icon.category}</span>
                      </span>
                    </span>
                  </MenuItem>
                );
              })}
          </Select>

          {formData.icon && (
            <div className="md:col-span-2">
              <div
                className={cn(
                  "p-4 rounded-lg border flex flex-col items-center gap-1",
                  isValidIcon(formData.icon)
                    ? "bg-muted/50 border-border"
                    : "bg-destructive/10 border-destructive"
                )}
              >
                <span className="text-xs text-muted-foreground">Icon Preview</span>
                {(() => {
                  const IconComponent = getIcon(formData.icon);
                  return (
                    <IconComponent
                      className={cn(
                        "size-10",
                        isValidIcon(formData.icon)
                          ? "text-primary"
                          : "text-destructive"
                      )}
                    />
                  );
                })()}
                <span className="text-sm text-muted-foreground">{formData.icon}</span>
                {!isValidIcon(formData.icon) && (
                  <span className="text-xs text-destructive">Invalid icon name</span>
                )}
              </div>
            </div>
          )}

          <Input
            name="route"
            label="Route"
            value={formData.route || ""}
            onChange={handleChange}
            disabled={viewMode}
          />
          <Input
            name="sequence"
            label="Sequence"
            type="number"
            value={formData.sequence ?? ""}
            onChange={handleChange}
            disabled={viewMode}
            placeholder="Auto"
            helperText="Leave 0 or blank for auto-assignment"
          />
          <Select
            name="status"
            label="Status"
            value={formData.status || "active"}
            onChange={handleChange}
            disabled={viewMode}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>

          <div className="md:col-span-2">
            <Checkbox
              name="authorize_with_params"
              label="Authorize with params"
              checked={!!formData.authorize_with_params}
              onChange={handleChange}
              disabled={viewMode}
              helperText="When checked, the module may use query parameters in permission checks (future use). Default: path only."
            />
          </div>
        </div>
      </form>
    </>
  );
});

ModuleForm.displayName = "ModuleForm";

export default ModuleForm;
