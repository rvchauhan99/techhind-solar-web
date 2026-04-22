"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Checkbox from "@/components/common/Checkbox";
import Select, { MenuItem } from "@/components/common/Select";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import PaginatedTable from "@/components/common/PaginatedTable";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import { toastError, toastSuccess } from "@/utils/toast";
import moment from "moment";
import { cn } from "@/lib/utils";
import { IconUserPlus, IconUsersGroup } from "@tabler/icons-react";

const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "new":
      return "bg-sky-500 text-white hover:bg-sky-600 border-transparent text-[10px] uppercase";
    case "viewed":
      return "bg-indigo-500 text-white hover:bg-indigo-600 border-transparent text-[10px] uppercase";
    case "follow_up":
      return "bg-orange-500 text-white hover:bg-orange-600 border-transparent text-[10px] uppercase";
    case "converted":
      return "bg-green-600 text-white hover:bg-green-700 border-transparent text-[10px] uppercase";
    case "not_interested":
    case "junk":
      return "bg-gray-400 text-white hover:bg-gray-500 border-transparent text-[10px] uppercase";
    default:
      return "bg-gray-200 text-gray-900 hover:bg-gray-300 border-transparent text-[10px] uppercase";
  }
};

export default function MarketingLeadsAssignPage() {
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllPage, setSelectAllPage] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [lastPageRows, setLastPageRows] = useState([]);

  const selectAllPageRef = useRef(selectAllPage);

  useEffect(() => {
    selectAllPageRef.current = selectAllPage;
  }, [selectAllPage]);

  const loadUsers = useCallback(() => {
    mastersService
      .getReferenceOptions("user.model", { status: "active" })
      .then((r) => {
        const data = r?.result ?? r?.data ?? r;
        if (Array.isArray(data)) setUserOptions(data);
      })
      .catch(() => {
        setUserOptions([]);
      });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const buildApiFilters = useCallback((filtersObj = {}) => {
    const result = {};
    Object.entries(filtersObj || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((v) => String(v).trim())
          .filter((v) => v !== "");
        if (cleaned.length) {
          result[key] = cleaned.join(",");
        }
      } else if (value != null && String(value).trim() !== "") {
        result[key] = value;
      }
    });
    return result;
  }, []);

  const apiFilters = useMemo(
    () => buildApiFilters(filters),
    [filters, buildApiFilters]
  );

  const fetcher = useCallback(async (params) => {
    const res = await marketingLeadsService.getMarketingLeads({
      ...params,
      ...apiFilters,
      not_status: "converted"
    });
    const payload = res?.result || res?.data || res;
    const data = payload?.data || [];
    setLastPageRows(data);

    // If "Select All on Page" is active, auto-add new items to selectedIds
    if (selectAllPageRef.current) {
      const idsOnPage = data.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    }
    return payload;
  }, [apiFilters]); // Re-fetch on filter change

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPage = (checked) => {
    setSelectAllPage(checked);
    if (checked) {
      const idsOnPage = lastPageRows.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    } else {
      const idsOnPage = lastPageRows.map((r) => r.id);
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    }
  };

  const handleAssign = async () => {
    if (!assignTo) {
      toastError("Please select assigning user.");
      return;
    }
    if (!selectedIds.length) {
      toastError("Please select at least one lead.");
      return;
    }
    try {
      await marketingLeadsService.assignMarketingLeads({
        lead_ids: selectedIds,
        assigned_to: Number(assignTo),
      });
      toastSuccess("Leads assigned successfully");
      // Reset selections
      setSelectedIds([]);
      setSelectAllPage(false);
      setFilters({ ...filters }); // Trigger reload
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to assign leads";
      toastError(msg);
    }
  };

  const columns = [
    {
      field: "select",
      label: "",
      sortable: false,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center pl-1">
          <Checkbox
            name={`select-${row.id}`}
            checked={selectedIds.includes(row.id)}
            onChange={() => handleToggleRow(row.id)}
            className="w-auto h-auto m-0"
          />
        </div>
      ),
    },
    {
      field: "lead_number",
      label: "Lead No",
      render: (row) => <span className="text-muted-foreground font-mono text-xs">{row.lead_number || `ML-${row.id}`}</span>,
    },
    {
      field: "customer_name",
      label: "Name",
      render: (row) => (
        <span className="font-semibold text-xs text-foreground">
          {(row.customer_name || "-").toUpperCase()}
        </span>
      ),
    },
    {
      field: "mobile_number",
      label: "Mobile",
      render: (row) => <span className="text-xs">{row.mobile_number}</span>,
    },
    {
      field: "assigned_to_name",
      label: "Current Assigned To",
      render: (row) => row.assigned_to_name || "-",
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <Badge variant="outline" className={cn("py-0.5 h-5 px-2", getStatusBadgeVariant(row.status))}>
          {(row.status || "new").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      field: "inquiry_source_name",
      label: "Source",
      render: (row) => row.inquiry_source_name || "-",
    },
    {
      field: "created_at",
      label: "Created On",
      render: (row) =>
        row.created_at ? moment(row.created_at).format("DD-MM-YYYY") : "-",
    },
    {
      field: "last_called_at",
      label: "Last Call On",
      render: (row) =>
        row.last_called_at ? moment(row.last_called_at).format("DD-MM-YYYY") : "-",
    },
    {
      field: "last_call_outcome",
      label: "Last Outcome",
      render: (row) => row.last_call_outcome || "-",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-full flex flex-col bg-muted/20">
        <Container className="flex-1 max-w-[1600px] mx-auto py-2 px-2 sm:px-4 w-full h-full flex flex-col gap-2">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1.5 border border-primary/20 hidden sm:block">
                <IconUsersGroup className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">Assign Marketing Leads</h1>
              </div>
            </div>
          </div>

          <LeadListFilterPanel
            values={filters}
            onApply={(v) => {
              setFilters(v);
              setSelectedIds([]);
              setSelectAllPage(false);
            }}
            onClear={() => {
              setFilters({});
              setSelectedIds([]);
              setSelectAllPage(false);
            }}
            defaultOpen={false}
          />

          <Card className="border-border shadow-sm bg-card overflow-visible shrink-0 rounded-md">
            <CardContent className="p-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

                <div className="flex items-center gap-3 pl-1">
                  <div className="flex items-center">
                    <Checkbox
                      name="select-all-page"
                      label={<span className="font-semibold text-xs whitespace-nowrap">Select all on page</span>}
                      checked={selectAllPage}
                      onChange={(e) => handleToggleSelectAllPage(e.target.checked)}
                    />
                  </div>
                  <div className="hidden sm:flex items-center text-xs font-medium bg-muted/40 px-2 py-1 rounded border border-border">
                    Selected:&nbsp;<span className="font-bold text-primary">{selectedIds.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto relative z-10">
                  <div className="w-full sm:w-56 min-w-[180px]">
                    <Select
                      name="assign_to"
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      placeholder="Select user..."
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="">Select user...</MenuItem>
                      {userOptions.map((u) => (
                        <MenuItem key={u.id} value={String(u.id)}>
                          {u.name ?? u.label ?? u.id}
                        </MenuItem>
                      ))}
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAssign}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 shadow-sm whitespace-nowrap px-3 text-xs"
                  >
                    <IconUserPlus className="size-3.5" />
                    Assign Leads
                  </Button>
                </div>

                <div className="sm:hidden flex items-center justify-center w-full text-[10px] text-muted-foreground mt-1">
                  Selected leads: {selectedIds.length}
                </div>

              </div>
            </CardContent>
          </Card>

          <div className="flex-1 min-h-[400px] border border-border shadow-sm rounded-md overflow-hidden flex flex-col bg-card relative z-0">
            <PaginatedTable
              columns={columns}
              fetcher={fetcher}
              filterParams={apiFilters}
              height="100%"
              showSearch={false}
            />
          </div>

        </Container>
      </div>
    </ProtectedRoute>
  );
}
