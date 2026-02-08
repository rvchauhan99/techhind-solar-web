import apiClient from './apiClient';

export const listModuleMasters = (params) =>
  apiClient.get('/module-master/list', { params }).then((r) => r.data);

export const exportModuleMasters = (params = {}) =>
  apiClient.get('/module-master/export', { params, responseType: 'blob' }).then((r) => r.data);

export const getModuleMaster = (id) => apiClient.get(`/module-master/${id}`).then((r) => r.data);

export const createModuleMaster = (payload) => apiClient.post('/module-master/create', payload).then((r) => r.data);

export const updateModuleMaster = (id, payload) => apiClient.put(`/module-master/${id}`, payload).then((r) => r.data);

export const deleteModuleMaster = (id) => apiClient.delete(`/module-master/${id}`).then((r) => r.data);

export default {
  listModuleMasters,
  exportModuleMasters,
  getModuleMaster,
  createModuleMaster,
  updateModuleMaster,
  deleteModuleMaster,
};
