"use client";

import { useState, useCallback, useMemo } from "react";
import { Box, Button } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import PaginatedTable from "@/components/common/PaginatedTable";
import confirmOrdersService from "@/services/confirmOrdersService";
import { toastError } from "@/utils/toast";

const PREDEFINED_DOCUMENTS = [
    {
        id: "model-agreement",
        name: "Model Agreement",
        getViewBlob: (orderId) => confirmOrdersService.getModelAgreementPdf(orderId, { action: "view" }),
        getDownloadBlob: (orderId) => confirmOrdersService.getModelAgreementPdf(orderId, { action: "download" }),
        getDownloadFilename: (orderNumber, orderId) => `model-agreement-${orderNumber || orderId}.pdf`,
    },
];

export default function PredefinedDocumentsTab({ orderId, orderNumber }) {
    const [loadingIds, setLoadingIds] = useState({});

    const setLoading = useCallback((docId, action, value) => {
        setLoadingIds((prev) => ({ ...prev, [`${docId}-${action}`]: value }));
    }, []);

    const handleView = useCallback(
        async (doc) => {
            if (!orderId) return;
            setLoading(doc.id, "view", true);
            try {
                const blob = await doc.getViewBlob(orderId);
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch (err) {
                console.error(`${doc.name} PDF view failed:`, err);
                toastError(err?.response?.data?.message || err?.message || "Failed to generate PDF");
            } finally {
                setLoading(doc.id, "view", false);
            }
        },
        [orderId, setLoading]
    );

    const handleDownload = useCallback(
        async (doc) => {
            if (!orderId) return;
            setLoading(doc.id, "download", true);
            try {
                const blob = await doc.getDownloadBlob(orderId);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = doc.getDownloadFilename(orderNumber, orderId);
                a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error(`${doc.name} PDF download failed:`, err);
                toastError(err?.response?.data?.message || err?.message || "Failed to download PDF");
            } finally {
                setLoading(doc.id, "download", false);
            }
        },
        [orderId, orderNumber, setLoading]
    );

    const fetcher = useCallback(
        async () => ({
            data: PREDEFINED_DOCUMENTS,
            meta: { total: PREDEFINED_DOCUMENTS.length },
        }),
        []
    );

    const columns = useMemo(
        () => [
            { field: "name", label: "Document Name" },
            {
                field: "actions",
                label: "Actions",
                isActionColumn: true,
                render: (row) => (
                    <Box component="span" sx={{ display: "inline-flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleView(row)}
                            disabled={loadingIds[`${row.id}-view`]}
                        >
                            View
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(row)}
                            disabled={loadingIds[`${row.id}-download`]}
                        >
                            Download
                        </Button>
                    </Box>
                ),
            },
        ],
        [handleView, handleDownload, loadingIds]
    );

    return (
        <Box sx={{ p: 1 }}>
            <PaginatedTable
                columns={columns}
                fetcher={fetcher}
                showSearch={false}
                showPagination={false}
                initialPage={1}
                initialLimit={Math.max(PREDEFINED_DOCUMENTS.length, 1)}
                height="120px"
                getRowKey={(row) => row.id}
            />
        </Box>
    );
}
