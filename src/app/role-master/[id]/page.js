"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import roleService from "@/services/roleMasterService";
import { useParams } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function RoleViewById() {
  const params = useParams();
  const id = params?.id;
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await roleService.getRoleMaster(id);
        setRole(res.result || res.data || res);
      } catch (err) {
        // Error handled silently
      }
    })();
  }, [id]);

  return (
    <ProtectedRoute>
      <Box>
        {role ? (
          <div>
            <Typography variant="h4">{role.name}</Typography>
            <Typography>
              <strong>Description:</strong> {role.description}
            </Typography>
            <Typography>
              <strong>Status:</strong> {role.status}
            </Typography>
          </div>
        ) : (
          <div>Loading...</div>
        )}
        <Button
          component={Link}
          href="/role-master"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back
        </Button>
      </Box>
    </ProtectedRoute>
  );
}
