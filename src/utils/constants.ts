// Bad request http response code
export const HTTP_OK = 200;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_CONFLICT = 409;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const GET_LIMIT = 100;
export const PRODUCTION_ENV = "production";
export const STAGING_ENV = "staging";
export const DEVELOPMENT_ENV = "dev";

// S3 prefixes
export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Store only one image at a time regardless of how many times object detection has run
export const PROCESS_IMAGE_NAME = "processedImage";
