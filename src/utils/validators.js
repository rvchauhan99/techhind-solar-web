/**
 * Validation utility functions for form fields
 * Provides industry-standard validation for GSTIN, PAN, email, phone, and pincode
 */

/**
 * Validates GSTIN (GST Identification Number)
 * Format: 15 characters - [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}
 * Example: 27AAAAA0000A1Z5
 * 
 * @param {string} gstin - GSTIN to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateGSTIN = (gstin) => {
  if (!gstin || gstin.trim() === "") {
    return { isValid: true, message: "" }; // Optional field
  }

  const cleaned = gstin.trim().toUpperCase();
  
  if (cleaned.length !== 15) {
    return { isValid: false, message: "GSTIN must be exactly 15 characters" };
  }

  // GSTIN pattern: 2 digits + 5 uppercase letters + 4 digits + 1 uppercase letter + 1 alphanumeric + Z + 1 alphanumeric
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinPattern.test(cleaned)) {
    return { isValid: false, message: "Invalid GSTIN format. Expected format: 27AAAAA0000A1Z5" };
  }

  return { isValid: true, message: "" };
};

/**
 * Derives PAN from a valid Indian GSTIN (chars 3-12 of the 15-char GSTIN).
 * @param {string} gstin - GSTIN to derive from
 * @returns {string|null} - The 10-char PAN if GSTIN is valid, otherwise null
 */
export const derivePanFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== "string") return null;
  const normalized = gstin.trim().toUpperCase().replace(/\s/g, "");
  if (normalized.length !== 15) return null;
  if (!validateGSTIN(gstin).isValid) return null;
  return normalized.slice(2, 12);
};

/**
 * Validates PAN (Permanent Account Number)
 * Format: 10 characters - [A-Z]{5}[0-9]{4}[A-Z]{1}
 * Example: ABCDE1234F
 * 
 * @param {string} pan - PAN to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePAN = (pan) => {
  if (!pan || pan.trim() === "") {
    return { isValid: true, message: "" }; // Optional field
  }

  const cleaned = pan.trim().toUpperCase();
  
  if (cleaned.length !== 10) {
    return { isValid: false, message: "PAN must be exactly 10 characters" };
  }

  // PAN pattern: 5 uppercase letters + 4 digits + 1 uppercase letter
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  if (!panPattern.test(cleaned)) {
    return { isValid: false, message: "Invalid PAN format. Expected format: ABCDE1234F" };
  }

  return { isValid: true, message: "" };
};

/**
 * Validates email address
 * Uses standard email regex pattern
 * 
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === "") {
    return { isValid: true, message: "" }; // Optional field
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(email.trim())) {
    return { isValid: false, message: "Please enter a valid email address" };
  }

  // Additional check for email length
  if (email.trim().length > 254) {
    return { isValid: false, message: "Email address is too long" };
  }

  return { isValid: true, message: "" };
};

/**
 * Validates phone number in Indian format.
 * Kept for backward compatibility for fields that still expect a 10‑digit Indian mobile.
 *
 * @param {string} phone - Phone number to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === "") {
    return { isValid: true, message: "" }; // Optional field
  }

  // Remove spaces, dashes, and +91 prefix for validation
  const cleaned = phone.replace(/[\s\-+]/g, "").replace(/^91/, "");
  
  // Check if it's exactly 10 digits
  const phonePattern = /^[6-9][0-9]{9}$/;
  
  if (cleaned.length !== 10) {
    return { isValid: false, message: "Phone number must be 10 digits" };
  }

  if (!phonePattern.test(cleaned)) {
    return { isValid: false, message: "Phone number must start with 6, 7, 8, or 9" };
  }

  return { isValid: true, message: "" };
};

/**
 * Validates phone number in international E.164 format.
 * Accepts: + followed by 2–15 digits, no leading zero after +.
 * Examples: +918123456789, +14155552671
 *
 * @param {string} phone - Phone number to validate
 * @param {object} [options]
 * @param {boolean} [options.required=false] - Whether the field is required
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateE164Phone = (phone, { required = false } = {}) => {
  const raw = (phone ?? "").trim();

  if (!raw) {
    if (required) {
      return { isValid: false, message: "Mobile number is required" };
    }
    return { isValid: true, message: "" };
  }

  // Remove spaces and hyphens for validation, but keep leading +
  const cleaned = raw.replace(/[\s-]/g, "");

  const pattern = /^\+[1-9]\d{1,14}$/;
  if (!pattern.test(cleaned)) {
    return {
      isValid: false,
      message: "Enter a valid mobile number with country code (e.g. +918123456789)",
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Validates pincode (Indian postal code)
 * Format: Exactly 6 digits
 * 
 * @param {string} pincode - Pincode to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePincode = (pincode) => {
  if (!pincode || pincode.trim() === "") {
    return { isValid: true, message: "" }; // Optional field
  }

  const cleaned = pincode.trim();
  
  if (cleaned.length !== 6) {
    return { isValid: false, message: "Pincode must be exactly 6 digits" };
  }

  const pincodePattern = /^[0-9]{6}$/;
  
  if (!pincodePattern.test(cleaned)) {
    return { isValid: false, message: "Pincode must contain only digits" };
  }

  return { isValid: true, message: "" };
};

/**
 * Formats phone number for display
 * Adds spacing for better readability: 98765 43210
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return "";
  
  // Remove all non-digits except + at the start
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // If starts with +91, format as +91 XXXXX XXXXX
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  
  // If starts with 91, format as 91 XXXXX XXXXX
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  // Format as XXXXX XXXXX for 10 digits
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return cleaned;
};

/**
 * Formats input to uppercase (for GSTIN, PAN)
 * 
 * @param {string} value - Value to format
 * @returns {string} - Uppercase value
 */
export const formatToUpperCase = (value) => {
  if (!value) return "";
  return value.toUpperCase();
};
