import winston from "winston";

const sensitiveKeys = ["password", "newPassword", "currentPassword", "token", "apiKey", "otp"];

export const redactSensitive = (obj: any): any => {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  return redacted;
};

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format,
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? format : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
