import apiClient from "@/lib/api/axios";

/**
 * Fetch paginated notifications.
 * @param {{ page?: number, limit?: number, module?: string, is_read?: boolean }} params
 */
export async function fetchNotifications(params = {}) {
  const { page = 1, limit = 20, module, is_read } = params;
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (module) query.set("module", module);
  if (is_read !== undefined && is_read !== null && is_read !== "") {
    query.set("is_read", String(is_read));
  }
  const res = await apiClient.get(`/notifications?${query.toString()}`);
  return res?.data?.result ?? { data: [], total: 0, page: 1, limit: 20, total_pages: 0 };
}

/**
 * Fetch unread count.
 */
export async function fetchUnreadCount() {
  const res = await apiClient.get("/notifications/unread-count");
  return res?.data?.result?.count ?? 0;
}

/**
 * Mark a single notification as read.
 * @param {number|string} id
 */
export async function markRead(id) {
  const res = await apiClient.put(`/notifications/${id}/read`);
  return res?.data?.result ?? null;
}

/**
 * Mark all notifications as read.
 */
export async function markAllRead() {
  const res = await apiClient.put("/notifications/read-all");
  return res?.data?.result ?? { updated: 0 };
}

/**
 * Soft-delete a notification.
 * @param {number|string} id
 */
export async function deleteNotification(id) {
  await apiClient.delete(`/notifications/${id}`);
}
