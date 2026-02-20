"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { IconTrash, IconPencil, IconFileDescription, IconMapPin } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import ProtectedRoute from "@/components/common/ProtectedRoute";
import b2bClientService from "@/services/b2bClientService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import B2bClientForm from "./components/B2bClientForm";
import ShipToForm from "./components/ShipToForm";
import { useAuth } from "@/hooks/useAuth";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { Badge } from "@/components/ui/badge";

const COLUMN_FILTER_KEYS = [
  "client_code",
  "client_code_op",
  "client_name",
  "client_name_op",
  "contact_person",
  "contact_person_op",
  "phone",
  "phone_op",
  "email",
  "email_op",
  "gstin",
  "gstin_op",
  "billing_city",
  "billing_city_op",
  "billing_state",
  "billing_state_op",
  "is_active",
  "created_at",
  "created_at_op",
  "created_at_to",
];

const IS_ACTIVE_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export default function B2bClientsPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [shipTos, setShipTos] = useState([]);
  const [shipTosLoading, setShipTosLoading] = useState(false);
  const [showShipToModal, setShowShipToModal] = useState(false);
  const [editShipTo, setEditShipTo] = useState(null);
  const [shipToSubmitting, setShipToSubmitting] = useState(false);
  const [shipToServerError, setShipToServerError] = useState(null);
  const [deleteShipToDialogOpen, setDeleteShipToDialogOpen] = useState(false);
  const [shipToToDelete, setShipToToDelete] = useState(null);
  const [deletingShipTo, setDeletingShipTo] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const fetcher = useCallback(
    async (params) => {
      const response = await b2bClientService.getB2bClients({
        ...params,
        ...filterParams,
      });
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? {
          total: result?.pagination?.total ?? 0,
          page: params.page,
          pages: 0,
          limit: params.limit,
        },
      };
    },
    [filterParams, reloadTrigger]
  );

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
    setShipTos([]);
    setShowShipToModal(false);
    setEditShipTo(null);
  }, []);

  const fetchShipTos = useCallback(async (clientId) => {
    if (!clientId) return;
    setShipTosLoading(true);
    try {
      const res = await b2bClientService.getB2bShipTos({ client_id: clientId, limit: 100 });
      const r = res?.result ?? res;
      setShipTos(r?.data ?? []);
    } catch {
      setShipTos([]);
    } finally {
      setShipTosLoading(false);
    }
  }, []);

  const refreshShipTos = useCallback(() => {
    if (selectedRecord?.id) fetchShipTos(selectedRecord.id);
  }, [selectedRecord?.id, fetchShipTos]);

  const handleAddShipTo = useCallback(() => {
    setEditShipTo(null);
    setShipToServerError(null);
    setShowShipToModal(true);
  }, []);

  const handleEditShipTo = useCallback((shipTo) => {
    setEditShipTo(shipTo);
    setShipToServerError(null);
    setShowShipToModal(true);
  }, []);

  const handleShipToFormSubmit = useCallback(
    async (payload) => {
      setShipToSubmitting(true);
      setShipToServerError(null);
      try {
        if (editShipTo?.id) {
          await b2bClientService.updateB2bShipTo(editShipTo.id, payload);
          toast.success("Ship-to address updated");
        } else {
          await b2bClientService.createB2bShipTo({ ...payload, client_id: selectedRecord.id });
          toast.success("Ship-to address added");
        }
        setShowShipToModal(false);
        setEditShipTo(null);
        refreshShipTos();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to save ship-to";
        setShipToServerError(msg);
        toast.error(msg);
      } finally {
        setShipToSubmitting(false);
      }
    },
    [editShipTo?.id, selectedRecord?.id, refreshShipTos]
  );

  const handleDeleteShipToClick = useCallback((shipTo) => {
    setShipToToDelete(shipTo);
    setDeleteShipToDialogOpen(true);
  }, []);

  const handleDeleteShipToConfirm = useCallback(async () => {
    if (!shipToToDelete) return;
    setDeletingShipTo(true);
    try {
      await b2bClientService.deleteB2bShipTo(shipToToDelete.id);
      setDeleteShipToDialogOpen(false);
      setShipToToDelete(null);
      refreshShipTos();
      toast.success("Ship-to address deactivated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate ship-to");
    } finally {
      setDeletingShipTo(false);
    }
  }, [shipToToDelete, refreshShipTos]);

  useEffect(() => {
    if (sidebarOpen && selectedRecord?.id) {
      fetchShipTos(selectedRecord.id);
    }
  }, [sidebarOpen, selectedRecord?.id, fetchShipTos]);

  const handleAddClick = useCallback(() => {
    setEditRecord(null);
    setServerError(null);
    setShowAddModal(true);
  }, []);

  const handleEditClick = useCallback((row) => {
    setEditRecord(row);
    setServerError(null);
    setShowEditModal(true);
  }, []);

  const handleDeleteClick = useCallback((row) => {
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenShipToForClient = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
    setEditShipTo(null);
    setShipToServerError(null);
    setTimeout(() => setShowShipToModal(true), 100);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await b2bClientService.deleteB2bClient(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      setSelectedRecord(null);
      toast.success("Client deactivated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate client");
    } finally {
      setDeleting(false);
    }
  }, [recordToDelete]);

  const handleFormSubmit = useCallback(
    async (payload, isEdit) => {
      setSubmitting(true);
      setServerError(null);
      try {
        if (isEdit) {
          await b2bClientService.updateB2bClient(editRecord.id, payload);
          toast.success("Client updated");
        } else {
          await b2bClientService.createB2bClient(payload);
          toast.success("Client created");
        }
        setShowAddModal(false);
        setShowEditModal(false);
        setEditRecord(null);
        setReloadTrigger((p) => p + 1);
      } catch (err) {
        setServerError(err.response?.data?.message || "Failed to save client");
        toast.error(err.response?.data?.message || "Failed to save client");
      } finally {
        setSubmitting(false);
      }
    },
    [editRecord]
  );

  const columns = useMemo(
    () => [
      {
        field: "client_code",
        label: "Code",
        sortable: true,
        filterType: "text",
        filterKey: "client_code",
        defaultFilterOperator: "contains",
        render: (row) => (
          <span className="font-medium text-sm">{row.client_code || "-"}</span>
        ),
      },
      {
        field: "client_name",
        label: "Client Name",
        sortable: true,
        filterType: "text",
        filterKey: "client_name",
        defaultFilterOperator: "contains",
        render: (row) => row.client_name || "-",
      },
      {
        field: "contact_person",
        label: "Contact",
        filterType: "text",
        filterKey: "contact_person",
        defaultFilterOperator: "contains",
        render: (row) => row.contact_person || "-",
      },
      {
        field: "phone",
        label: "Phone",
        filterType: "text",
        filterKey: "phone",
        defaultFilterOperator: "contains",
        render: (row) => row.phone || "-",
      },
      {
        field: "email",
        label: "Email",
        filterType: "text",
        filterKey: "email",
        defaultFilterOperator: "contains",
        render: (row) => row.email || "-",
      },
      {
        field: "gstin",
        label: "GSTIN",
        filterType: "text",
        filterKey: "gstin",
        defaultFilterOperator: "contains",
        render: (row) => row.gstin || "-",
      },
      {
        field: "billing_city",
        label: "City",
        filterType: "text",
        filterKey: "billing_city",
        defaultFilterOperator: "contains",
        render: (row) => row.billing_city || "-",
      },
      {
        field: "billing_state",
        label: "State",
        filterType: "text",
        filterKey: "billing_state",
        defaultFilterOperator: "contains",
        render: (row) => row.billing_state || "-",
      },
      {
        field: "is_active",
        label: "Active",
        filterType: "select",
        filterKey: "is_active",
        filterOptions: IS_ACTIVE_OPTIONS,
        render: (row) => (
          <Badge variant={row.is_active ? "default" : "secondary"} className="text-xs">
            {row.is_active ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        field: "created_at",
        label: "Created",
        sortable: true,
        filterType: "date",
        filterKey: "created_at",
        filterKeyTo: "created_at_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.created_at) || "-",
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
              aria-label="View details"
            >
              <IconFileDescription className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0">
                <span className="sr-only">Actions</span>
                <span className="h-4 w-4">⋮</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {currentPerm.can_update && (
                  <>
                    <DropdownMenuItem onClick={() => handleEditClick(row)}>
                      <IconPencil className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenShipToForClient(row)}>
                      <IconMapPin className="size-4 mr-2" />
                      Add Ship-to
                    </DropdownMenuItem>
                  </>
                )}
                {currentPerm.can_delete && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash className="size-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handleEditClick, handleDeleteClick, handleOpenShipToForClient, currentPerm]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="pr-1 space-y-4">
        <div className="space-y-3">
          <p className="font-semibold">{r.client_code || r.id}</p>
          <p className="text-xs font-semibold text-muted-foreground">Client Name</p>
          <p className="text-sm">{r.client_name ?? "-"}</p>
          <p className="text-xs font-semibold text-muted-foreground">Contact</p>
          <p className="text-sm">{r.contact_person ?? "-"}</p>
          <p className="text-xs font-semibold text-muted-foreground">Phone</p>
          <p className="text-sm">{r.phone ?? "-"}</p>
          <p className="text-xs font-semibold text-muted-foreground">Email</p>
          <p className="text-sm">{r.email ?? "-"}</p>
          <p className="text-xs font-semibold text-muted-foreground">GSTIN</p>
          <p className="text-sm">{r.gstin ?? "-"}</p>
          <p className="text-xs font-semibold text-muted-foreground">Active</p>
          <p className="text-sm">{r.is_active ? "Yes" : "No"}</p>
          <p className="text-xs font-semibold text-muted-foreground">Created</p>
          <p className="text-sm">{formatDate(r.created_at) ?? "-"}</p>
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Ship-to addresses</p>
            {currentPerm.can_update && (
              <Button variant="outline" size="sm" onClick={handleAddShipTo} className="text-xs">
                Add Ship-to
              </Button>
            )}
          </div>
          {shipTosLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : shipTos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ship-to addresses. Add one to use in quotes and orders.</p>
          ) : (
            <ul className="space-y-2">
              {shipTos.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-2 p-2 rounded border bg-muted/30 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{s.ship_to_name || `Ship-to #${s.id}`}</span>
                    {s.is_default && (
                      <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                    )}
                    <p className="text-muted-foreground truncate mt-0.5">
                      {[s.address, s.city, s.state].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  {currentPerm.can_update && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleEditShipTo(s)}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <IconPencil className="size-3.5" />
                      </Button>
                      {currentPerm.can_delete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteShipToClick(s)}
                          title="Deactivate"
                          aria-label="Deactivate"
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }, [selectedRecord, shipTos, shipTosLoading, currentPerm, handleAddShipTo, handleEditShipTo, handleDeleteShipToClick]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Clients"
        addButtonLabel={currentPerm.can_create ? "Add Client" : undefined}
        onAddClick={currentPerm.can_create ? handleAddClick : undefined}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 150px)"
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            page={page}
            limit={limit}
            sortBy={sortBy || "id"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Client Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showAddModal} onOpenChange={(open) => !open && (setShowAddModal(false), setServerError(null))}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <div className="pb-2">
              <DialogTitle>Add B2B Client</DialogTitle>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <B2bClientForm
                defaultValues={{}}
                onSubmit={(p) => handleFormSubmit(p, false)}
                onCancel={() => {
                  setShowAddModal(false);
                  setServerError(null);
                }}
                loading={submitting}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={showEditModal} onOpenChange={(open) => !open && (setShowEditModal(false), setEditRecord(null), setServerError(null))}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <div className="pb-2">
              <DialogTitle>Edit B2B Client</DialogTitle>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {editRecord && (
                <B2bClientForm
                  defaultValues={editRecord}
                  onSubmit={(p) => handleFormSubmit(p, true)}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditRecord(null);
                    setServerError(null);
                  }}
                  loading={submitting}
                  serverError={serverError}
                  onClearServerError={() => setServerError(null)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showShipToModal}
          onOpenChange={(open) => !open && (setShowShipToModal(false), setEditShipTo(null), setShipToServerError(null))}
        >
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <div className="pb-2">
              <DialogTitle>{editShipTo?.id ? "Edit Ship-to Address" : "Add Ship-to Address"}</DialogTitle>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {selectedRecord?.id && (
                <ShipToForm
                  clientId={selectedRecord.id}
                  defaultValues={editShipTo || {}}
                  onSubmit={handleShipToFormSubmit}
                  onCancel={() => {
                    setShowShipToModal(false);
                    setEditShipTo(null);
                    setShipToServerError(null);
                  }}
                  loading={shipToSubmitting}
                  serverError={shipToServerError}
                  onClearServerError={() => setShipToServerError(null)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteShipToDialogOpen} onOpenChange={setDeleteShipToDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Ship-to Address</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate this ship-to address? It will be hidden from quotes and orders. You can add a new address anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingShipTo}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                loading={deletingShipTo}
                onClick={handleDeleteShipToConfirm}
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate this client? The client will be hidden from the list but records are kept. You can filter by Active to see inactive clients.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                loading={deleting}
                onClick={handleDeleteConfirm}
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
