"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Grid,
  CircularProgress,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import ReplayIcon from "@mui/icons-material/Replay";
import b2bLeadService from "@/services/b2bLeadService";
import { useAuth } from "@/hooks/useAuth";
import { toastError, toastSuccess } from "@/utils/toast";
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
import moment from "moment";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddCallDetailsForm from "./components/AddCallDetailsForm";
import ScheduleFollowUpDialog from "./components/ScheduleFollowUpDialog";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import {
  NON_EDITABLE_STATUSES,
  REOPENABLE_STATUSES,
} from "./b2bLeadFilterOptions";

const COLUMN_WIDTH = 320;
const COLUMN_HEIGHT = "100%";

const CLOSED_FOR_SCHEDULE = [];

const STATUS_COLUMNS = [
  { key: "created", title: "Created", color: "#0ea5e9" },
  { key: "follow_up", title: "Follow Up", color: "#f97316" },
  { key: "on_hold", title: "On Hold", color: "#eab308" },
  { key: "converted", title: "Converted", color: "#16a34a" },
  { key: "not_interested", title: "Not Interested", color: "#94a3b8" },
];

function buildBoardState(leads = []) {
  const columns = {};
  STATUS_COLUMNS.forEach((col) => {
    columns[col.key] = { ...col, items: [] };
  });

  leads.forEach((lead) => {
    let statusKey = lead.status || "created";
    const colKey = columns[statusKey] ? statusKey : "created";
    columns[colKey].items.push(lead);
  });

  return { columns, columnOrder: STATUS_COLUMNS.map((c) => c.key) };
}

export default function KanbanBoard({ leads = [], onRefresh }) {
  const router = useRouter();
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };
  const canDeleteLead = currentPerm.can_delete;

  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState(() => buildBoardState(leads));
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const [pendingLead, setPendingLead] = useState(null);
  const [pendingToStatus, setPendingToStatus] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("schedule");
  const [actionLead, setActionLead] = useState(null);
  const [addFuOpen, setAddFuOpen] = useState(false);

  const handleMenuOpen = (event, lead) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuLead(lead);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuLead(null);
  };

  const handleView = () => {
    if (menuLead?.id) router.push(`/b2b-leads/view?id=${menuLead.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    if (menuLead?.id) router.push(`/b2b-leads/edit?id=${menuLead.id}`);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (!menuLead?.id) return;
    setLeadToDelete(menuLead);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleScheduleClick = () => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setScheduleMode("schedule");
    setScheduleOpen(true);
    handleMenuClose();
  };

  const handleReopenClick = () => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setScheduleMode("reopen");
    setScheduleOpen(true);
    handleMenuClose();
  };

  const handleAddFollowUpClick = () => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setAddFuOpen(true);
    handleMenuClose();
  };

  const handleActionSaved = useCallback(async () => {
    setUpdatingStatus(true);
    try {
      await onRefresh?.();
    } finally {
      setUpdatingStatus(false);
    }
  }, [onRefresh]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!leadToDelete?.id) return;
    setDeleting(true);
    try {
      await b2bLeadService.deleteB2bLead(leadToDelete.id);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
      toastSuccess("B2B lead deleted");
      if (typeof onRefresh === "function") onRefresh();
    } catch (err) {
      toastError(err.response?.data?.message || err.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  }, [leadToDelete, onRefresh]);

  useEffect(() => {
    setData(buildBoardState(leads));
  }, [leads]);

  const filteredColumns = useMemo(() => {
    if (!query.trim()) return data.columns;
    const q = query.toLowerCase();
    const result = {};
    Object.entries(data.columns).forEach(([key, col]) => {
      result[key] = {
        ...col,
        items: col.items.filter((lead) =>
          [
            lead.lead_number,
            lead.company_name,
            lead.contact_person,
            lead.mobile_number,
            lead.city,
            lead.state,
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        ),
      };
    });
    return result;
  }, [data.columns, query]);

  const openFollowUpDialog = (lead, toStatus) => {
    if (!lead?.id || !toStatus) return;
    setPendingLeadId(lead.id);
    setPendingLead(lead);
    setPendingToStatus(toStatus);
    setFollowUpDialogOpen(true);
  };

  const closeFollowUpDialog = () => {
    setFollowUpDialogOpen(false);
    setPendingLeadId(null);
    setPendingLead(null);
    setPendingToStatus(null);
  };

  const outcomeForStatus = (statusKey) => {
    if (statusKey === "follow_up") return "follow_up";
    if (statusKey === "converted") return "converted";
    if (statusKey === "not_interested") return "not_interested";
    return "";
  };

  const getOutcomeRulesForStatus = (statusKey) => {
    if (statusKey === "follow_up") return { forcedOutcome: null, allowedOutcomes: ["follow_up", "no_answer", "switched_off"] };
    if (statusKey === "not_interested") return { forcedOutcome: null, allowedOutcomes: ["not_interested", "wrong_number"] };
    if (statusKey === "converted") return { forcedOutcome: "converted", allowedOutcomes: null };
    return { forcedOutcome: null, allowedOutcomes: null };
  };

  const pendingStatusTitle =
    STATUS_COLUMNS.find((c) => c.key === pendingToStatus)?.title || pendingToStatus || "";

  const followUpDefaultValues = useMemo(
    () => ({ outcome: outcomeForStatus(pendingToStatus) }),
    [pendingToStatus]
  );

  const onDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;

    const sourceColKey = source.droppableId;
    const destColKey = destination.droppableId;

    if (sourceColKey === destColKey) {
      if (source.index === destination.index) return;
      setData((prev) => {
        const srcCol = prev.columns[sourceColKey];
        const srcItems = Array.from(srcCol.items);
        const [moved] = srcItems.splice(source.index, 1);
        srcItems.splice(destination.index, 0, moved);
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [sourceColKey]: { ...srcCol, items: srcItems },
          },
        };
      });
      return;
    }

    const sourceColumn = data.columns[sourceColKey];
    const leadItem = sourceColumn?.items?.[source.index];
    if (!leadItem) return;

    const currentStatus = leadItem.status || sourceColKey;

    if (NON_EDITABLE_STATUSES.includes(String(currentStatus || "").toLowerCase())) {
      return;
    }

    openFollowUpDialog(leadItem, destColKey);
  };

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: COLUMN_HEIGHT,
        p: 0,
      }}
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "nowrap",
            scrollbarGutter: "stable",
            scrollbarWidth: "thin",
            msOverflowStyle: "auto",
            "&::-webkit-scrollbar": {
              width: 8,
              height: 8,
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f1f1",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#888",
              borderRadius: 4,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#555",
            },
          }}
        >
          <Grid container spacing={2} wrap="nowrap" sx={{ height: "100%" }}>
            {data.columnOrder.map((colKey) => {
              const colCfg = STATUS_COLUMNS.find((c) => c.key === colKey);
              const col = filteredColumns[colKey] || { ...(colCfg || {}), items: [] };

              return (
                <Grid
                  key={colKey}
                  sx={{
                    flex: "0 0 auto",
                    display: "flex",
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: "divider",
                      width: COLUMN_WIDTH,
                      minWidth: COLUMN_WIDTH,
                      maxWidth: COLUMN_WIDTH,
                      height: COLUMN_HEIGHT,
                      minHeight: COLUMN_HEIGHT,
                      maxHeight: COLUMN_HEIGHT,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        mb: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: colCfg?.color || "#0ea5e9",
                        color: "#fff",
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {colCfg?.title || colKey}
                      </Typography>
                      <Chip
                        label={col.items.length}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          height: 20,
                        }}
                      />
                    </Stack>

                    <Droppable droppableId={colKey}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{
                              flex: 1,
                              overflowY: "scroll",
                              scrollbarGutter: "stable",
                              pr: 0.5,
                              pb: 4,
                              scrollbarWidth: "thin",
                              msOverflowStyle: "auto",
                              "&::-webkit-scrollbar": { width: 8 },
                              "&::-webkit-scrollbar-track": {
                                background: "#f1f1f1",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                background: "#888",
                                borderRadius: 4,
                              },
                              "&::-webkit-scrollbar-thumb:hover": {
                                background: "#555",
                              },
                              outline: snapshot.isDraggingOver ? "2px dashed #1976d2" : "none",
                              outlineOffset: "-2px",
                              transition: "outline 0.15s ease",
                            }}
                        >
                          {col.items.map((lead, index) => {
                            const nextFollowUp =
                              lead.next_follow_up_at &&
                              moment(lead.next_follow_up_at).format("DD-MM-YYYY HH:mm");
                            const createdAt =
                              lead.created_at && moment(lead.created_at).format("DD-MM-YYYY");

                            const isDragDisabled = NON_EDITABLE_STATUSES.includes(
                              String(lead.status || "").toLowerCase()
                            );

                            return (
                              <Draggable
                                key={String(lead.id)}
                                draggableId={String(lead.id)}
                                index={index}
                                isDragDisabled={isDragDisabled}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <Paper
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    elevation={0}
                                    sx={{
                                      mb: 0.5,
                                      p: 0.5,
                                      borderRadius: 1,
                                      border: 1,
                                      borderColor: dragSnapshot.isDragging
                                        ? "primary.main"
                                        : "divider",
                                      opacity: isDragDisabled ? 0.75 : 1,
                                      cursor: isDragDisabled ? "not-allowed" : "grab",
                                      boxShadow: dragSnapshot.isDragging ? 4 : 0,
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      spacing={0.5}
                                      mb={0.5}
                                    >
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/b2b-leads/view?id=${lead.id}`);
                                        }}
                                        sx={{
                                          fontWeight: 600,
                                          color: "primary.main",
                                          cursor: "pointer",
                                          "&:hover": { textDecoration: "underline" },
                                        }}
                                      >
                                        #{lead.lead_number || lead.id}
                                      </Typography>
                                      <Stack direction="row" alignItems="center" spacing={0.25}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => handleMenuOpen(e, lead)}
                                          sx={{ p: 0.25 }}
                                          aria-label="Actions"
                                        >
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </Stack>

                                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                      {lead.company_name || "-"}
                                    </Typography>

                                    <Stack spacing={0.25}>
                                      {lead.contact_person && (
                                        <Typography variant="caption" color="text.secondary">
                                          Contact: {lead.contact_person}
                                        </Typography>
                                      )}
                                      {lead.mobile_number && (
                                        <Typography
                                          variant="caption"
                                          color="primary"
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          <PhoneIcon sx={{ fontSize: 14 }} />
                                          {lead.mobile_number}
                                        </Typography>
                                      )}
                                      {lead.city && (
                                        <Typography variant="caption" color="text.secondary">
                                          City: {lead.city}
                                        </Typography>
                                      )}
                                      {lead.assigned_to_name && (
                                        <Typography variant="caption" color="text.secondary">
                                          Assigned: {lead.assigned_to_name}
                                        </Typography>
                                      )}
                                      {nextFollowUp && (
                                        <Typography variant="caption" color="text.secondary">
                                          Next F/U: {nextFollowUp}
                                        </Typography>
                                      )}
                                      {createdAt && (
                                        <Typography variant="caption" color="text.secondary">
                                          Created: {createdAt}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Paper>
                                )}
                              </Draggable>
                            );
                          })}

                          {provided.placeholder}

                          {col.items.length === 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontStyle: "italic" }}
                            >
                              No leads
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Droppable>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </DragDropContext>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View" />
        </MenuItem>
        {menuLead && !NON_EDITABLE_STATUSES.includes(menuLead.status) && currentPerm.can_update && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
        {menuLead &&
          currentPerm.can_update &&
          !CLOSED_FOR_SCHEDULE.includes(menuLead.status) &&
          !REOPENABLE_STATUSES.includes(menuLead.status) && (
            <MenuItem onClick={handleScheduleClick}>
              <ListItemIcon>
                <EventIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Schedule follow-up" />
            </MenuItem>
          )}
        {menuLead && currentPerm.can_update && !CLOSED_FOR_SCHEDULE.includes(menuLead.status) && (
          <MenuItem onClick={handleAddFollowUpClick}>
            <ListItemIcon>
              <PhoneCallbackIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Add follow-up" />
          </MenuItem>
        )}
        {menuLead &&
          currentPerm.can_update &&
          REOPENABLE_STATUSES.includes(menuLead.status) && (
            <MenuItem onClick={handleReopenClick}>
              <ListItemIcon>
                <ReplayIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Reopen to follow-up" />
            </MenuItem>
          )}
        {canDeleteLead &&
          menuLead &&
          !NON_EDITABLE_STATUSES.includes(menuLead.status) && (
            <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Delete" />
            </MenuItem>
          )}
      </Menu>

      <ScheduleFollowUpDialog
        open={scheduleOpen}
        onOpenChange={(open) => {
          setScheduleOpen(open);
          if (!open) setActionLead(null);
        }}
        lead={actionLead}
        mode={scheduleMode}
        onSaved={handleActionSaved}
      />

      <Dialog
        open={addFuOpen}
        onOpenChange={(open) => {
          setAddFuOpen(open);
          if (!open) setActionLead(null);
        }}
      >
        <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton>
          <DialogHeader>
            <DialogTitle>
              Add Follow-up — {actionLead?.lead_number || actionLead?.company_name || ""}
            </DialogTitle>
          </DialogHeader>
          {actionLead?.id ? (
            <div className="pt-1">
              <AddCallDetailsForm
                leadId={actionLead.id}
                lead={actionLead}
                forcedStatus="follow_up"
                onSaved={async () => {
                  setAddFuOpen(false);
                  setActionLead(null);
                  await handleActionSaved();
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setLeadToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete B2B lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              {leadToDelete?.lead_number || `B2B-${leadToDelete?.id}`}
              {leadToDelete?.company_name ? ` (${leadToDelete.company_name})` : ""}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              loading={deleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {updatingStatus && (
        <Box
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            bgcolor: "background.paper",
            p: 1,
            borderRadius: 1,
            boxShadow: 3,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CircularProgress size={18} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Updating…
          </Typography>
        </Box>
      )}

      <Dialog open={followUpDialogOpen} onOpenChange={(open) => !open && closeFollowUpDialog()}>
        <DialogContent className="sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              Add Call Details {pendingStatusTitle ? `→ ${pendingStatusTitle}` : ""}
            </DialogTitle>
          </DialogHeader>
          {pendingToStatus && pendingToStatus !== "converted" && (
            <div className="text-sm text-muted-foreground">
              Follow-up is mandatory when changing lead stage.
            </div>
          )}
          <div className="pt-2">
            <AddCallDetailsForm
              leadId={pendingLeadId}
              lead={pendingLead}
              forcedStatus={pendingToStatus}
              forcedOutcome={pendingToStatus ? getOutcomeRulesForStatus(pendingToStatus).forcedOutcome : null}
              allowedOutcomes={pendingToStatus ? getOutcomeRulesForStatus(pendingToStatus).allowedOutcomes : null}
              defaultValues={followUpDefaultValues}
              onSaved={async () => {
                closeFollowUpDialog();
                setUpdatingStatus(true);
                await onRefresh?.();
                setUpdatingStatus(false);
              }}
              onConverted={async () => {
                closeFollowUpDialog();
                setUpdatingStatus(true);
                await onRefresh?.();
                setUpdatingStatus(false);
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={closeFollowUpDialog}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
