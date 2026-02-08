import apiClient from './apiClient';

export const listUserMasters = (params) => apiClient.get('/user-master/list', { params }).then((r) => r.data);

export const exportUserMasters = (params = {}) =>
  apiClient.get('/user-master/export', { params, responseType: 'blob' }).then((r) => r.data);

export const getUserMaster = (id) => apiClient.get(`/user-master/${id}`).then((r) => r.data);

export const createUserMaster = (payload) => apiClient.post('/user-master/create', payload).then((r) => r.data);

export const updateUserMaster = (id, payload) => apiClient.put(`/user-master/${id}`, payload).then((r) => r.data);

export const deleteUserMaster = (id) => apiClient.delete(`/user-master/${id}`).then((r) => r.data);

export const setUserPassword = (userId, payload) =>
  apiClient.put(`/user-master/${userId}/set-password`, payload).then((r) => r.data);

export default { listUserMasters, exportUserMasters, getUserMaster, createUserMaster, updateUserMaster, deleteUserMaster, setUserPassword };
