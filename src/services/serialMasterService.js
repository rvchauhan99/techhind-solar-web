import apiClient from './apiClient';

export const listSerialMasters = ({ page = 1, limit = 20, q } = {}) =>
    apiClient.get('/serial-master', { params: { page, limit, q: q || undefined } }).then((r) => r.data);

export const getSerialMasterById = (id) =>
    apiClient.get(`/serial-master/${id}`).then((r) => r.data);

export const createSerialMaster = (payload) =>
    apiClient.post('/serial-master', payload).then((r) => r.data);

export const updateSerialMaster = (id, payload) =>
    apiClient.put(`/serial-master/${id}`, payload).then((r) => r.data);

export const deleteSerialMaster = (id) =>
    apiClient.delete(`/serial-master/${id}`).then((r) => r.data);

export const generateSerial = (code) =>
    apiClient.post('/serial-master/generate', { code }).then((r) => r.data);

export default {
    listSerialMasters,
    getSerialMasterById,
    createSerialMaster,
    updateSerialMaster,
    deleteSerialMaster,
    generateSerial,
};
