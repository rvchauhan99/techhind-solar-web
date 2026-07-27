import apiClient from "./apiClient";

export const listB2bLeadFollowups = (params = {}) =>
  apiClient.get("/b2b-lead-followup", { params }).then((r) => r.data);

export const exportB2bLeadFollowups = (params = {}) =>
  apiClient
    .get("/b2b-lead-followup/export", { params, responseType: "blob" })
    .then((r) => r.data);

export default {
  listB2bLeadFollowups,
  exportB2bLeadFollowups,
};
