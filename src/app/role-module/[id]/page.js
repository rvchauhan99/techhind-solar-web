"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import roleModuleService from "@/services/roleModuleService";
import roleService from "@/services/roleMasterService";
import moduleService from "@/services/moduleMasterService";
import { useParams } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function RoleModuleViewById() {
  const params = useParams();
  const id = params?.id;
  const [item, setItem] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [moduleName, setModuleName] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await roleModuleService.getRoleModule(id);
        const data = res.result || res.data || res;
        setItem(data);
        if (data.role_id) {
          const r = await roleService.getRoleMaster(data.role_id);
          setRoleName(r.result?.name || r.data?.name || r.name || "");
        }
        if (data.module_id) {
          const m = await moduleService.getModuleMaster(data.module_id);
          setModuleName(m.result?.name || m.data?.name || m.name || "");
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

  return (
    <ProtectedRoute>
      <Box>
        {item ? (
          <div>
            <Typography variant="h5">Role-Module Link</Typography>
            <Typography>
              <strong>Role:</strong> {roleName}
            </Typography>
            <Typography>
              <strong>Module:</strong> {moduleName}
            </Typography>
            <Typography>
              <strong>Can Create:</strong> {item.can_create ? "Yes" : "No"}
            </Typography>
            <Typography>
              <strong>Can Read:</strong> {item.can_read ? "Yes" : "No"}
            </Typography>
            <Typography>
              <strong>Can Update:</strong> {item.can_update ? "Yes" : "No"}
            </Typography>
            <Typography>
              <strong>Can Delete:</strong> {item.can_delete ? "Yes" : "No"}
            </Typography>
          </div>
        ) : (
          <div>Loading...</div>
        )}
        <Button
          component={Link}
          href="/role-module"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back
        </Button>
      </Box>
    </ProtectedRoute>
  );
}
