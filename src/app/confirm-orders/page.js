"use client";

import { Box, Typography, Button, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import HomeIcon from "@mui/icons-material/Home";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListView from "./ListView";

export default function ConfirmedOrderPage() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <Box>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                >
                    <Typography variant="h5">Confirmed Orders</Typography>
                    <Stack direction="row" spacing={1}>
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
                <ListView />
            </Box>
        </ProtectedRoute>
    );
}
