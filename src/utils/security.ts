/**
 * Security Utilities
 * 
 * Common security functions for URL validation and SSRF protection
 */

/**
 * Validates URL to prevent SSRF (Server-Side Request Forgery) attacks
 * 
 * Security checks:
 * - Only allows http:// and https:// protocols
 * - Blocks private/internal IP addresses
 * - Blocks localhost and loopback addresses
 * - Blocks cloud metadata endpoints
 * - Validates URL format
 * 
 * @param url - URL string to validate
 * @returns true if URL is safe to fetch, false otherwise
 */
export function isSafeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("0.")
    ) {
      return false;
    }

    // Block cloud metadata endpoints (AWS, GCP, Azure, etc.)
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
      return false;
    }

    // Block private IP ranges (RFC 1918)
    // 10.0.0.0/8
    if (/^10\./.test(hostname)) {
      return false;
    }
    // 172.16.0.0/12
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) {
      return false;
    }
    // 192.168.0.0/16
    if (/^192\.168\./.test(hostname)) {
      return false;
    }

    // Block link-local addresses (169.254.0.0/16)
    if (/^169\.254\./.test(hostname)) {
      return false;
    }

    // Block multicast addresses (224.0.0.0/4)
    if (/^22[4-9]\./.test(hostname) || /^23[0-9]\./.test(hostname)) {
      return false;
    }

    // Additional check: Ensure hostname is not an IP address in private range
    // This catches cases where hostname is already an IP
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipRegex);
    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);
      
      // Check if it's a valid IP range
      if (a >= 0 && a <= 255 && b >= 0 && b <= 255 && c >= 0 && c <= 255 && d >= 0 && d <= 255) {
        // Private ranges
        if (
          (a === 10) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) ||
          (a === 127) ||
          (a === 0)
        ) {
          return false;
        }
      }
    }

    // Security: Block common internal/private hostnames
    // Only block if the entire hostname matches (not substrings to avoid false positives)
    const blockedHostnames = [
      "localhost",
      "local",
      "internal",
      "intranet",
      "private",
    ];
    if (blockedHostnames.includes(hostname)) {
      return false;
    }

    // If we've made it this far, the URL is safe
    return true;
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Validates and sanitizes URL for safe fetching
 * 
 * @param url - URL string to validate
 * @throws Error if URL is unsafe
 */
export function validateUrl(url: string): void {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL: URL must be a non-empty string");
  }

  try {
    // Basic URL format validation
    new URL(url);
  } catch (error) {
    throw new Error("Invalid URL: Malformed URL format");
  }

  // SSRF protection
  if (!isSafeUrl(url)) {
    throw new Error("Invalid URL: URL is not allowed for security reasons");
  }
}

