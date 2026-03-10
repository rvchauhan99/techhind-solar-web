"use client";

import { useMemo, useState } from "react";
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
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Input from "@/components/common/Input";
import moment from "moment";

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

function buildColumns(leads = []) {
  const columns = {};
  STATUS_COLUMNS.forEach((col) => {
    columns[col.key] = { ...col, items: [] };
  });

  leads.forEach((lead) => {
    const statusKey = lead.status || "new";
    const colKey = columns[statusKey] ? statusKey : "new";
    columns[colKey].items.push(lead);
  });

  return columns;
}

export default function KanbanBoard({ leads = [] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLead, setMenuLead] = useState(null);

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

  const columns = useMemo(() => buildColumns(leads), [leads]);

  const filteredColumns = useMemo(() => {
    if (!query.trim()) return columns;
    const q = query.toLowerCase();
    const result = {};
    Object.entries(columns).forEach(([key, col]) => {
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
  }, [columns, query]);

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
          {STATUS_COLUMNS.map((colCfg) => {
            const col = filteredColumns[colCfg.key] || { ...colCfg, items: [] };
            return (
              <Grid
                key={colCfg.key}
                sx={{
                  flex: "0 0 auto",
                  display: "flex",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
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
                      py: 0.75,
                      borderRadius: 1,
                      bgcolor: colCfg.color,
                      color: "#fff",
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {colCfg.title}
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

                  <Box
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      pr: 0.5,
                      scrollbarWidth: "thin",
                      "&::-webkit-scrollbar": {
                        width: 4,
                      },
                      "&::-webkit-scrollbar-thumb": {
                        bgcolor: "rgba(0,0,0,0.2)",
                        borderRadius: 4,
                      },
                    }}
                  >
                    {col.items.map((lead) => {
                      const nextFollowUp =
                        lead.next_follow_up_at &&
                        moment(lead.next_follow_up_at).format("DD-MM-YYYY HH:mm");
                      const createdAt =
                        lead.created_at &&
                        moment(lead.created_at).format("DD-MM-YYYY");

                      return (
                        <Paper
                          key={lead.id}
                          elevation={0}
                          sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 1,
                            border: 1,
                            borderColor: "divider",
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

                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, mb: 0.5 }}
                          >
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
                      );
                    })}

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
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

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
    </Paper>
  );
}

