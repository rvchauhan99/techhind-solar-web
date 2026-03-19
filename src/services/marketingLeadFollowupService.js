import apiClient from "./apiClient";

export const listLeadFollowups = async (params) => {
  try {
    const response = await apiClient.get("/marketing-lead-followup", { params });
    const data = response.data;

    if (data.result && data.result.data && Array.isArray(data.result.data)) {
      return {
        result: data.result,
        data: data.result.data,
        meta: data.result.meta,
        status: data.status,
        message: data.message,
      };
    } else if (data.result && Array.isArray(data.result)) {
      return { result: data.result, data: data.result, status: data.status };
    } else if (Array.isArray(data)) {
      return { result: data, data };
    } else if (data.data && Array.isArray(data.data)) {
      return { result: data, data: data.data, meta: data.meta };
    }
    return { result: [], data: [] };
  } catch (error) {
    console.error("Error fetching lead followups:", error);
    throw error;
  }
};

export const exportLeadFollowups = (params = {}) =>
  apiClient
    .get("/marketing-lead-followup/export", { params, responseType: "blob" })
    .then((r) => r.data);

export default {
  listLeadFollowups,
  exportLeadFollowups,
};
