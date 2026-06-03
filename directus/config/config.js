/**
 * Directus programmatic configuration.
 * Most settings are via environment variables in docker-compose.yml.
 * This file handles values that can't be expressed as env vars.
 */

module.exports = {
  // Allowed MIME types for file uploads — images and PDF only.
  // Prevents uploading executable files (JS, PHP, HTML) that could be served
  // and executed if storage were ever misconfigured to local disk.
  STORAGE_R2_ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
    "application/pdf",
  ],
};
