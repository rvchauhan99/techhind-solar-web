/**
 * Contract: hrmsService.* (and similar axios wrappers) already return response.data
 * = API envelope `{ result | data, message, ... }`. Callers use one unwrap(res)
 * then read list fields (`?.data`, `?.meta`) — do not peel again manually.
 */
export function unwrap(res) {
  return res?.result ?? res?.data ?? res;
}

export default unwrap;
