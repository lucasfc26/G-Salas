export const UPLOAD_LIMITS = {
  AVATAR_MAX_BYTES: 5 * 1024 * 1024,
  PHOTO_MAX_BYTES: 50 * 1024 * 1024,
  RECEIPT_MAX_BYTES: 10 * 1024 * 1024,
  CONTRACT_MAX_BYTES: 20 * 1024 * 1024,
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
] as const;
