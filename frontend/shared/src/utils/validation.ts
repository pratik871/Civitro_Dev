// ---------------------------------------------------------------------------
// Input validation utilities
// ---------------------------------------------------------------------------

/**
 * Validate an Indian mobile phone number.
 * Accepts formats: 9876543210, +919876543210, 09876543210
 *
 * @param phone - Phone number string
 * @returns true if valid Indian mobile number
 */
export function validatePhone(phone: string): boolean {
  // Strip whitespace, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Indian mobile: optional +91 or 0 prefix, then 10 digits starting with 6-9
  return /^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Normalize a phone number to the +91XXXXXXXXXX format.
 *
 * @param phone - Phone number string
 * @returns Normalized phone number or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const match = cleaned.match(/^(?:\+91|0)?([6-9]\d{9})$/);
  if (!match) return null;
  return `+91${match[1]}`;
}

/**
 * Validate a 6-digit OTP.
 *
 * @param otp - OTP string
 * @returns true if valid 6-digit OTP
 */
export function validateOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim());
}

/**
 * Validate an Aadhaar number.
 * Aadhaar is a 12-digit number. The first digit cannot be 0 or 1.
 * Accepts formats with or without spaces/dashes (e.g. "1234 5678 9012").
 *
 * @param aadhaar - Aadhaar number string
 * @returns true if valid Aadhaar format
 */
export function validateAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/[\s\-]/g, '');
  return /^[2-9]\d{11}$/.test(cleaned);
}

/**
 * Validate an email address.
 *
 * @param email - Email address string
 * @returns true if valid email format
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate voice post text length.
 *
 * @param text - Voice post text
 * @returns Error message string if invalid, or null if valid
 */
export function validateVoiceText(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'Voice text cannot be empty';
  if (trimmed.length > 500) return 'Voice text cannot exceed 500 characters';
  return null;
}

/**
 * Validate GPS coordinates are within India's bounding box.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates fall within India's approximate bounds
 */
export function validateIndianCoordinates(lat: number, lng: number): boolean {
  // India bounding box (approximate):
  // Latitude:  6.5N to 35.5N
  // Longitude: 68.0E to 97.5E
  return lat >= 6.5 && lat <= 35.5 && lng >= 68.0 && lng <= 97.5;
}
