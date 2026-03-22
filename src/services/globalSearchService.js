import apiClient from "./apiClient";

export const getGlobalSearch = (params = {}) =>
  apiClient.get("/global-search", { params }).then((r) => r.data);
