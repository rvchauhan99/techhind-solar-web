"use client";

import { useState, useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { IconEye, IconDownload, IconWritingSign } from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import { Button } from "@/components/ui/button";
import confirmOrdersService from "@/services/confirmOrdersService";
import { toastError } from "@/utils/toast";

const PREDEFINED_DOCUMENTS = [
    {
        id: "model-agreement",
        name: "Model Agreement",
        getViewBlob: (orderId) =>
            confirmOrdersService.getModelAgreementPdf(orderId, { action: "view" }),
        getDownloadBlob: (orderId) =>
            confirmOrdersService.getModelAgreementPdf(orderId, { action: "download" }),
        getDownloadWithSignaturesBlob: (orderId) =>
            confirmOrdersService.getModelAgreementPdf(orderId, { action: "download", withSignatures: true }),
        getDownloadFilename: (orderNumber, orderId) =>
            `model-agreement-${orderNumber || orderId}.pdf`,
        getSignedDownloadFilename: (orderNumber, orderId) =>
            `model-agreement-signed-${orderNumber || orderId}.pdf`,
    },
];

function IconActionButton({ label, onClick, disabled, children, className = "" }) {
    return (
        <div className="relative group shrink-0">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className={`size-7 border-slate-200 text-slate-600 hover:border-primary hover:text-primary ${className}`}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
            >
                {children}
            </Button>
            <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white shadow">
                {label}
            </span>
        </div>
    );
}

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

    const handleDownloadWithSignatures = useCallback(
        async (doc) => {
            if (!orderId) return;
            setLoading(doc.id, "download-signed", true);
            try {
                const blob = await doc.getDownloadWithSignaturesBlob(orderId);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = doc.getSignedDownloadFilename(orderNumber, orderId);
                a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error(`${doc.name} PDF signed download failed:`, err);
                toastError(err?.response?.data?.message || err?.message || "Failed to download signed PDF");
            } finally {
                setLoading(doc.id, "download-signed", false);
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
                stickyWidth: 120,
                render: (row) => (
                    <div
                        className="flex items-center gap-1 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <IconActionButton
                            label="View"
                            onClick={() => handleView(row)}
                            disabled={loadingIds[`${row.id}-view`]}
                        >
                            <IconEye className="size-3.5" />
                        </IconActionButton>
                        <IconActionButton
                            label="Download"
                            onClick={() => handleDownload(row)}
                            disabled={loadingIds[`${row.id}-download`]}
                        >
                            <IconDownload className="size-3.5" />
                        </IconActionButton>
                        {typeof row.getDownloadWithSignaturesBlob === "function" ? (
                            <IconActionButton
                                label="Download With Sign & Stamp"
                                onClick={() => handleDownloadWithSignatures(row)}
                                disabled={loadingIds[`${row.id}-download-signed`]}
                                className="text-violet-600 hover:text-violet-700 hover:border-violet-400"
                            >
                                <IconWritingSign className="size-3.5" />
                            </IconActionButton>
                        ) : null}
                    </div>
                ),
            },
        ],
        [handleView, handleDownload, handleDownloadWithSignatures, loadingIds]
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
