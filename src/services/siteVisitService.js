import apiClient from './apiClient';

// Get roof types from API
export const getRoofTypes = async () => {
  try {
    const response = await apiClient.get('/site-visit/roof-types');
    const result = response.data.result || response.data;
    return {
      result: Array.isArray(result) ? result : []
    };
  } catch (error) {
    console.error("Error fetching roof types:", error);
    // Return empty array on error
    return {
      result: []
    };
  }
};

// Get list of inquiries for dropdown
export const getInquiries = async (params = {}) => {
  try {
    // Try using masters endpoint if inquiry is a master
    const response = await apiClient.get('/masters/list/inquiry.model', { params });
    const result = response.data.result || response.data;
    return {
      result: {
        data: result.data || [],
        meta: result.meta || { total: 0 }
      }
    };
  } catch (error) {
    // If inquiry is not a master, fetch from site-visit list and extract unique inquiries
    const response = await apiClient.get('/site-visit/list', { params: {} });
    const result = response.data.result || response.data;
    const data = result.data || [];

    // Extract unique inquiries
    const inquiryMap = new Map();
    data.forEach(row => {
      if (row.inquiry_id && !inquiryMap.has(row.inquiry_id)) {
        inquiryMap.set(row.inquiry_id, {
          id: row.inquiry_id,
          date_of_inquiry: row.inquiry_date_of_inquiry,
          status: row.inquiry_status,
        });
      }
    });

    return {
      result: {
        data: Array.from(inquiryMap.values()),
        meta: { total: inquiryMap.size }
      }
    };
  }
};

// Get list of inquiries with site visits (LEFT JOIN result)
export const getList = (params = {}) => {
  // Only include sortBy and sortOrder if sortBy is provided
  const queryParams = { ...params };
  if (!queryParams.sortBy) {
    delete queryParams.sortBy;
    delete queryParams.sortOrder;
  }
  return apiClient.get('/site-visit/list', { params: queryParams }).then((r) => r.data);
};

export const exportSiteVisits = (params = {}) =>
  apiClient.get('/site-visit/export', { params, responseType: 'blob' }).then((r) => r.data);

// Create new site visit with multiple file uploads
export const create = (payload, files = {}) => {
  const formData = new FormData();

  // Define numeric fields that should be converted from empty strings to null
  const numericFields = [
    'site_latitude',
    'site_longitude',
    'height_of_parapet',
    'solar_panel_size_capacity',
    'approx_roof_area_sqft',
    'inverter_size_capacity',
  ];

  // Append all form fields to FormData
  Object.keys(payload).forEach(key => {
    // Skip file fields - they'll be added separately
    if (!key.includes('_image') && key !== 'visit_photo' && key !== 'drawing_image' &&
      key !== 'house_building_outside_photo' && key !== 'other_images_videos') {
      let value = payload[key];

      // Convert empty strings to null for numeric fields
      if (numericFields.includes(key)) {
        if (value === '' || value === null || value === undefined) {
          value = null;
        } else {
          // Convert string numbers to actual numbers, then back to string for FormData
          const numValue = Number(value);
          value = isNaN(numValue) ? null : numValue.toString();
        }
      }

      // Skip empty strings for optional fields
      if ((key === 'visit_date' || key === 'visited_by' || key === 'visit_assign_to' || key === 'schedule_on' || key === 'schedule_remarks') && (value === '' || value === null || value === undefined)) {
        return; // Don't append empty optional fields
      }

      // Skip null values for numeric fields (they'll be handled by the database as NULL)
      if (numericFields.includes(key) && value === null) {
        return; // Don't append null numeric fields
      }

      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (Array.isArray(value)) {
          // For arrays like other_images_videos, we'll handle separately
          if (key === 'other_images_videos') {
            // This will be handled in files object
          } else {
            formData.append(key, JSON.stringify(value));
          }
        } else {
          formData.append(key, value);
        }
      }
    }
  });

  // Append single file fields
  if (files.visit_photo) {
    formData.append('visit_photo', files.visit_photo);
  }
  if (files.left_corner_site_image) {
    formData.append('left_corner_site_image', files.left_corner_site_image);
  }
  if (files.right_corner_site_image) {
    formData.append('right_corner_site_image', files.right_corner_site_image);
  }
  if (files.left_top_corner_site_image) {
    formData.append('left_top_corner_site_image', files.left_top_corner_site_image);
  }
  if (files.right_top_corner_site_image) {
    formData.append('right_top_corner_site_image', files.right_top_corner_site_image);
  }
  if (files.drawing_image) {
    formData.append('drawing_image', files.drawing_image);
  }
  if (files.house_building_outside_photo) {
    formData.append('house_building_outside_photo', files.house_building_outside_photo);
  }

  // Append multiple files for other_images_videos
  if (files.other_images_videos && Array.isArray(files.other_images_videos)) {
    files.other_images_videos.forEach((file) => {
      formData.append('other_images_videos', file);
    });
  } else if (files.other_images_videos) {
    formData.append('other_images_videos', files.other_images_videos);
  }

  return apiClient.post('/site-visit/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((r) => r.data);
};

export default {
  getList,
  exportSiteVisits,
  create,
  getRoofTypes,
  getInquiries,
};

