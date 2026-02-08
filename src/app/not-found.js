"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <ProtectedRoute>
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 2,
          }}
        >
          <Typography variant="h3" color="error" gutterBottom>
            404 - Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The page you are looking for doesn’t exist or has been moved.
          </Typography>

          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => router.push("/home")}
            >
              Go to Home
            </Button>
          </Box>
        </Box>
      </ProtectedRoute>
    </>
  );
}
