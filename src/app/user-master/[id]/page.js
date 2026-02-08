"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import userService from "@/services/userMasterService";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function UserViewById() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    userService
      .getUserMaster(id)
      .then((res) => {
        const payload = res?.data || res?.result || res;
        setData(payload);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading...</p>;

  return (
    <ProtectedRoute>
      <Box>
        <Typography variant="h5">User</Typography>
        {data ? (
          <Box sx={{ mt: 2 }}>
            <div>
              <strong>Name:</strong> {data.name}
            </div>
            <div>
              <strong>Email:</strong> {data.email}
            </div>
            <div>
              <strong>Role:</strong> {data.role?.name}
            </div>
            <div>
              <strong>First Time Logged In:</strong>{" "}
              {data.first_login ? "Yes" : "No"}
            </div>
            <div>
              <strong>Status:</strong> {data.status}
            </div>
            <div>
              <strong>Mobile:</strong> {data.mobile_number || "-"}
            </div>
            <div>
              <strong>Blood Group:</strong> {data.blood_group || "-"}
            </div>
            <div>
              <strong>Birth Date:</strong>{" "}
              {data.brith_date
                ? new Date(data.brith_date).toLocaleDateString()
                : "-"}
            </div>
            <div>
              <strong>Address:</strong> {data.address || "-"}
            </div>
          </Box>
        ) : (
          <div>User not found</div>
        )}
        <Button
          component={Link}
          href="/user-master"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back
        </Button>
      </Box>
    </ProtectedRoute>
  );
}
