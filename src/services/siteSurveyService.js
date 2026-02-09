import apiClient from './apiClient';

// Create new site survey with multiple file uploads
export const create = (payload, files = {}) => {
    const formData = new FormData();

    // Append all form fields to FormData
    Object.keys(payload).forEach(key => {
        // Skip file fields - they'll be added separately
        if (!key.includes('_photo')) {
            let value = payload[key];

            if (value !== null && value !== undefined) {
                if (typeof value === 'boolean') {
                    formData.append(key, value.toString());
                } else if (key === 'bom_detail' && Array.isArray(value)) {
                    // Serialize bom_detail array as JSON string
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value);
                }
            }
        }
    });

    // Append file fields
    if (files.building_front_photo) {
        formData.append('building_front_photo', files.building_front_photo);
    }
    if (files.roof_front_left_photo) {
        formData.append('roof_front_left_photo', files.roof_front_left_photo);
    }
    if (files.roof_front_right_photo) {
        formData.append('roof_front_right_photo', files.roof_front_right_photo);
    }
    if (files.roof_rear_left_photo) {
        formData.append('roof_rear_left_photo', files.roof_rear_left_photo);
    }
    if (files.roof_rear_right_photo) {
        formData.append('roof_rear_right_photo', files.roof_rear_right_photo);
    }
    if (files.drawing_photo) {
        formData.append('drawing_photo', files.drawing_photo);
    }
    if (files.shadow_object_photo) {
        formData.append('shadow_object_photo', files.shadow_object_photo);
    }

    return apiClient.post('/site-survey/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
};

/** Get signed URL for site survey document/photo by bucket key. Returns url string. */
export const getDocumentUrl = (path) =>
    apiClient.get('/site-survey/document-url', { params: { path } }).then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export default {
    create,
    getDocumentUrl,
};
