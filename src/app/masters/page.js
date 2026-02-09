"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import mastersService from "@/services/mastersService";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import MasterForm from "./components/MasterForm";
import SearchInput from "@/components/common/SearchInput";
import Loader from "@/components/common/Loader";
import { Button as ThemeButton } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError } from "@/utils/toast";

export default function MastersPage() {
    const { modulePermissions, currentModuleId } = useAuth();
    const [masters, setMastersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [master, setMaster] = useState({});
    const [fields, setFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [tableKey, setTableKey] = useState(0); // Key to force table re-render
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [masterSearchQuery, setMasterSearchQuery] = useState(""); // Search query for filtering masters
    const [highlightedIndex, setHighlightedIndex] = useState(-1); // Index of highlighted master in filtered list

    const [requiredFields, setRequiredFields] = useState([]); // Store required fields for current master

    // Upload CSV state
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Delete confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTargetRow, setDeleteTargetRow] = useState(null);
    const deleteReloadRef = useRef(null);

    useEffect(() => {
        mastersService.mastersList().then((res) => {
            const mastersList = res.result || res.data || [];
            setMastersList(mastersList);
        }).catch(() => setMastersList([])).finally(() => setLoading(false));
    }, []);

    // Filter masters based on search query
    const filteredMasters = useMemo(() => {
        if (!masterSearchQuery.trim()) {
            return masters;
        }
        const query = masterSearchQuery.toLowerCase().trim();
        return masters.filter((master) =>
            master.name?.toLowerCase().includes(query)
            // ||
            // master.model_name?.toLowerCase().includes(query)
        );
    }, [masters, masterSearchQuery]);

    // Reset highlighted index when search query changes or filtered list changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [masterSearchQuery, filteredMasters.length]);

    // Reset pagination when master selection changes
    useEffect(() => {
        setPage(0);
    }, [master?.id, master?.model_name]);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (filteredMasters.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const nextIndex = prev < filteredMasters.length - 1 ? prev + 1 : 0;
                return nextIndex;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const nextIndex = prev > 0 ? prev - 1 : filteredMasters.length - 1;
                return nextIndex;
            });
        } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredMasters.length) {
            e.preventDefault();
            onClickMaster(filteredMasters[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setMasterSearchQuery('');
            setHighlightedIndex(-1);
        }
    };

    const currentPerm = modulePermissions?.[currentModuleId] || { can_create: false, can_read: false, can_update: false, can_delete: false };

    async function onClickMaster(selectedMaster) {
        setMaster(selectedMaster);
        // Set required fields from masters.json
        setRequiredFields(selectedMaster.required_fields || []);
        if (selectedMaster.model_name) {
            setLoadingFields(true);
            try {
                // Fetch first page to get fields structure
                const response = await mastersService.getList(selectedMaster.model_name, { page: 1, limit: 1 });
                const result = response.result || response;
                if (result.fields) {
                    setFields(result.fields);
                }
            } catch (error) {
                console.error('Error fetching fields:', error);
                setFields([]);
            } finally {
                setLoadingFields(false);
            }
        }
    }

    // Dynamically generate columns from fields
    const columns = useMemo(() => {
        const cols = [];

        // Add columns from fields (skip id, password, and internal fields)
        const skipFields = ['id', 'password', 'created_at', 'updated_at', 'deleted_at'];
        fields.forEach((field) => {
            if (!skipFields.includes(field.name)) {
                // Check if this is a reference field (foreign key)
                if (field.reference) {
                    // For reference fields, show the display value instead of ID
                    // Remove _id suffix and format the label properly
                    let label = field.name;
                    if (label.endsWith('_id')) {
                        label = label.replace(/_id$/, ''); // Remove _id suffix
                    }
                    // Convert snake_case to Title Case and replace underscores with spaces
                    label = label
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');

                    cols.push({
                        field: field.name,
                        label: label,
                        render: (row) => {
                            // Use _display suffix if available, otherwise fallback to ID
                            const displayValue = row[`${field.name}_display`];
                            if (displayValue !== null && displayValue !== undefined) {
                                return String(displayValue);
                            }
                            // Fallback to ID if display value not available
                            const value = row[field.name];
                            return value !== null && value !== undefined ? String(value) : '';
                        }
                    });
                } else {
                    // Regular field
                    // Special handling for file upload fields
                    if (field.isFileUpload) {
                        cols.push({
                            field: field.name,
                            label: 'File',
                            render: (row) => {
                                const value = row[field.name];
                                if (!value) return '';
                                const modelName = master?.model_name;
                                if (!modelName) return value;
                                return (
                                    <ThemeButton
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                const url = await mastersService.getFileUrl(modelName, row.id);
                                                if (url) window.open(url, '_blank');
                                            } catch (e) {
                                                console.error('Failed to get file URL', e);
                                                toastError(e?.response?.data?.message || "Failed to get file URL");
                                            }
                                        }}
                                    >
                                        View
                                    </ThemeButton>
                                );
                            }
                        });
                    } else {
                        cols.push({
                            field: field.name,
                            label: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/_/g, ' '),
                            render: (row) => {
                                const value = row[field.name];
                                if (value === null || value === undefined) return '';
                                if (field.type === 'BOOLEAN') return value ? 'Yes' : 'No';
                                if (field.type === 'DATE') return new Date(value).toLocaleDateString();
                                return String(value);
                            }
                        });
                    }
                }
            }
        });

        // Add actions column
        cols.push({
            field: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row, reload, perms) => (
                <div className="flex gap-1 flex-wrap">
                    {(perms || currentPerm).can_read ? (
                        <ThemeButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenViewModal(row.id)}
                        >
                            View
                        </ThemeButton>
                    ) : null}
                    {(perms || currentPerm).can_update ? (
                        <ThemeButton
                            size="sm"
                            onClick={() => handleOpenEditModal(row.id)}
                        >
                            Edit
                        </ThemeButton>
                    ) : null}
                    {(perms || currentPerm).can_delete ? (
                        <ThemeButton
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                                deleteReloadRef.current = reload;
                                setDeleteTargetRow(row);
                                setDeleteConfirmOpen(true);
                            }}
                        >
                            Delete
                        </ThemeButton>
                    ) : null}
                </div>
            ),
        });

        return cols;
    }, [fields, master, currentPerm]);

    // Fetcher function for PaginatedTable
    const fetcher = useMemo(() => {
        if (!master.model_name) return null;
        return async ({ page, limit, q }) => {
            const response = await mastersService.getList(master.model_name, { page, limit, q });
            // Return in format expected by PaginatedTable
            const result = response.result || response;
            return {
                data: result.data || [],
                meta: result.meta || { total: 0, page, pages: 0, limit }
            };
        };
    }, [master.model_name, tableKey]); // Include tableKey to force refresh when it changes

    const handleOpenAddModal = () => {
        setShowAddModal(true);
        setServerError(null);
        setSelectedRecord(null);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setServerError(null);
        setSelectedRecord(null);
    };

    const handleOpenViewModal = async (id) => {
        if (!master.model_name) return;
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await mastersService.getMasterById(id, master.model_name);
            const result = response.result || response;
            setSelectedRecord(result);
            setShowViewModal(true);
        } catch (error) {
            console.error('Error fetching record:', error);
            setServerError('Failed to load record');
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedRecord(null);
        setServerError(null);
    };

    const handleOpenEditModal = async (id) => {
        if (!master.model_name) return;
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await mastersService.getMasterById(id, master.model_name);
            const result = response.result || response;
            setSelectedRecord(result);
            setShowEditModal(true);
        } catch (error) {
            console.error('Error fetching record:', error);
            setServerError('Failed to load record');
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedRecord(null);
        setServerError(null);
    };

    const handleSubmit = async (payload, file = null) => {
        if (!master.model_name) {
            setServerError('Model is required');
            return;
        }

        setSubmitting(true);
        setServerError(null);

        try {
            if (selectedRecord?.id) {
                // Update existing record
                await mastersService.updateMaster(selectedRecord.id, payload, master.model_name, file);
                handleCloseEditModal();
            } else {
                // Create new record
                await mastersService.createMaster(payload, master.model_name, file);
                handleCloseAddModal();
            }
            // Force table to reload by changing key
            setTableKey(prev => prev + 1);
        } catch (err) {
            setServerError(err.response?.data?.message || err.message || 'Failed to save record');
        } finally {
            setSubmitting(false);
        }
    };

    const calculateMaxHeight = () => {
        // Optimized: Navbar(56px) + Toolbar(40px) + Page header(~54px) = ~150px (no footer)
        return `calc(100vh - 125px)`;
    };

    const calculatePaginatedTableHeight = () => {
        // Optimized: Navbar(56px) + Toolbar(40px) + Page header(~54px) = ~150px (no footer)
        return `calc(100vh - 180px)`;
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetRow?.id || !master?.model_name) {
            toastError('Missing record ID or model name');
            setDeleteConfirmOpen(false);
            setDeleteTargetRow(null);
            return;
        }
        try {
            await mastersService.deleteMaster(deleteTargetRow.id, master.model_name);
            toastSuccess('Record deleted successfully');
            setTableKey((prev) => prev + 1);
            if (deleteReloadRef.current) {
                setTimeout(() => deleteReloadRef.current(), 100);
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete record';
            toastError(msg);
        } finally {
            setDeleteConfirmOpen(false);
            setDeleteTargetRow(null);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="flex justify-center items-center min-h-[400px]">
                    <Loader />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="flex flex-col h-full">
                <h1 className="text-2xl font-bold mb-2">Masters</h1>

                <div className="flex gap-0 flex-1 min-h-0">
                    {/* Master List Sidebar */}
                    <aside
                        className="min-w-[200px] border-r border-border pr-4 flex flex-col flex-shrink-0"
                        style={{ maxHeight: calculateMaxHeight() }}
                    >
                        <SearchInput
                            placeholder="Search masters..."
                            value={masterSearchQuery}
                            onChange={(e) => setMasterSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="mb-2"
                        />
                        <ul className="list-none p-0 m-0 overflow-y-auto flex-1">
                            {filteredMasters.length > 0 ? (
                                filteredMasters.map((m, index) => {
                                    const isSelected = master.id === m.id;
                                    const isHighlighted = highlightedIndex === index;
                                    return (
                                        <li
                                            key={m.id ?? index}
                                            onClick={() => {
                                                onClickMaster(m);
                                                setHighlightedIndex(index);
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            ref={(el) => {
                                                if (el && isHighlighted) {
                                                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                }
                                            }}
                                            className={`py-2 pl-4 cursor-pointer transition-all text-sm border-l-[3px] ${
                                                isSelected
                                                    ? 'text-primary font-semibold border-l-primary'
                                                    : 'text-muted-foreground border-l-transparent'
                                            } ${isHighlighted ? 'bg-muted/50' : ''} hover:text-primary hover:bg-muted/50`}
                                        >
                                            {m.name}
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="p-2 text-center text-sm text-muted-foreground">
                                    No masters found
                                </li>
                            )}
                        </ul>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 pl-4 overflow-hidden flex flex-col min-w-0">
                        {master.name ? (
                            <>
                                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                    <h2 className="text-xl font-semibold">{master.name} Master</h2>
                                    <div className="flex gap-2 flex-wrap">
                                        <ThemeButton
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                if (!master.model_name) return;
                                                try {
                                                    const blob = await mastersService.downloadSampleCsv(master.model_name);
                                                    const url = window.URL.createObjectURL(new Blob([blob]));
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    const fname = `${master.model_name.replace(/\\.model$/i, '')}-sample.csv`;
                                                    link.setAttribute('download', fname);
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    link.parentNode?.removeChild(link);
                                                    window.URL.revokeObjectURL(url);
                                                    toastSuccess('Sample CSV downloaded');
                                                } catch (e) {
                                                    toastError('Failed to download sample');
                                                }
                                            }}
                                        >
                                            Sample CSV
                                        </ThemeButton>
                                        <ThemeButton
                                            size="sm"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            loading={uploading}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload CSV'}
                                        </ThemeButton>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !master.model_name) return;
                                                setUploading(true);
                                                try {
                                                    const res = await mastersService.uploadMasterCsv(master.model_name, file);
                                                    if (res.csvBlob) {
                                                        const url = window.URL.createObjectURL(new Blob([res.csvBlob], { type: 'text/csv' }));
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', res.filename || `${master.model_name}-upload-result.csv`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        link.remove();
                                                        window.URL.revokeObjectURL(url);
                                                    }
                                                    const inserted = res?.summary?.inserted ?? res?.result?.inserted ?? res?.inserted ?? 0;
                                                    const failed = res?.summary?.failed ?? res?.result?.failed ?? res?.failed ?? 0;
                                                    const total = res?.summary?.total ?? res?.result?.total ?? res?.total ?? 0;
                                                    toastSuccess(`Upload complete. Total: ${total}, Inserted: ${inserted}, Failed: ${failed}. Result CSV downloaded.`);
                                                    setTableKey((prev) => prev + 1);
                                                } catch (err) {
                                                    if (err.response?.data instanceof Blob) {
                                                        const text = await err.response.data.text();
                                                        let errorMsg = 'Upload failed';
                                                        try {
                                                            const errorJson = JSON.parse(text);
                                                            errorMsg = errorJson.message || errorJson.error || errorMsg;
                                                        } catch (e) {
                                                            errorMsg = text || errorMsg;
                                                        }
                                                        toastError(errorMsg);
                                                    } else {
                                                        toastError(err?.response?.data?.message || err?.message || 'Upload failed');
                                                    }
                                                } finally {
                                                    setUploading(false);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }
                                            }}
                                        />
                                        {currentPerm.can_create ? (
                                            <ThemeButton size="sm" onClick={handleOpenAddModal}>
                                                + Add {master.name}
                                            </ThemeButton>
                                        ) : null}
                                    </div>
                                </div>

                                {loadingFields ? (
                                    <div className="flex justify-center items-center min-h-[200px]">
                                        <Loader />
                                    </div>
                                ) : master.model_name && fetcher ? (
                                    <>
                                        <PaginatedTable
                                            key={tableKey}
                                            moduleKey={master.model_name}
                                            columns={columns}
                                            fetcher={fetcher}
                                            initialLimit={20}
                                            showPagination={false}
                                            onTotalChange={setTotalCount}
                                            page={page + 1}
                                            limit={limit}
                                            onPageChange={(zeroBased) => setPage(zeroBased)}
                                            onRowsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(0); }}
                                            height={calculatePaginatedTableHeight()}
                                        />
                                        <PaginationControls
                                            page={page}
                                            rowsPerPage={limit}
                                            totalCount={totalCount}
                                            onPageChange={setPage}
                                            onRowsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(0); }}
                                            rowsPerPageOptions={[20, 50, 100, 200]}
                                        />
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Select a master from the list to view data</p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">Select a master from the list to view data</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Master Dialog */}
            <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) handleCloseAddModal(); }}>
                <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                    <DialogHeader>
                        <DialogTitle>Add {master.name}</DialogTitle>
                    </DialogHeader>
                    <div className="pt-2">
                        <MasterForm
                            fields={fields}
                            onSubmit={handleSubmit}
                            loading={submitting}
                            serverError={serverError}
                            onClearServerError={() => setServerError(null)}
                            masterName={master.name}
                            onCancel={handleCloseAddModal}
                            requiredFields={requiredFields}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Master Dialog */}
            <Dialog open={showViewModal} onOpenChange={(open) => { if (!open) handleCloseViewModal(); }}>
                <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                    <DialogHeader>
                        <DialogTitle>View {master.name}</DialogTitle>
                    </DialogHeader>
                    <div className="pt-2">
                        {loadingRecord ? (
                            <div className="flex justify-center items-center min-h-[200px]">
                                <Loader />
                            </div>
                        ) : (
                            <MasterForm
                                fields={fields}
                                defaultValues={selectedRecord}
                                onSubmit={() => {}}
                                loading={false}
                                serverError={serverError}
                                onClearServerError={() => setServerError(null)}
                                masterName={master.name}
                                onCancel={handleCloseViewModal}
                                viewMode={true}
                                requiredFields={requiredFields}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Master Dialog */}
            <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) handleCloseEditModal(); }}>
                <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton={true}>
                    <DialogHeader>
                        <DialogTitle>Edit {master.name}</DialogTitle>
                    </DialogHeader>
                    <div className="pt-2">
                        {loadingRecord ? (
                            <div className="flex justify-center items-center min-h-[200px]">
                                <Loader />
                            </div>
                        ) : (
                            <MasterForm
                                fields={fields}
                                defaultValues={selectedRecord}
                                onSubmit={handleSubmit}
                                loading={submitting}
                                serverError={serverError}
                                onClearServerError={() => setServerError(null)}
                                masterName={master.name}
                                onCancel={handleCloseEditModal}
                                requiredFields={requiredFields}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {master.name} record?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction size="sm" variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
