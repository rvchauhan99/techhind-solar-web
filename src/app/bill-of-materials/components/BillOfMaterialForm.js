"use client";

import { useState, useEffect } from "react";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import productService from "@/services/productService";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import Loader from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@tabler/icons-react";

export default function BillOfMaterialForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    bom_code: "",
    bom_name: "",
    bom_description: "",
    bom_detail: [],
  });
  const [errors, setErrors] = useState({});
  const [bomDetailErrors, setBomDetailErrors] = useState({});

  const [currentDetail, setCurrentDetail] = useState({
    product_type_id: "",
    product_id: "",
    quantity: "",
    description: "",
  });
  const [currentDetailErrors, setCurrentDetailErrors] = useState({});

  const [options, setOptions] = useState({
    products: {},
    allProducts: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsReady, setOptionsReady] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      setOptionsReady(false);
      try {
        const productsRes = await productService.getProducts();
        const productsPayload = productsRes?.result || productsRes;
        const allProducts = productsPayload?.data || [];

        const productsByType = {};
        (allProducts || []).forEach((product) => {
          const typeId = product.product_type_id;
          if (typeId != null) {
            if (!productsByType[typeId]) productsByType[typeId] = [];
            productsByType[typeId].push(product);
          }
        });

        setOptions({
          products: productsByType,
          allProducts: allProducts || [],
        });
      } catch (err) {
        console.error("Failed to load form options", err);
        setOptions((prev) => ({ ...prev, allProducts: [] }));
      } finally {
        setLoadingOptions(false);
        setOptionsReady(true);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    if (!defaultValues || Object.keys(defaultValues).length === 0 || !optionsReady) return;

    const bomDetail = Array.isArray(defaultValues.bom_detail) ? defaultValues.bom_detail : [];

    if (bomDetail.length > 0 && options.allProducts && options.allProducts.length >= 0) {
      const productsMap = {};
      options.allProducts.forEach((product) => {
        productsMap[product.id] = product;
      });
      const enrichedBomDetail = bomDetail.map((detail) => {
        const product = productsMap[detail.product_id];
        if (product) {
          return {
            ...detail,
            product_type_id: product.product_type_id,
            product_name: product.product_name,
          };
        }
        return detail;
      });
      setFormData({
        bom_code: defaultValues.bom_code || "",
        bom_name: defaultValues.bom_name || "",
        bom_description: defaultValues.bom_description || "",
        bom_detail: enrichedBomDetail,
      });
    } else {
      setFormData({
        bom_code: defaultValues.bom_code || "",
        bom_name: defaultValues.bom_name || "",
        bom_description: defaultValues.bom_description || "",
        bom_detail: bomDetail,
      });
    }
  }, [defaultValues, optionsReady, options.allProducts]);

  const getProductName = (productTypeId, productId) => {
    const products = options.products[productTypeId] || [];
    const product = products.find((p) => String(p.id) === String(productId));
    return product ? product.product_name : "Loading...";
  };

  const loadProductsForType = (productTypeId) => {
    if (!productTypeId || options.products[productTypeId]) return;
    const allProducts = options.allProducts || [];
    const filtered = allProducts.filter(
      (product) =>
        product.product_type_id != null && String(product.product_type_id) === String(productTypeId)
    );
    setOptions((prev) => ({
      ...prev,
      products: { ...prev.products, [productTypeId]: filtered },
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleCurrentDetailChange = (field, value) => {
    setCurrentDetail((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "product_type_id") {
      setCurrentDetail((prev) => ({
        ...prev,
        product_id: "",
      }));
      loadProductsForType(value);
    }

    if (currentDetailErrors[field]) {
      setCurrentDetailErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddBomDetail = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const validationErrors = {};
    if (!currentDetail.product_type_id) {
      validationErrors.product_type_id = "Product Type is required";
    }
    if (!currentDetail.product_id) {
      validationErrors.product_id = "Product is required";
    }
    if (!currentDetail.quantity || currentDetail.quantity === "") {
      validationErrors.quantity = "Quantity is required";
    } else if (Number(currentDetail.quantity) <= 0) {
      validationErrors.quantity = "Quantity must be greater than 0";
    }

    if (Object.keys(validationErrors).length > 0) {
      setCurrentDetailErrors(validationErrors);
      return;
    }

    const productId = Number(currentDetail.product_id);
    const isProductAlreadyAdded = formData.bom_detail.some(
      (detail) => Number(detail.product_id) === productId
    );

    if (isProductAlreadyAdded) {
      setCurrentDetailErrors({
        product_id: "Product already added",
      });
      return;
    }

    const selectedProduct = (options.products[currentDetail.product_type_id] || []).find(
      (p) => String(p.id) === String(currentDetail.product_id)
    );
    const productName = selectedProduct ? selectedProduct.product_name : "";

    setFormData((prev) => ({
      ...prev,
      bom_detail: [
        ...prev.bom_detail,
        {
          product_id: Number(currentDetail.product_id),
          quantity: Number(currentDetail.quantity),
          description: currentDetail.description || null,
          product_name: productName,
          product_type_id: Number(currentDetail.product_type_id),
        },
      ],
    }));

    if (errors.bom_detail) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.bom_detail;
        return newErrors;
      });
    }

    setCurrentDetail({
      product_type_id: "",
      product_id: "",
      quantity: "",
      description: "",
    });
    setCurrentDetailErrors({});
  };

  const handleRemoveBomDetail = (index) => {
    setFormData((prev) => {
      const newBomDetail = prev.bom_detail.filter((_, i) => i !== index);
      return {
        ...prev,
        bom_detail: newBomDetail,
      };
    });

    setBomDetailErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`${index}_`)) {
          delete newErrors[key];
        }
      });
      const reindexed = {};
      Object.keys(newErrors).forEach((key) => {
        const [oldIndex, field] = key.split("_", 2);
        const newIndex = parseInt(oldIndex);
        if (newIndex > index) {
          reindexed[`${newIndex - 1}_${field}`] = newErrors[key];
        } else {
          reindexed[key] = newErrors[key];
        }
      });
      return reindexed;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!formData.bom_name || formData.bom_name.trim() === "") {
      validationErrors.bom_name = "BOM Name is required";
    }

    const detailErrors = {};
    if (!formData.bom_detail || formData.bom_detail.length === 0) {
      validationErrors.bom_detail = "At least one BOM detail is required";
    } else {
      formData.bom_detail.forEach((detail, index) => {
        if (!detail.product_id) {
          detailErrors[`${index}_product_id`] = "Product is required";
        }
        if (!detail.quantity || detail.quantity === "") {
          detailErrors[`${index}_quantity`] = "Quantity is required";
        } else if (Number(detail.quantity) <= 0) {
          detailErrors[`${index}_quantity`] = "Quantity must be greater than 0";
        }
      });
    }

    if (Object.keys(validationErrors).length > 0 || Object.keys(detailErrors).length > 0) {
      setErrors(validationErrors);
      setBomDetailErrors(detailErrors);
      return;
    }

    setErrors({});
    setBomDetailErrors({});

    const payload = {
      bom_code: formData.bom_code || null,
      bom_name: formData.bom_name.trim(),
      bom_description: formData.bom_description || null,
      bom_detail: formData.bom_detail.map((detail) => ({
        product_id: Number(detail.product_id),
        quantity: Number(detail.quantity),
        description: detail.description || null,
      })),
    };

    onSubmit(payload);
  };

  if (loadingOptions) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <FormContainer>
      <form id="bom-form" onSubmit={handleSubmit} noValidate className="p-3 space-y-4">
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2"
          >
            <span>{serverError}</span>
            <button
              type="button"
              onClick={onClearServerError}
              className="shrink-0 rounded p-1 hover:bg-destructive/20"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <FormGrid cols={3}>
          <Input
            name="bom_code"
            label="BOM Code"
            value={formData.bom_code}
            onChange={handleChange}
            error={!!errors.bom_code}
            helperText={errors.bom_code}
          />
          <Input
            name="bom_name"
            label="BOM Name"
            value={formData.bom_name}
            onChange={handleChange}
            required
            error={!!errors.bom_name}
            helperText={errors.bom_name}
          />
          <Input
            name="bom_description"
            label="BOM Description"
            value={formData.bom_description}
            onChange={handleChange}
            multiline
            rows={2}
            error={!!errors.bom_description}
            helperText={errors.bom_description}
          />
        </FormGrid>

        <FormSection title="BOM Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
            <AutocompleteField
              name="product_type_id"
              label="Product Type"
              required
              asyncLoadOptions={(q) => getReferenceOptionsSearch("product_type.model", { q, limit: 20 })}
              referenceModel="product_type.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={currentDetail.product_type_id ? { id: currentDetail.product_type_id } : null}
              onChange={(e, newValue) => handleCurrentDetailChange("product_type_id", newValue?.id ?? "")}
              placeholder="Type to search..."
              error={!!currentDetailErrors.product_type_id}
              helperText={currentDetailErrors.product_type_id}
            />
            <AutocompleteField
              name="product_id"
              label="Product"
              required
              options={options.products[currentDetail.product_type_id] || []}
              getOptionLabel={(p) => p?.product_name ?? p?.name ?? ""}
              value={(options.products[currentDetail.product_type_id] || []).find((p) => p.id === currentDetail.product_id) || (currentDetail.product_id ? { id: currentDetail.product_id } : null)}
              onChange={(e, newValue) => handleCurrentDetailChange("product_id", newValue?.id ?? "")}
              placeholder="Type to search..."
              disabled={!currentDetail.product_type_id}
              error={!!currentDetailErrors.product_id}
              helperText={currentDetailErrors.product_id}
            />
            <Input
              type="number"
              label="Qty"
              value={currentDetail.quantity}
              onChange={(e) => handleCurrentDetailChange("quantity", e.target.value)}
              required
              error={!!currentDetailErrors.quantity}
              helperText={currentDetailErrors.quantity}
              inputProps={{ min: 0.01, step: 0.01 }}
            />
            <Input
              label="Description"
              value={currentDetail.description || ""}
              onChange={(e) => handleCurrentDetailChange("description", e.target.value)}
            />
            <div className="flex items-end">
              <Button type="button" variant="default" size="sm" onClick={handleAddBomDetail} className="w-full h-10">
                <IconPlus className="size-4 mr-1.5" />
                Add
              </Button>
            </div>
          </div>

          {errors.bom_detail && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-2">
              {errors.bom_detail}
            </div>
          )}

          {formData.bom_detail.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              No BOM details added. Please add at least one detail.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden flex flex-col min-h-0">
              <div className="shrink-0 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/20">
                Added products ({formData.bom_detail.length})
              </div>
              <div className="max-h-[min(640px,72vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left font-medium p-2">Name</th>
                      <th className="text-left font-medium p-2 w-20">Qty</th>
                      <th className="text-left font-medium p-2">Description</th>
                      <th className="text-right font-medium p-2 w-14">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.bom_detail.map((detail, index) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-2 align-middle">
                          {detail.product_name ||
                            getProductName(detail.product_type_id, detail.product_id)}
                        </td>
                        <td className="p-2 align-middle">{detail.quantity}</td>
                        <td className="p-2 align-middle">{detail.description || "-"}</td>
                        <td className="p-2 text-right align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveBomDetail(index)}
                            aria-label="Remove row"
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FormSection>
      </form>

      <FormActions>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" form="bom-form" size="sm" disabled={loading} loading={loading} className="min-w-[120px]">
          Save
        </Button>
      </FormActions>
    </FormContainer>
  );
}
