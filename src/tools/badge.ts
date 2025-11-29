/**
 * Badge Tool - The Bouncer Logic
 * 
 * Lightweight identity verification service.
 * Checks wallet addresses against Blocklist/Allowlist and issues session badges.
 */

/**
 * Badge Status Types
 */
export type BadgeStatus = "BANNED" | "VERIFIED" | "NEUTRAL";

/**
 * Badge Check Result
 */
export interface BadgeCheckResult {
  status: BadgeStatus;
  session_id: string;
  wallet_address: string;
}

/**
 * Check Status - Verifies wallet address against identity database
 * 
 * Logic:
 * - Check IDENTITY_KV for the wallet address
 * - If found and value is "BLOCK", return BANNED
 * - If found and value is "VIP", return VERIFIED
 * - If not found, return NEUTRAL (Default allow)
 * 
 * @param kv - Cloudflare KV namespace instance
 * @param wallet_address - Ethereum wallet address to check
 * @returns Promise with status and generated session ID
 */
export async function checkStatus(
  kv: KVNamespace,
  wallet_address: string
): Promise<BadgeCheckResult> {
  // Normalize wallet address (lowercase for consistent lookups)
  const normalizedAddress = wallet_address.toLowerCase();

  // Check KV for the wallet address
  const identityRecord = await kv.get(normalizedAddress);

  // Generate session ID (UUID)
  const sessionId = crypto.randomUUID();

  // Determine status based on KV value
  let status: BadgeStatus = "NEUTRAL"; // Default: allow

  if (identityRecord !== null) {
    const value = identityRecord.toUpperCase().trim();
    
    if (value === "BLOCK") {
      status = "BANNED";
    } else if (value === "VIP") {
      status = "VERIFIED";
    }
    // If value is something else, default to NEUTRAL
  }

  return {
    status,
    session_id: sessionId,
    wallet_address: normalizedAddress,
  };
}

