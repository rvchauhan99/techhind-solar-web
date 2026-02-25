"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import HomeIcon from "@mui/icons-material/Home";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PieChartIcon from "@mui/icons-material/PieChart";
import AddIcon from "@mui/icons-material/Add";
import { IconLayoutKanban, IconList } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListView from "./ListView";
import KanbanBoard from "./KanbanBoard";
import marketingLeadsService from "@/services/marketingLeadsService";

export default function MarketingLeadsPage() {
  const router = useRouter();
  const [view, setView] = useState("list");
  const [kanbanLeads, setKanbanLeads] = useState([]);
  const loadingRef = useRef(false);

  const loadKanbanLeads = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await marketingLeadsService.getMarketingLeads({
        page: 1,
        limit: 10000,
      });
      const payload = res?.result ?? res?.data ?? res;
      const data = Array.isArray(payload) ? payload : payload?.data ?? [];
      setKanbanLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      setKanbanLeads([]);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (view === "kanban" && kanbanLeads.length === 0) {
      loadKanbanLeads();
    }
  }, [view, kanbanLeads.length, loadKanbanLeads]);

  return (
    <ProtectedRoute>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5">Marketing Leads</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/add")}
            >
              Add Lead
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/upload")}
            >
              Import Leads
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhoneInTalkIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/call-report")}
            >
              Call Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<GroupAddIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/assign")}
            >
              Assign Leads
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/analysis")}
            >
              Summary
            </Button>
            <Button
              variant="outlined"
              startIcon={<PieChartIcon />}
              size="small"
              onClick={() => router.push("/marketing-leads/analysis")}
            >
              Analysis
            </Button>
            <Button
              variant="outlined"
              startIcon={
                view === "kanban" ? (
                  <IconList className="size-4" />
                ) : (
                  <IconLayoutKanban className="size-4" />
                )
              }
              size="small"
              onClick={() =>
                setView((prev) => (prev === "kanban" ? "list" : "kanban"))
              }
            >
              {view === "kanban" ? "List View" : "Kanban View"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => router.push("/home")}
              size="small"
            >
              Home
            </Button>
          </Stack>
        </Box>
        {view === "kanban" ? <KanbanBoard leads={kanbanLeads} /> : <ListView />}
      </Box>
    </ProtectedRoute>
  );
}

