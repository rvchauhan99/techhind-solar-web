import productionOrderService from "@/services/productionOrderService";
import { downloadBlob } from "@/utils/challanPrintUtils";
import { toastError } from "@/utils/toast";

export const printWorkOrderById = async (orderId) => {
  try {
    const { blob, filename } = await productionOrderService.downloadWorkOrderPdf(orderId);
    downloadBlob(blob, filename);
    return true;
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || "Failed to download work order PDF";
    toastError(message);
    return false;
  }
};

export const printPicklistById = async (orderId) => {
  try {
    const { blob, filename } = await productionOrderService.downloadPicklistPdf(orderId);
    downloadBlob(blob, filename);
    return true;
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || "Failed to download picklist PDF";
    toastError(message);
    return false;
  }
};
