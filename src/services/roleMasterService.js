import apiClient from './apiClient';

export const listRoleMasters = (params) =>
  apiClient.get('/role-master/list', { params }).then((r) => r.data);

export const exportRoleMasters = (params = {}) =>
  apiClient.get('/role-master/export', { params, responseType: 'blob' }).then((r) => r.data);

export const getRoleMaster = (id) => apiClient.get(`/role-master/${id}`).then((r) => r.data);

export const createRoleMaster = (payload) => apiClient.post('/role-master/create', payload).then((r) => r.data);

export const updateRoleMaster = (id, payload) => apiClient.put(`/role-master/${id}`, payload).then((r) => r.data);

export const deleteRoleMaster = (id) => apiClient.delete(`/role-master/${id}`).then((r) => r.data);

export default {
  listRoleMasters,
  exportRoleMasters,
  getRoleMaster,
  createRoleMaster,
  updateRoleMaster,
  deleteRoleMaster,
};
