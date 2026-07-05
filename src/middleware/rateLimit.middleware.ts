import rateLimit from "express-rate-limit";

// Limiters return a standard 429 JSON response with Retry-After header automatically

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many login/register attempts from this IP, please try again after 15 minutes." },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: "Too many OTP requests from this IP, please try again after 10 minutes." },
});

export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: { message: "Too many AI requests from this IP, please try again after a minute." },
});

export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { message: "Too many file uploads from this IP, please try again after a minute." },
});

export const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Too many backup requests from this IP, please try again after an hour." },
});

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { message: "Too many requests from this IP, please try again after a minute." },
});
