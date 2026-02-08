import apiClient from './apiClient';

/**
 * Send password reset OTP to user's email
 * @param {string} email - User's email address
 * @returns {Promise} - API response
 */
export const sendPasswordResetOtp = (email) => 
  apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);

/**
 * Verify password reset OTP
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise} - API response
 */
export const verifyPasswordResetOtp = (email, otp) => 
  apiClient.post('/auth/verify-reset-otp', { email, otp }).then((r) => r.data);

/**
 * Reset password using verified OTP
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} newPassword - New password
 * @param {string} confirmPassword - Confirm password
 * @returns {Promise} - API response
 */
export const resetPassword = (email, otp, newPassword, confirmPassword) => 
  apiClient.post('/auth/reset-password', { 
    email, 
    otp, 
    new_password: newPassword, 
    confirm_password: confirmPassword 
  }).then((r) => r.data);

export default { 
  sendPasswordResetOtp, 
  verifyPasswordResetOtp, 
  resetPassword 
};
