import apiClient from './apiClient';

export const listInquiryDocuments = async (params) => {
  try {
    const response = await apiClient.get('/inquiry-documents', { params });
    const data = response.data;
    
    // Handle response format: { status, message, result: { data: [...], total, page, limit, totalPages } }
    if (data.result && data.result.data && Array.isArray(data.result.data)) {
      return {
        result: data.result,
        data: data.result.data,
        total: data.result.total,
        page: data.result.page,
        limit: data.result.limit,
        totalPages: data.result.totalPages,
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
    
    // Fallback
    return {
      result: [],
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  } catch (error) {
    console.error('Error fetching inquiry documents:', error);
    throw error;
  }
};

export const getInquiryDocumentById = (id) => apiClient.get(`/inquiry-documents/${id}`).then((r) => r.data);

export const createInquiryDocument = async (payload) => {
  const formData = new FormData();
  formData.append('inquiry_id', payload.inquiry_id);
  formData.append('doc_type', payload.doc_type);
  formData.append('remarks', payload.remarks || '');
  
  if (payload.document) {
    formData.append('document', payload.document);
  }

  const response = await apiClient.post('/inquiry-documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const updateInquiryDocument = async (id, payload) => {
  const formData = new FormData();
  if (payload.doc_type !== undefined) formData.append('doc_type', payload.doc_type);
  if (payload.remarks !== undefined) formData.append('remarks', payload.remarks);
  
  if (payload.document) {
    formData.append('document', payload.document);
  }

  const response = await apiClient.put(`/inquiry-documents/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const deleteInquiryDocument = (id) => apiClient.delete(`/inquiry-documents/${id}`).then((r) => r.data);

/** Get signed URL for viewing/downloading document (bucket). Returns url string. */
export const getDocumentUrl = (id) =>
  apiClient.get(`/inquiry-documents/${id}/url`).then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export default {
  listInquiryDocuments,
  getInquiryDocumentById,
  createInquiryDocument,
  updateInquiryDocument,
  deleteInquiryDocument,
  getDocumentUrl,
};

