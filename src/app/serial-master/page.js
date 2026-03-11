"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { IconEye, IconPencil, IconTrash, IconSparkles } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Loader from "@/components/common/Loader";
import { DIALOG_FORM_XL } from "@/utils/formConstants";
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
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Chip, Typography } from "@mui/material";
import serialMasterService from "@/services/serialMasterService";
import SerialMasterForm from "./components/SerialMasterForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = ["code", "code_op", "is_active"];

const TYPE_LABELS = {
    FIXED: "Fixed",
    DATE: "Date",
    FINANCIAL_YEAR: "FY",
    SERIAL: "Serial",
    SEQUENTIALCHARACTER: "SeqChar",
};

export default function SerialMasterListPage() {
    const { modulePermissions, currentModuleId } = useAuth();
    const currentPerm = modulePermissions?.[currentModuleId] || {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [generating, setGenerating] = useState(null); // code being generated
    const [generatedSerial, setGeneratedSerial] = useState(null); // last generated

    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });
    const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

    const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
    const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);
    const filterParams = useMemo(
        () => Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")),
        [filters]
    );

    // ── Delete ──

    const handleDeleteConfirm = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await serialMasterService.deleteSerialMaster(toDelete.id);
            toast.success("Serial master deactivated");
            setDeleteDialogOpen(false);
            setToDelete(null);
            setTableKey((prev) => prev + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to deactivate");
        } finally {
            setDeleting(false);
        }
    };

    // ── Sidebar ──

    const handleOpenSidebar = useCallback(async (row) => {
        try {
            const res = await serialMasterService.getSerialMasterById(row.id);
            const data = res?.result || res?.data || res;
            setSelectedRow(data);
            setSidebarOpen(true);
        } catch {
            setSelectedRow(row);
            setSidebarOpen(true);
        }
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
        setSelectedRow(null);
    }, []);

    // ── Generate ──

    const handleGenerate = useCallback(async (code) => {
        setGenerating(code);
        try {
            const res = await serialMasterService.generateSerial(code);
            const serial = res?.result?.serial || res?.data?.serial || res?.serial;
            if (serial) {
                setGeneratedSerial({ code, serial });
                toast.success(`Generated: ${serial}`);
            } else {
                toast.error(res?.message || "Failed to generate serial");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Generation failed");
        } finally {
            setGenerating(null);
        }
    }, []);

    // ── Edit Modal ──

    const handleOpenEditModal = useCallback(async (id) => {
        setLoadingRecord(true);
        setServerError(null);
        try {
            const res = await serialMasterService.getSerialMasterById(id);
            const data = res?.result || res?.data || res;
            setSelectedRecord(data);
            setShowEditModal(true);
        } catch (error) {
            toast.error("Failed to load serial master");
        } finally {
            setLoadingRecord(false);
        }
    }, []);

    // ── Fetcher ──

    const fetcher = useMemo(
        () => async (params) => {
            const p = params || {};
            const response = await serialMasterService.listSerialMasters({
                page: p.page,
                limit: p.limit,
                q: p.q || undefined,
            });
            const result = response?.result || response;
            return {
                data: result?.data || result || [],
                meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
            };
        },
        [tableKey]
    );

    // ── Columns ──

    const columns = useMemo(
        () => [
            {
                field: "code",
                label: "Serial Code",
                sortable: true,
                filterType: "text",
                filterKey: "code",
                defaultFilterOperator: "contains",
                render: (row) => (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.code}</Typography>
                ),
            },
            {
                field: "details",
                label: "Segments",
                sortable: false,
                render: (row) => {
                    const details = row.details || [];
                    if (details.length === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
                    return (
                        <div className="flex gap-1 flex-wrap">
                            {details
                                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                                .map((d, i) => (
                                    <Chip key={i} label={TYPE_LABELS[d.type] || d.type} size="small" variant="outlined" />
                                ))}
                        </div>
                    );
                },
            },
            {
                field: "is_active",
                label: "Status",
                sortable: true,
                filterType: "select",
                filterKey: "is_active",
                filterOptions: [
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                ],
                render: (row) => (
                    <Chip
                        label={row.is_active ? "Active" : "Inactive"}
                        color={row.is_active ? "success" : "default"}
                        size="small"
                        variant="outlined"
                    />
                ),
            },
            {
                field: "actions",
                label: "Actions",
                sortable: false,
                isActionColumn: true,
                render: (row, reload) => (
                    <div className="flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => handleOpenSidebar(row)}
                            title="View"
                        >
                            <IconEye className="size-4" />
                        </Button>
                        {currentPerm?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => handleOpenEditModal(row.id)}
                                title="Edit"
                            >
                                <IconPencil className="size-4" />
                            </Button>
                        )}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => handleGenerate(row.code)}
                            disabled={generating === row.code || !row.is_active}
                            title="Generate Serial"
                        >
                            <IconSparkles className="size-4" />
                        </Button>
                        {currentPerm?.can_delete && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                    setToDelete({ id: row.id, reload });
                                    setDeleteDialogOpen(true);
                                }}
                                title="Deactivate"
                            >
                                <IconTrash className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [currentPerm, handleOpenEditModal, handleOpenSidebar, handleGenerate, generating]
    );

    // ── Modal Handlers ──

    const handleOpenAddModal = () => {
        setServerError(null);
        setSelectedRecord(null);
        setShowAddModal(true);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setServerError(null);
        setSelectedRecord(null);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedRecord(null);
        setServerError(null);
    };

    // ── Submit ──

    const handleSubmit = async (payload) => {
        setSubmitting(true);
        setServerError(null);
        try {
            if (selectedRecord?.id) {
                await serialMasterService.updateSerialMaster(selectedRecord.id, payload);
                toast.success("Serial master updated");
                handleCloseEditModal();
            } else {
                await serialMasterService.createSerialMaster(payload);
                toast.success("Serial master created");
                handleCloseAddModal();
            }
            setTableKey((prev) => prev + 1);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to save";
            setServerError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Sidebar Content ──

    const sidebarContent = useMemo(() => {
        if (!selectedRow) return null;
        const r = selectedRow;
        const details = (r.details || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return (
            <div className="pr-1 space-y-4">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Serial Code</p>
                    <p className="text-sm font-bold">{r.code ?? "—"}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Status</p>
                    <Chip
                        label={r.is_active ? "Active" : "Inactive"}
                        color={r.is_active ? "success" : "default"}
                        size="small"
                        variant="outlined"
                    />
                </div>
                {details.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Segments ({details.length})</p>
                        <div className="space-y-2">
                            {details.map((d, i) => (
                                <div key={i} className="border rounded p-2 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <Chip label={TYPE_LABELS[d.type] || d.type} size="small" variant="outlined" />
                                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                                    </div>
                                    <p className="text-xs mt-1">
                                        {d.type === "FIXED" && <>Text: <strong>{d.fixed_char}</strong></>}
                                        {d.type === "DATE" && <>Format: <strong>{d.date_format}</strong></>}
                                        {d.type === "FINANCIAL_YEAR" && <>Format: <strong>{d.date_format}</strong></>}
                                        {d.type === "SERIAL" && <>Width: {d.width} · Start: {d.start_value || "0"}{d.reset_value ? ` · Max: ${d.reset_value}` : ""}{d.reset_interval ? ` · Reset: ${d.reset_interval}` : ""}</>}
                                        {d.type === "SEQUENTIALCHARACTER" && <>Start: <strong>{d.fixed_char || "A"}</strong></>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {generatedSerial?.code === r.code && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">Last Generated</p>
                        <p className="font-mono font-bold text-sm">{generatedSerial.serial}</p>
                    </div>
                )}
            </div>
        );
    }, [selectedRow, generatedSerial]);

    // ── Render ──

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title="Serial Master"
                addButtonLabel={currentPerm.can_create ? "Add Serial" : undefined}
                onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
            >
                <div className="flex flex-col flex-1 min-h-0 gap-2">
                    <PaginatedTable
                        key={tableKey}
                        columns={columns}
                        fetcher={fetcher}
                        showSearch={false}
                        showPagination={false}
                        height="calc(100vh - 200px)"
                        onTotalChange={setTotalCount}
                        columnFilterValues={columnFilterValues}
                        onColumnFilterChange={handleColumnFilterChange}
                        filterParams={{ q: undefined, ...filterParams }}
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
                        rowsPerPageOptions={[20, 50, 100]}
                    />
                </div>

                <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Serial Master Details">
                    {sidebarContent}
                </DetailsSidebar>
            </ListingPageContainer>

            {/* Add Serial Modal */}
            <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
                <DialogContent className={DIALOG_FORM_XL}>
                    <DialogHeader>
                        <DialogTitle>Add Serial Master</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        <SerialMasterForm
                            ref={addFormRef}
                            onSubmit={handleSubmit}
                            loading={submitting}
                            serverError={serverError}
                            onClearServerError={() => setServerError(null)}
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" onClick={handleCloseAddModal} variant="outline" size="sm">
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            loading={submitting}
                            onClick={() => addFormRef.current?.requestSubmit()}
                        >
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Serial Modal */}
            <Dialog open={showEditModal} onOpenChange={(open) => !open && handleCloseEditModal()}>
                <DialogContent className={DIALOG_FORM_XL}>
                    <DialogHeader>
                        <DialogTitle>Edit Serial Master</DialogTitle>
                    </DialogHeader>
                    {loadingRecord ? (
                        <div className="flex flex-1 min-h-[200px] items-center justify-center">
                            <Loader />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                            <SerialMasterForm
                                key={`edit-${selectedRecord?.id}`}
                                ref={editFormRef}
                                defaultValues={selectedRecord}
                                onSubmit={handleSubmit}
                                loading={submitting}
                                serverError={serverError}
                                onClearServerError={() => setServerError(null)}
                            />
                        </div>
                    )}
                    <DialogFooter className="pt-4">
                        <Button type="button" onClick={handleCloseEditModal} variant="outline" size="sm">
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            loading={submitting}
                            disabled={loadingRecord}
                            onClick={() => editFormRef.current?.requestSubmit()}
                        >
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setToDelete(null); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Serial Master</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to deactivate this serial master? It can be reactivated later via edit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} loading={deleting}>
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
