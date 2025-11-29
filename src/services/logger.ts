/**
 * Logger Service - The Black Box
 * 
 * Asynchronous logging to Supabase for audit trail and analytics.
 * Uses executionCtx.waitUntil() to ensure logging doesn't block user responses.
 */

import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { BasisContext, SupabaseRequestLog } from "../types";

/**
 * Log request to Supabase asynchronously
 * 
 * This function uses executionCtx.waitUntil() to ensure logging
 * happens in the background without blocking the response.
 * 
 * @param c - Hono context with environment variables and execution context
 * @param status - HTTP status code of the response
 * @param meta - Additional metadata to log (latency, url, witness_id, etc.)
 */
export function logRequest(
  c: Context,
  status: number,
  meta: {
    latency_ms?: number;
    url?: string;
    witness_id?: string;
    tx_hash?: string;
    [key: string]: any;
  }
): void {
  // Get execution context for async operations
  const executionCtx = c.executionCtx;
  if (!executionCtx) {
    console.warn("Execution context not available, skipping async log");
    return;
  }

  // Get environment variables
  const supabaseUrl = c.env.SUPABASE_URL as string | undefined;
  const supabaseKey = c.env.SUPABASE_KEY as string | undefined;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not configured, skipping log");
    return;
  }

  // Get wallet address from context (set by x402 middleware)
  const contextVars = c.var as BasisContext;
  const walletAddress = contextVars.wallet_address ?? null;
  const txHash = contextVars.tx_hash || meta.tx_hash || null;

  // Prepare log entry
  const logEntry: SupabaseRequestLog = {
    tool_name: "basis_fetch",
    wallet_address: walletAddress,
    status: status,
    meta: {
      ...meta,
      tx_hash: txHash || undefined,
    },
  };

  // Execute logging asynchronously using waitUntil
  // This ensures the response is sent immediately while logging happens in background
  executionCtx.waitUntil(
    (async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from("request_logs").insert([logEntry]);

        if (error) {
          console.error("Failed to log request to Supabase:", error);
        }
      } catch (error) {
        // Silently fail - logging should never break the user experience
        console.error("Unexpected error during async logging:", error);
      }
    })()
  );
}

