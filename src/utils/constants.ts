export const MESSAGE_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  FAILED_PERMANENT: "FAILED_PERMANENT",
} as const;

export const CONCURRENCY_LIMIT = 10;
export const TIME_WINDOW_MS = 60000;

export const PORT = process.env.PORT || 3000;
export const API_URL = process.env.API_URL || '/api/v1';
export const DATABASE_URL = process.env.DB_URL || 'mongodb://localhost:27017/birthday-db';
export const EMAIL_SERVICE_URL =
  process.env.EMAIL_SERVICE_URL || 'https://email-service.digitalenvision.com.au/send-email';
