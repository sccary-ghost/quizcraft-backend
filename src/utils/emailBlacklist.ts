import fs from "fs";
import path from "path";

// List of default disposable email domains that can be easily updated
export const DISPOSABLE_EMAIL_BLACKLIST = [
  "mailinator.com",
  "yopmail.com",
  "dispostable.com",
  "tempmail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "10minutemail.com",
  "trashmail.com",
  "getairmail.com",
  "temp-mail.org",
  "maildrop.cc",
  "maildrop.org",
  "disposable.com",
  "temp-mail.com",
  "throwawaymail.com",
  "tempmailaddress.com",
];

/**
 * Checks if the email domain belongs to a blacklisted disposable email provider.
 * @param email - The email to validate
 * @returns boolean - True if the email is disposable, false otherwise
 */
export const isDisposableEmail = (email: string): boolean => {
  if (!email) return false;
  const parts = email.split("@");
  if (parts.length < 2) return false;
  
  const domain = parts[1].trim().toLowerCase();
  
  // Match exact domain or subdomains of the blacklisted domains
  return DISPOSABLE_EMAIL_BLACKLIST.some(blacklistedDomain => {
    return domain === blacklistedDomain || domain.endsWith("." + blacklistedDomain);
  });
};
