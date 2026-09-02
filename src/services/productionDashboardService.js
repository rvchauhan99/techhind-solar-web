import apiClient from "./apiClient";

export const getProductionDashboard = (params = {}) =>
  apiClient.get("/production-orders/dashboard", { params }).then((r) => r.data);

/** Trace a finished-good serial back to the component serials consumed for it. */
export const getSerialGenealogy = (params = {}) =>
  apiClient.get("/production-orders/serial-genealogy", { params }).then((r) => r.data);

export default {
  getProductionDashboard,
  getSerialGenealogy,
};
