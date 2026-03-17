"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { IconFilter, IconPhoneCall } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/container";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import PaginatedTable from "@/components/common/PaginatedTable";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import { toastError } from "@/utils/toast";
import moment from "moment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MarketingLeadsCallReportPage() {
  const today = moment().format("YYYY-MM-DD");
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    user_id: "",
    outcome: "",
  });
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
    mastersService
      .getReferenceOptions("user.model", { status_in: "active,inactive" })
      .then((r) => {
        const data = r?.result ?? r?.data ?? r;
        if (Array.isArray(data)) setUserOptions(data);
      })
      .catch(() => {
        setUserOptions([]);
      });
  }, []);

  const loadSummary = async (overrideFilters) => {
    try {
      setLoadingSummary(true);
      const params = overrideFilters ? overrideFilters : filters;
      const res = await marketingLeadsService.getMarketingLeadsCallReport({
        ...params,
        page: 1,
        limit: 5,
      });
      const payload = res?.result || res?.data || res;
      setSummary(payload?.summary || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load call report";
      toastError(msg);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetcher = async (params) => {
    const res = await marketingLeadsService.getMarketingLeadsCallReport({
      ...filters,
      ...params,
    });
    return res;
  };

  const userNameById = useMemo(() => {
    const map = {};
    (userOptions || []).forEach((u) => {
      if (!u) return;
      const key = String(u.id);
      map[key] = u.name ?? u.label ?? key;
    });
    return map;
  }, [userOptions]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v != null && String(v).trim() !== ""
        )
      ),
    [filters]
  );

  const handleApplyFilters = () => {
    loadSummary();
  };

  const handleResetToToday = () => {
    const todayStr = moment().format("YYYY-MM-DD");
    const next = {
      from: todayStr,
      to: todayStr,
      user_id: "",
      outcome: "",
    };
    setFilters(next);
    loadSummary(next);
  };

  const columns = [
    {
      field: "contacted_at",
      label: "Call Date",
      sortable: true,
      render: (row) =>
        row.contacted_at ? moment(row.contacted_at).format("DD-MMM-YYYY HH:mm") : "-",
    },
    {
      field: "created_by_name",
      label: "Call By",
      sortable: false,
      render: (row) => (
        <span className="font-medium text-foreground">{row.created_by_name || "-"}</span>
      ),
    },
    {
      field: "outcome",
      label: "Status",
      sortable: false,
      render: (row) => (
        <Badge variant="outline" className="bg-background">
          {row.outcome?.replace(/_/g, " ") || "-"}
        </Badge>
      ),
    },
    {
      field: "notes",
      label: "Call Remarks",
      sortable: false,
      wrap: true,
      render: (row) => (
        <div className="max-w-[250px] truncate" title={row.notes}>
          {row.notes || "-"}
        </div>
      ),
    },
    {
      field: "lead_number",
      label: "Lead #",
      sortable: false,
      render: (row) => (
        <span className="text-muted-foreground">{row.lead_number || "-"}</span>
      ),
    },
    {
      field: "lead_name",
      label: "Lead Name",
      sortable: false,
      render: (row) => (
        <span className="font-medium">{row.lead_name || "-"}</span>
      ),
    },
    {
      field: "mobile_number",
      label: "Mobile Number",
      sortable: false,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-full flex flex-col flex-1 bg-background">
        <Container className="py-2 flex flex-col gap-2 flex-1 min-h-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                <IconPhoneCall className="size-5" stroke={2} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Call Report
                </h1>
                <p className="text-xs text-muted-foreground">
                  Telecaller-wise call summary and details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetToToday}
                className="gap-1.5 h-8"
                disabled={loadingSummary}
              >
                Today
              </Button>
              <Button
                size="sm"
                onClick={handleApplyFilters}
                disabled={loadingSummary}
                className="gap-1.5 shadow-sm h-8"
              >
                <IconFilter className="size-3.5" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Filters & Summary */}
          <div className="flex flex-col gap-2 shrink-0">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-2 sm:p-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {filters.from && filters.to && filters.from === filters.to
                      ? `Showing calls for ${moment(filters.from).format("DD-MMM-YYYY")}`
                      : `Showing calls from ${
                          filters.from
                            ? moment(filters.from).format("DD-MMM-YYYY")
                            : "start"
                        } to ${
                          filters.to
                            ? moment(filters.to).format("DD-MMM-YYYY")
                            : "today"
                        }`}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    <DateField
                      label="From Date"
                      name="from"
                      value={filters.from}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, from: e.target.value }))
                      }
                    />
                    <DateField
                      label="To Date"
                      name="to"
                      value={filters.to}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, to: e.target.value }))
                      }
                    />
                    <Select
                      name="user_id"
                      label="Call By"
                      value={filters.user_id}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, user_id: e.target.value }))
                      }
                    >
                      <MenuItem value="">All Users</MenuItem>
                      {userOptions.map((u) => (
                        <MenuItem key={u.id} value={String(u.id)}>
                          {u.name ?? u.label ?? u.id}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      name="outcome"
                      label="Status"
                      value={filters.outcome}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, outcome: e.target.value }))
                      }
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="viewed">Viewed</MenuItem>
                      <MenuItem value="follow_up">Follow Up</MenuItem>
                      <MenuItem value="callback_scheduled">Callback Scheduled</MenuItem>
                      <MenuItem value="converted">Converted</MenuItem>
                      <MenuItem value="no_answer">No Answer</MenuItem>
                      <MenuItem value="switched_off">Switched Off</MenuItem>
                      <MenuItem value="not_interested">Not Interested</MenuItem>
                      <MenuItem value="wrong_number">Wrong Number</MenuItem>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {summary && summary.length > 0 && (
              <Card className="border-border bg-card/60 shadow-sm overflow-hidden">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50">
                  <h3 className="text-xs font-semibold text-foreground tracking-tight">Call By Summary</h3>
                </div>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex flex-wrap gap-2">
                    {summary.map((row) => (
                      <div
                        key={row.created_by}
                        className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded shadow-sm"
                      >
                        <span className="text-xs text-muted-foreground w-max whitespace-nowrap">
                          {userNameById[String(row.created_by)] ||
                            `User #${row.created_by}`}
                        </span>
                        <Badge variant="secondary" className="font-semibold text-xs h-5 px-1.5">
                          {row.call_count} calls
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table Area */}
          <div className="flex-1 min-h-[400px] border border-border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col">
            <PaginatedTable
              columns={columns}
              fetcher={fetcher}
              filterParams={filterParams}
              height="100%"
            />
          </div>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

