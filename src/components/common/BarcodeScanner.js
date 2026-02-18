"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Alert,
    Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

/**
 * BarcodeScanner
 *
 * A full-screen modal that uses the device camera (via html5-qrcode) to scan
 * barcodes and QR codes.  After each successful scan, `onScan(value)` is called.
 * The modal stays open so the caller can advance to the next serial slot; call
 * `onClose()` to dismiss it.
 *
 * @param {boolean}  open    - Controls visibility of the dialog
 * @param {Function} onScan  - Called with the decoded string after each scan
 * @param {Function} onClose - Called when the user taps Cancel / X
 * @param {string}   [hint]  - Optional instruction shown above the camera view
 *                             e.g. "Scanning serial 3 of 5"
 */
export default function BarcodeScanner({ open, onScan, onClose, hint = "" }) {
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);
    const [starting, setStarting] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [showScanNextHint, setShowScanNextHint] = useState(false);
    const setShowScanNextHintRef = useRef(setShowScanNextHint);
    setShowScanNextHintRef.current = setShowScanNextHint;
    const SCANNER_ELEMENT_ID = "barcodeScanner__region";

    // Auto-hide "Scan next" hint after 2.5s
    useEffect(() => {
        if (!showScanNextHint) return;
        const t = setTimeout(() => setShowScanNextHint(false), 2500);
        return () => clearTimeout(t);
    }, [showScanNextHint]);

    // Keep a stable ref to onScan so the scan callback never captures a stale closure
    const onScanRef = useRef(onScan);
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    // Cooldown: prevent the same physical scan from firing onScan on every camera frame
    const lastScanTime = useRef(0);
    // Session-based: same value never passed twice while dialog is open
    const lastScanValue = useRef(null);
    const COOLDOWN_MS = 1500;

    // Start / stop the scanner whenever `open` changes
    useEffect(() => {
        if (!open) {
            stopScanner();
            setShowScanNextHint(false);
            return;
        }
        // Reset each time the scanner opens so the first scan is always accepted
        lastScanTime.current = 0;
        lastScanValue.current = null;
        setShowScanNextHint(false);

        let cancelled = false;
        const startScanner = async () => {
            setStarting(true);
            setCameraError("");
            try {
                // Dynamic import so html5-qrcode is never bundled server-side
                const { Html5Qrcode } = await import("html5-qrcode");

                if (cancelled) return;

                // Verify the DOM element is available after the dialog has mounted
                if (!document.getElementById(SCANNER_ELEMENT_ID)) {
                    setCameraError("Scanner element not ready. Please try again.");
                    setStarting(false);
                    return;
                }

                const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 260, height: 160 },
                        aspectRatio: 1.5,
                    },
                    (decodedText) => {
                        if (cancelled) return;
                        const now = Date.now();
                        if (now - lastScanTime.current < COOLDOWN_MS) return;
                        const normalized = (decodedText || "").trim();
                        // Same value never passed twice in this session (no time limit)
                        if (normalized && normalized === lastScanValue.current) return;
                        lastScanTime.current = now;
                        lastScanValue.current = normalized || null;
                        onScanRef.current(decodedText);
                        if (setShowScanNextHintRef.current) setShowScanNextHintRef.current(true);
                    },
                    () => {
                        // per-frame error — ignore
                    }
                );

                if (cancelled) {
                    try { await scanner.stop(); } catch (_) { /* ignore */ }
                    return;
                }
                scannerInstanceRef.current = scanner;
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        err?.message?.includes("Permission")
                            ? "Camera permission denied. Please allow camera access and try again."
                            : err?.message || "Could not start camera.";
                    setCameraError(msg);
                }
            } finally {
                if (!cancelled) setStarting(false);
            }
        };

        // Small delay to let the Dialog finish its enter animation before the
        // scanner element is queried from the DOM.
        const timer = setTimeout(startScanner, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const stopScanner = () => {
        const scanner = scannerInstanceRef.current;
        scannerInstanceRef.current = null;
        if (!scanner) return;
        try {
            scanner.stop().catch(() => {}).finally(() => {
                try { scanner.clear(); } catch (_) {}
            });
        } catch (_) {
            // stop() may throw if scanner never started or already stopped — ignore
        }
    };

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{ sx: { m: 1, borderRadius: 2 } }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 2 }}>
                <QrCodeScannerIcon color="primary" />
                <Typography component="span" variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    Scan Barcode / QR Code
                </Typography>
                <IconButton size="small" onClick={handleClose} aria-label="Close scanner">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, pb: 2 }}>
                {hint && (
                    <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                        <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                            <Typography variant="body2">{hint}</Typography>
                        </Alert>
                    </Box>
                )}

                {cameraError ? (
                    <Box sx={{ px: 2, pt: 2 }}>
                        <Alert severity="error">{cameraError}</Alert>
                    </Box>
                ) : (
                    <Box ref={scannerRef} sx={{ position: "relative" }}>
                        {starting && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 1,
                                    bgcolor: "background.paper",
                                    minHeight: 200,
                                }}
                            >
                                <CircularProgress size={36} />
                                <Typography variant="caption" sx={{ ml: 1 }}>
                                    Starting camera…
                                </Typography>
                            </Box>
                        )}
                        {/* html5-qrcode mounts the camera feed into this element */}
                        <Box
                            id={SCANNER_ELEMENT_ID}
                            sx={{
                                width: "100%",
                                minHeight: starting ? 200 : undefined,
                                "& video": { width: "100% !important" },
                                "& #barcodeScanner__region__scan_region": { borderRadius: 1 },
                            }}
                        />
                    </Box>
                )}

                <Box sx={{ px: 2, pt: 1.5 }}>
                    {showScanNextHint ? (
                        <Alert severity="success" icon={false} sx={{ py: 0.75 }}
                            action={
                                <Button size="small" color="inherit" sx={{ minWidth: 0 }}
                                    onClick={() => setShowScanNextHint(false)}>
                                    Next
                                </Button>
                            }>
                            <Typography variant="body2">Scanned. Point camera at next barcode.</Typography>
                        </Alert>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Point the camera at the barcode or QR code on the serial number label.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
