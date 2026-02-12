import challanService from "@/services/challanService";
import { toastError } from "@/utils/toast";

export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const printChallanById = async (challanId) => {
    try {
        const { blob, filename } = await challanService.downloadChallanPDF(challanId);
        downloadBlob(blob, filename);
        return true;
    } catch (error) {
        const message =
            error?.response?.data?.message || error?.message || "Failed to download challan PDF";
        toastError(message);
        return false;
    }
};
