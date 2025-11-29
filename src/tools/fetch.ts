/**
 * URL Fetching Tool - The Action
 * 
 * The scraper logic. It cleans the mess.
 */

import { validateUrl } from "../utils/security";

export interface FetchResult {
  status: number;
  content: string | null;
  error?: string;
  latency_ms?: number;
  performance?: {
    validation_ms?: number;
    fetch_ms?: number;
    processing_ms?: number;
    total_ms: number;
  };
}

export async function performFetch(url: string): Promise<FetchResult> {
  const start = Date.now();
  let validationTime = 0;
  let fetchTime = 0;
  let processingTime = 0;

  // Security: Validate URL to prevent SSRF attacks
  const validationStart = Date.now();
  try {
    validateUrl(url);
    validationTime = Date.now() - validationStart;
  } catch (error: any) {
    return {
      status: 400,
      content: null,
      error: error.message || "Invalid URL",
      performance: {
        validation_ms: Date.now() - validationStart,
        total_ms: Date.now() - start,
      },
    };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000); // 5s Hard Timeout

  try {
    const fetchStart = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Rotation: Pretend to be Chrome on Windows to avoid blocks
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    fetchTime = Date.now() - fetchStart;

    clearTimeout(id);

    if (!response.ok) {
      return {
        status: response.status,
        error: `Target refused connection: ${response.statusText}`,
        content: null,
        performance: {
          validation_ms: validationTime,
          fetch_ms: fetchTime,
          total_ms: Date.now() - start,
        },
      };
    }

    const processingStart = Date.now();
    const rawText = await response.text();

    // The Cleaning Logic (Save tokens for the Agent)
    const cleanText = rawText
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove Scripts
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "") // Remove Styles
      .replace(/<[^>]+>/g, "") // Remove Tags
      .replace(/\s+/g, " ") // Collapse Whitespace
      .trim()
      .substring(0, 50000); // Safety Limit
    processingTime = Date.now() - processingStart;

    return {
      status: 200,
      content: cleanText,
      latency_ms: Date.now() - start,
      performance: {
        validation_ms: validationTime,
        fetch_ms: fetchTime,
        processing_ms: processingTime,
        total_ms: Date.now() - start,
      },
    };
  } catch (error: any) {
    // Ensure timeout is cleared even on error
    clearTimeout(id);
    
    // Sanitize error messages to prevent information leakage
    let errorMessage: string;
    if (error.name === "AbortError") {
      errorMessage = "Timeout: Target took too long to respond";
    } else if (error.message && typeof error.message === "string") {
      // Only expose safe error messages (network errors, not internal details)
      const safeErrors = ["fetch failed", "network", "timeout", "aborted"];
      const lowerMessage = error.message.toLowerCase();
      if (safeErrors.some(safe => lowerMessage.includes(safe))) {
        errorMessage = "Network error: Failed to fetch the requested URL";
      } else {
        errorMessage = "Failed to fetch the requested URL";
      }
    } else {
      errorMessage = "Failed to fetch the requested URL";
    }
    
    return {
      status: 504,
      error: errorMessage,
      content: null,
    };
  }
}
