import apiClient from './apiClient';

export const listFollowups = async (params) => {
  try {
    const response = await apiClient.get('/followup', { params });
    const data = response.data;
    
    // Handle response format: { status, message, result: { data: [...], meta: {...} } }
    if (data.result && data.result.data && Array.isArray(data.result.data)) {
      return {
        result: data.result,
        data: data.result.data,
        meta: data.result.meta,
        status: data.status,
        message: data.message,
      };
    }
    // Handle response format: { status, message, result: [...] }
    else if (data.result && Array.isArray(data.result)) {
      return {
        result: data.result,
        data: data.result,
        status: data.status,
        message: data.message,
      };
    }
    // Handle direct array response
    else if (Array.isArray(data)) {
      return {
        result: data,
        data: data,
      };
    }
    // Handle nested data format: { data: [...], meta: {...} }
    else if (data.data && Array.isArray(data.data)) {
      return {
        result: data,
        data: data.data,
        meta: data.meta,
      };
    }
    
    // Fallback
    return {
      result: [],
      data: [],
    };
  } catch (error) {
    console.error('Error fetching followups:', error);
    throw error;
  }
};

export const exportFollowups = (params = {}) =>
  apiClient.get('/followup/export', { params, responseType: 'blob' }).then((r) => r.data);

export const getFollowupById = (id) => apiClient.get(`/followup/${id}`).then((r) => r.data);

export const createFollowup = (payload) => apiClient.post('/followup', payload).then((r) => r.data);

export const updateFollowup = (id, payload) => apiClient.put(`/followup/${id}`, payload).then((r) => r.data);

export const deleteFollowup = (id) => apiClient.delete(`/followup/${id}`).then((r) => r.data);

export const getRatingOptions = async () => {
  try {
    const response = await apiClient.get('/followup/rating-options');
    const data = response.data;
    
    // Handle different response formats
    if (data.result && Array.isArray(data.result)) {
      return data.result;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching rating options:', error);
    throw error;
  }
};

export const getAllInquiry = async () => {
  try {
    const response = await apiClient.get('/followup/inquiry');
    const data = response.data;
    
    // Handle different response formats
    if (data.result && Array.isArray(data.result)) {
      return data.result;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    throw error;
  }
};

export default {
  listFollowups,
  exportFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  getRatingOptions,
  getAllInquiry
};

