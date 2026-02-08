"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import moduleService from "@/services/moduleMasterService";
import { useParams } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function ModuleViewById() {
  const params = useParams();
  const id = params?.id;
  const [module, setModule] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await moduleService.getModuleMaster(id);
        setModule(res.result || res.data || res);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

  return (
    <ProtectedRoute>
      <Box>
        {module ? (
          <div>
            <Typography variant="h4">{module.name}</Typography>
            <Typography>
              <strong>Key:</strong> {module.key}
            </Typography>
            <Typography>
              <strong>Route:</strong> {module.route}
            </Typography>
            <Typography>
              <strong>Parent:</strong> {module.parent_id || "-"}
            </Typography>
            <Typography>
              <strong>Sequence:</strong> {module.sequence}
            </Typography>
            <Typography>
              <strong>Status:</strong> {module.status}
            </Typography>
          </div>
        ) : (
          <div>Loading...</div>
        )}
        <Button
          component={Link}
          href="/module-master"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back
        </Button>
      </Box>
    </ProtectedRoute>
  );
}
