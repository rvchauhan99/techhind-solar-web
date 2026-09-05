"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import productionBomService from "@/services/productionBomService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    IconCircleCheck,
    IconCircleOff,
    IconCopy,
    IconEye,
    IconPencil,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";

const COLUMN_FILTER_KEYS = [
    "bom_code",
    "bom_code_op",
    "bom_name",
    "bom_name_op",
    "fg_product_name",
    "fg_product_name_op",
    "status",
    "is_default",
];

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Draft" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
];

const DEFAULT_OPTIONS = [
    { value: "true", label: "Default version" },
    { value: "false", label: "Not default" },
];

const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "default";
    if (s === "inactive") return "destructive";
    return "outline";
};

const money = (value) => Number(value || 0).toFixed(2);

export default function ProductionBomPage() {
    const { modulePermissions, currentModuleId } = useAuth();
    const router = useRouter();
    const currentPerm = modulePermissions?.[currentModuleId] || {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
    };

    const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
        useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });

    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedBom, setSelectedBom] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
    const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

    const filterParams = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
            ),
        [filters]
    );

    const handleOpenSidebar = useCallback(async (id) => {
        setLoadingRecord(true);
        setSidebarOpen(true);
        try {
            const response = await productionBomService.getProductionBomById(id);
            setSelectedBom(response?.result || response);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load production BOM"));
            setSidebarOpen(false);
        } finally {
            setLoadingRecord(false);
        }
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
        setSelectedBom(null);
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const blob = await productionBomService.exportProductionBoms(filterParams);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `production-boms-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Export completed");
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to export production BOMs"));
        } finally {
            setExporting(false);
        }
    }, [filterParams]);

    const handleActionConfirm = async () => {
        if (!pendingAction) return;
        const { type, row } = pendingAction;
        setActionSubmitting(true);
        try {
            if (type === "activate") {
                await productionBomService.activateProductionBom(row.id, { make_default: true });
                toast.success(`BOM ${row.bom_code || row.id} activated as the default version`);
            } else if (type === "deactivate") {
                await productionBomService.deactivateProductionBom(row.id);
                toast.success(`BOM ${row.bom_code || row.id} deactivated`);
            } else if (type === "clone") {
                const response = await productionBomService.cloneProductionBom(row.id);
                const created = response?.result || response;
                toast.success(`Cloned as version ${created?.version_no ?? "new"} in DRAFT`);
            }
            setTableKey((prev) => prev + 1);
            setPendingAction(null);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Action failed"));
        } finally {
            setActionSubmitting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                field: "bom_code",
                label: "BOM Code",
                sortable: true,
                filterType: "text",
                filterKey: "bom_code",
                defaultFilterOperator: "contains",
                render: (row) => row.bom_code || `#${row.id}`,
            },
            {
                field: "bom_name",
                label: "BOM Name",
                sortable: true,
                filterType: "text",
                filterKey: "bom_name",
                defaultFilterOperator: "contains",
            },
            {
                field: "fg_product",
                label: AP.fg.replace(" (FG)", ""),
                sortable: false,
                filterType: "text",
                filterKey: "fg_product_name",
                defaultFilterOperator: "contains",
                render: (row) => row.fgProduct?.product_name || "-",
            },
            {
                field: "version_no",
                label: "Ver",
                sortable: true,
                render: (row) => (
                    <span className="inline-flex items-center gap-1">
                        v{row.version_no}
                        {row.is_default && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                Default
                            </Badge>
                        )}
                    </span>
                ),
            },
            {
                field: "output_quantity",
                label: "Output Qty",
                sortable: true,
            },
            {
                field: "component_count",
                label: "Components",
                sortable: false,
            },
            {
                field: "std_material_cost",
                label: "Std Material",
                sortable: true,
                render: (row) => money(row.std_material_cost),
            },
            {
                field: "std_operation_cost",
                label: "Std Operations",
                sortable: true,
                render: (row) => money(row.std_operation_cost),
            },
            {
                field: "std_total_cost",
                label: "Std Total",
                sortable: true,
                render: (row) => <span className="font-semibold">{money(row.std_total_cost)}</span>,
            },
            {
                field: "is_default",
                label: "Default",
                sortable: true,
                filterType: "select",
                filterKey: "is_default",
                filterOptions: DEFAULT_OPTIONS,
                render: (row) => (row.is_default ? "Yes" : "No"),
            },
            {
                field: "status",
                label: "Status",
                sortable: true,
                filterType: "select",
                filterKey: "status",
                filterOptions: STATUS_OPTIONS,
                render: (row) => (
                    <Badge
                        variant={getStatusVariant(row.status)}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                        {row.status || "-"}
                    </Badge>
                ),
            },
            {
                field: "actions",
                label: "Actions",
                sortable: false,
                isActionColumn: true,
                render: (row, reload, perms) => (
                    <div className="flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => handleOpenSidebar(row.id)}
                            title="View"
                            aria-label="View"
                        >
                            <IconEye className="size-4" />
                        </Button>
                        {row.status !== "ACTIVE" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => router.push(`/production-bom/edit?id=${row.id}`)}
                                title="Edit"
                                aria-label="Edit"
                            >
                                <IconPencil className="size-4" />
                            </Button>
                        )}
                        {perms?.can_create && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => setPendingAction({ type: "clone", row })}
                                title="Clone as new version"
                                aria-label="Clone as new version"
                            >
                                <IconCopy className="size-4" />
                            </Button>
                        )}
                        {row.status !== "ACTIVE" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => setPendingAction({ type: "activate", row })}
                                title="Activate"
                                aria-label="Activate"
                            >
                                <IconCircleCheck className="size-4" />
                            </Button>
                        )}
                        {row.status === "ACTIVE" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => setPendingAction({ type: "deactivate", row })}
                                title="Deactivate"
                                aria-label="Deactivate"
                            >
                                <IconCircleOff className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [handleOpenSidebar, router]
    );

    const fetcher = useMemo(
        () => async (params) => {
            const p = params || {};
            const response = await productionBomService.getProductionBoms({
                page: p.page,
                limit: p.limit,
                sortBy: p.sortBy || "id",
                sortOrder: p.sortOrder || "DESC",
                bom_code: p.bom_code || undefined,
                bom_name: p.bom_name || undefined,
                fg_product_name: p.fg_product_name || undefined,
                status: p.status || undefined,
                is_default: p.is_default || undefined,
            });
            const result = response?.result || response;
            return {
                data: result?.data || [],
                meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
            };
        },
        [tableKey]
    );

    const sidebarContent = useMemo(() => {
        if (loadingRecord) {
            return (
                <div className="flex min-h-[200px] items-center justify-center">
                    <span className="text-muted-foreground">Loading...</span>
                </div>
            );
        }
        if (!selectedBom) return null;
        const bom = selectedBom;
        return (
            <div className="space-y-2 pr-1 text-sm">
                <div className="flex items-center gap-2">
                    <p className="font-semibold">{bom.bom_code || `#${bom.id}`}</p>
                    <Badge
                        variant={getStatusVariant(bom.status)}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                        {bom.status}
                    </Badge>
                    <Badge variant="outline" className="px-2 py-0 text-xs">
                        v{bom.version_no}
                    </Badge>
                    {bom.is_default && (
                        <Badge variant="secondary" className="px-2 py-0 text-xs">
                            Default
                        </Badge>
                    )}
                </div>
                <p>{bom.bom_name}</p>
                <hr className="border-border" />
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div>
                        <span className="block font-semibold text-muted-foreground">{AP.fg.replace(" (FG)", "")}</span>
                        {bom.fgProduct?.product_name || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Output Qty</span>
                        {bom.output_quantity} {bom.measurementUnit?.unit || ""}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Effective From</span>
                        {bom.effective_from || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Effective To</span>
                        {bom.effective_to || "-"}
                    </div>
                </div>
                {bom.bom_description && (
                    <p className="text-xs text-muted-foreground">{bom.bom_description}</p>
                )}

                {bom.components?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            Components ({bom.components.length})
                        </p>
                        <div className="mt-1 overflow-hidden rounded-md border border-border">
                            <table className="w-full text-xs">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-left font-semibold">Substitutes</th>
                                        <th className="px-2 py-1 text-right font-semibold">Qty/Out</th>
                                        <th className="px-2 py-1 text-right font-semibold">Scrap %</th>
                                        <th className="px-2 py-1 text-right font-semibold">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bom.components.map((line) => (
                                        <tr key={line.id} className="border-t border-border">
                                            <td className="px-2 py-1">
                                                {line.product?.product_name || "-"}
                                                {line.is_optional && (
                                                    <span className="ml-1 text-muted-foreground">(optional)</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-muted-foreground">
                                                {(line.substituteProducts || [])
                                                    .map((p) => p.product_name)
                                                    .filter(Boolean)
                                                    .join(", ") ||
                                                    (Array.isArray(line.substitute_product_ids) &&
                                                    line.substitute_product_ids.length > 0
                                                        ? line.substitute_product_ids.join(", ")
                                                        : "-")}
                                            </td>
                                            <td className="px-2 py-1 text-right">{Number(line.quantity_per)}</td>
                                            <td className="px-2 py-1 text-right">{Number(line.scrap_percent)}</td>
                                            <td className="px-2 py-1 text-right">{money(line.std_rate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {bom.operations?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            Operations ({bom.operations.length})
                        </p>
                        <div className="mt-1 overflow-hidden rounded-md border border-border">
                            <table className="w-full text-xs">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Operation</th>
                                        <th className="px-2 py-1 text-left font-semibold">Type</th>
                                        <th className="px-2 py-1 text-right font-semibold">Min</th>
                                        <th className="px-2 py-1 text-right font-semibold">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bom.operations.map((line) => (
                                        <tr key={line.id} className="border-t border-border">
                                            <td className="px-2 py-1">{line.operation_name}</td>
                                            <td className="px-2 py-1">{line.cost_type}</td>
                                            <td className="px-2 py-1 text-right">{Number(line.std_time_minutes)}</td>
                                            <td className="px-2 py-1 text-right">{money(line.std_cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-2 space-y-1 rounded-md border border-border bg-muted/50 p-2 text-xs">
                    <div className="flex justify-between">
                        <span>Std Material Cost</span>
                        <span>{money(bom.std_material_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Std Operation Cost</span>
                        <span>{money(bom.std_operation_cost)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>Std Total Cost</span>
                        <span>{money(bom.std_total_cost)}</span>
                    </div>
                </div>
            </div>
        );
    }, [loadingRecord, selectedBom]);

    const actionCopy = {
        activate: {
            title: AP.bom.activate,
            description:
                "This version becomes the ACTIVE default BOM for the finished good. Other versions lose their default flag.",
            action: "Activate",
        },
        deactivate: {
            title: AP.bom.deactivate,
            description:
                "The BOM will no longer be selectable for new work orders. Open work orders keep their frozen snapshot.",
            action: "Deactivate",
        },
        clone: {
            title: "Clone as New Version",
            description:
                "A DRAFT copy is created with the next version number so you can revise it without affecting open work orders.",
            action: "Clone",
        },
    };
    const copy = pendingAction ? actionCopy[pendingAction.type] : null;

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title={AP.bom.title}
                addButtonLabel={currentPerm.can_create ? "Create BOM" : undefined}
                onAddClick={currentPerm.can_create ? () => router.push("/production-bom/new") : undefined}
                exportButtonLabel="Export"
                onExportClick={handleExport}
                exportDisabled={exporting}
            >
                <PaginatedTable
                    key={tableKey}
                    columns={columns}
                    fetcher={fetcher}
                    moduleKey="production-bom"
                    height="calc(100vh - 200px)"
                    showSearch={false}
                    showPagination={false}
                    compactDensity
                    onTotalChange={setTotalCount}
                    columnFilterValues={columnFilterValues}
                    onColumnFilterChange={handleColumnFilterChange}
                    filterParams={{ q: undefined, ...filterParams }}
                    onRowClick={(row) => handleOpenSidebar(row.id)}
                    page={page}
                    limit={limit}
                    q={q}
                    sortBy={sortBy || "id"}
                    sortOrder={sortOrder || "DESC"}
                    onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                    onRowsPerPageChange={setLimit}
                    onQChange={setQ}
                    onSortChange={setSort}
                />
                <PaginationControls
                    page={page - 1}
                    rowsPerPage={limit}
                    totalCount={totalCount}
                    onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                    onRowsPerPageChange={setLimit}
                    rowsPerPageOptions={[20, 50, 100, 200]}
                />
            </ListingPageContainer>

            <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title={AP.bom.details}>
                {sidebarContent}
            </DetailsSidebar>

            <AlertDialog
                open={!!pendingAction}
                onOpenChange={(open) => {
                    if (!open) setPendingAction(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {copy?.description}
                            {pendingAction && (
                                <span className="mt-2 block text-muted-foreground">
                                    BOM: {pendingAction.row.bom_code || `#${pendingAction.row.id}`} v
                                    {pendingAction.row.version_no} ·{" "}
                                    {pendingAction.row.fgProduct?.product_name || ""}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleActionConfirm}
                            disabled={actionSubmitting}
                            loading={actionSubmitting}
                        >
                            {copy?.action}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
