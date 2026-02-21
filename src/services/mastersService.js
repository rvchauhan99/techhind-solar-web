import apiClient from './apiClient';

export const mastersList = (params) => apiClient.get('/masters/master-list', { params }).then((r) => r.data);

export const getList = (model, params = {}) => apiClient.get(`/masters/list/${model}`, { params }).then((r) => r.data);

export const getUserMaster = (id) => apiClient.get(`/user-master/${id}`).then((r) => r.data);

export const createUserMaster = (payload) => apiClient.post('/user-master/create', payload).then((r) => r.data);

export const updateUserMaster = (id, payload) => apiClient.put(`/user-master/${id}`, payload).then((r) => r.data);

export const deleteUserMaster = (id) => apiClient.delete(`/user-master/${id}`).then((r) => r.data);

export const deleteMaster = (id, model) => {
  const encodedModel = encodeURIComponent(model);
  return apiClient.delete(`/masters/${id}?model=${encodedModel}`).then((r) => r.data);
};

export const createMaster = (payload, model, file = null) => {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(payload).forEach(key => {
      if (key !== 'file_path') {
        formData.append(key, payload[key]);
      }
    });
    return apiClient.post(`/masters/create?model=${model}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  }
  return apiClient.post(`/masters/create?model=${model}`, payload).then((r) => r.data);
};

export const getMasterById = (id, model) => apiClient.get(`/masters/${id}`, { params: { model } }).then((r) => r.data);

export const updateMaster = (id, payload, model, file = null) => {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(payload).forEach(key => {
      if (key !== 'file_path') {
        formData.append(key, payload[key]);
      }
    });
    return apiClient.put(`/masters/${id}?model=${model}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  }
  return apiClient.put(`/masters/${id}?model=${model}`, payload).then((r) => r.data);
};

export const getReferenceOptions = (model, params = {}) => {
  const searchParams = new URLSearchParams({ model, ...params });
  return apiClient.get(`/masters/reference-options?${searchParams.toString()}`).then((r) => r.data);
};

/**
 * Fetch reference options with search and limit (for async/API-backed selects).
 * @param {string} model - Master model name (e.g. 'user.model')
 * @param {{ q?: string, limit?: number, status?: string }} params - q: search term; limit: max results (default 20); status: optional filter
 * @returns {Promise<Array>} - Array of option objects { id, label, value, ... }
 */
export const getReferenceOptionsSearch = (model, { q = '', limit = 20, status, status_in, id } = {}) => {
  const params = { model };
  if (q != null && String(q).trim() !== '') params.q = String(q).trim();
  if (limit != null) params.limit = limit;
  if (status != null && status !== '') params.status = status;
  if (status_in != null && status_in !== '') params.status_in = status_in;
  if (id != null && id !== '') params.id = id;
  const searchParams = new URLSearchParams(params);
  return apiClient
    .get(`/masters/reference-options?${searchParams.toString()}`)
    .then((r) => r.data?.result ?? r.data?.data ?? r.data ?? []);
};

/**
 * Fetch a single reference option by id (for resolving default selection display).
 * @param {string} model - Master model name (e.g. 'user.model')
 * @param {string|number} id - Option id
 * @returns {Promise<Object|null>} - Single option object { id, label, value, ... } or null
 */
export const getReferenceOptionById = (model, id) => {
  if (id == null || id === '') return Promise.resolve(null);
  const params = { model, id };
  const searchParams = new URLSearchParams(params);
  return apiClient
    .get(`/masters/reference-options?${searchParams.toString()}`)
    .then((r) => {
      const options = r.data?.result ?? r.data?.data ?? r.data ?? [];
      const arr = Array.isArray(options) ? options : [];
      return arr[0] ?? null;
    });
};

export const getConstants = () => apiClient.get(`/masters/constants`).then((r) => r.data);

export const getDefaultState = () => apiClient.get(`/masters/state/default`).then((r) => r.data);

export const getDefaultBranch = () => apiClient.get(`/masters/branch/default`).then((r) => r.data);

export const downloadSampleCsv = async (model) => {
  const res = await apiClient.get(`/masters/sample-file?model=${encodeURIComponent(model)}`, {
    responseType: 'blob',
  });
  return res.data; // Blob
};

export const uploadMasterCsv = async (model, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/masters/upload?model=${encodeURIComponent(model)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob', // Expect CSV file response
  });
  
  // Extract summary from response header (headers are usually lowercase in axios)
  let summary = null;
  const summaryHeader = res.headers['x-upload-summary'] || res.headers['X-Upload-Summary'] || res.headers.get?.('x-upload-summary');
  
  if (summaryHeader) {
    try {
      summary = typeof summaryHeader === 'string' ? JSON.parse(summaryHeader) : summaryHeader;
    } catch (e) {
      console.error('Failed to parse upload summary:', e);
    }
  }
  
  // Extract filename from content-disposition header
  let filename = `${model}-upload-result.csv`;
  const contentDisposition = res.headers['content-disposition'] || res.headers['Content-Disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }
  
  return {
    csvBlob: res.data, // The CSV file as blob
    summary: summary, // { inserted, failed, total }
    filename: filename
  };
};

/** Get signed URL for master file (bucket). Returns url string. */
export const getFileUrl = (model, id) =>
  apiClient.get(`/masters/${id}/file-url`, { params: { model } }).then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export default { mastersList, getList, getUserMaster, createUserMaster, updateUserMaster, deleteUserMaster, deleteMaster, createMaster, getMasterById, updateMaster, getReferenceOptions, getReferenceOptionsSearch, getReferenceOptionById, getConstants, getDefaultState, getDefaultBranch, downloadSampleCsv, uploadMasterCsv, getFileUrl };
