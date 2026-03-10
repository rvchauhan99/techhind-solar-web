"use client";

import { useEffect, useMemo, useState } from "react";
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
import Input from "@/components/common/Input";
import moment from "moment";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddCallDetailsForm from "./components/AddCallDetailsForm";

const COLUMN_WIDTH = 320;
const COLUMN_HEIGHT = "calc(100vh - 150px)";

const NON_EDITABLE_STATUSES = ["converted", "not_interested", "junk"];

const STATUS_COLUMNS = [
  { key: "new", title: "New", color: "#0ea5e9" },
  { key: "contacted", title: "Contacted", color: "#6366f1" },
  { key: "follow_up", title: "Follow Up", color: "#f97316" },
  { key: "interested", title: "Interested", color: "#22c55e" },
  { key: "converted", title: "Converted", color: "#16a34a" },
];

function buildBoardState(leads = []) {
  const columns = {};
  STATUS_COLUMNS.forEach((col) => {
    columns[col.key] = { ...col, items: [] };
  });

  leads.forEach((lead) => {
    const statusKey = lead.status || "new";
    const colKey = columns[statusKey] ? statusKey : "new";
    columns[colKey].items.push(lead);
  });

  return { columns, columnOrder: STATUS_COLUMNS.map((c) => c.key) };
}

export default function KanbanBoard({ leads = [], onRefresh }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [data, setData] = useState(() => buildBoardState(leads));
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const [pendingLead, setPendingLead] = useState(null);
  const [pendingToStatus, setPendingToStatus] = useState(null);

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
    if (menuLead?.id) router.push(`/marketing-leads/view?id=${menuLead.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    if (menuLead?.id) router.push(`/marketing-leads/edit?id=${menuLead.id}`);
    handleMenuClose();
  };

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
            lead.customer_name,
            lead.mobile_number,
            lead.campaign_name,
            lead.inquiry_source_name,
            lead.branch_name,
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
    if (statusKey === "interested") return "interested";
    if (statusKey === "converted") return "converted";
    return "";
  };

  const pendingStatusTitle =
    STATUS_COLUMNS.find((c) => c.key === pendingToStatus)?.title || pendingToStatus || "";

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

    // Block any status updates for non-editable leads
    if (NON_EDITABLE_STATUSES.includes(String(currentStatus || "").toLowerCase())) {
      return;
    }

    // Mandatory follow-up for any cross-column move
    openFollowUpDialog(leadItem, destColKey);
  };

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: COLUMN_HEIGHT,
        p: 2,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
        <Input
          placeholder="Search marketing leads..."
          size="small"
          fullWidth
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Stack>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
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
                      p: 1.25,
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
                        mb: 1,
                        px: 1,
                        py: 0.6,
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
                            overflowY: "auto",
                            pr: 0.5,
                            scrollbarWidth: "thin",
                            "&::-webkit-scrollbar": { width: 4 },
                            "&::-webkit-scrollbar-thumb": {
                              bgcolor: "rgba(0,0,0,0.2)",
                              borderRadius: 4,
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
                                      mb: 1,
                                      p: 1,
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
                                          router.push(`/marketing-leads/view?id=${lead.id}`);
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
                                        {lead.campaign_name && (
                                          <Chip
                                            label={lead.campaign_name}
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: "0.62rem",
                                            }}
                                          />
                                        )}
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
                                      {lead.customer_name || "-"}
                                    </Typography>

                                    <Stack spacing={0.25}>
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
                                      {lead.inquiry_source_name && (
                                        <Typography variant="caption" color="text.secondary">
                                          Source: {lead.inquiry_source_name}
                                        </Typography>
                                      )}
                                      {lead.branch_name && (
                                        <Typography variant="caption" color="text.secondary">
                                          Branch: {lead.branch_name}
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
        {menuLead && !NON_EDITABLE_STATUSES.includes(menuLead.status) && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
      </Menu>

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
          <div className="text-sm text-muted-foreground">
            Follow-up is mandatory when changing lead stage.
          </div>
          <div className="pt-2">
            <AddCallDetailsForm
              leadId={pendingLeadId}
              lead={pendingLead}
              forcedStatus={pendingToStatus}
              defaultValues={{
                outcome: outcomeForStatus(pendingToStatus),
              }}
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

