/**
 * Signal Tool - The Risk Oracle Logic
 * 
 * Instant Risk Oracle for AI Agents.
 * Provides signed, timestamped risk assessments of crypto wallet addresses or domains.
 */

/**
 * Risk Level Types
 */
export type RiskLevel = "SANCTIONED" | "SUSPICIOUS" | "VERIFIED" | "UNKNOWN";

/**
 * Risk Assessment Result
 */
export interface RiskAssessment {
  score: number;
  label: RiskLevel;
  reason: string;
}

/**
 * Known Ethereum Burn Addresses (Common patterns)
 * These are addresses where tokens are permanently destroyed
 */
const KNOWN_BURN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000", // Zero address
  "0x000000000000000000000000000000000000dead", // Dead address
  "0xdead000000000000000000000000000000000000", // Another dead pattern
];

/**
 * Check if address looks like a burn address (Edge Logic)
 */
function isBurnAddress(target: string): boolean {
  const normalized = target.toLowerCase();
  
  // Check against known burn addresses
  if (KNOWN_BURN_ADDRESSES.includes(normalized)) {
    return true;
  }
  
  // Pattern matching: all zeros or all 'dead' patterns
  if (/^0x0+$/.test(normalized) || /^0xdead+$/i.test(normalized)) {
    return true;
  }
  
  return false;
}

/**
 * Check if target looks like a valid Ethereum address
 */
function isValidEthereumAddress(target: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(target);
}

/**
 * Check if target looks like a valid domain
 */
function isValidDomain(target: string): boolean {
  // Basic domain validation regex
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  return domainRegex.test(target);
}

/**
 * Assess Risk - Performs risk assessment on a target (wallet address or domain)
 * 
 * Logic:
 * 1. Check RISK_KV for the target (normalized to lowercase)
 * 2. If found:
 *    - "SANCTIONED" → Score: 100
 *    - "VERIFIED" → Score: 0
 *    - "SUSPICIOUS" → Score: 80
 * 3. If not found, apply edge heuristics:
 *    - Check if it's a known burn address → UNKNOWN (Score: 50)
 *    - Check if it's a valid format → UNKNOWN (Score: 50)
 *    - Invalid format → UNKNOWN (Score: 50)
 * 
 * @param kv - Cloudflare KV namespace instance
 * @param target - Wallet address (0x...) or domain name to assess
 * @returns Promise with risk assessment (score, label, reason)
 */
export async function assessRisk(
  kv: KVNamespace,
  target: string
): Promise<RiskAssessment> {
  // Normalize target (lowercase for consistent lookups)
  const normalizedTarget = target.toLowerCase().trim();

  // Step 1: Check KV for existing risk record
  const riskRecord = await kv.get(normalizedTarget);

  if (riskRecord !== null) {
    const value = riskRecord.toUpperCase().trim();
    
    // Known risk levels from KV
    if (value === "SANCTIONED") {
      return {
        score: 100,
        label: "SANCTIONED",
        reason: "Target is listed in sanctioned addresses database",
      };
    } else if (value === "VERIFIED") {
      return {
        score: 0,
        label: "VERIFIED",
        reason: "Target is verified as safe in our database",
      };
    } else if (value === "SUSPICIOUS") {
      return {
        score: 80,
        label: "SUSPICIOUS",
        reason: "Target has been flagged as suspicious",
      };
    }
    // If value is something unexpected, fall through to edge logic
  }

  // Step 2: Edge Logic (Heuristics when not in KV)
  
  // Check if it's a burn address
  if (isBurnAddress(normalizedTarget)) {
    return {
      score: 50,
      label: "UNKNOWN",
      reason: "Target appears to be a burn address (tokens sent here are permanently destroyed)",
    };
  }

  // Validate format
  if (isValidEthereumAddress(normalizedTarget)) {
    return {
      score: 50,
      label: "UNKNOWN",
      reason: "Valid Ethereum address format, but no risk data available in database",
    };
  }

  if (isValidDomain(normalizedTarget)) {
    return {
      score: 50,
      label: "UNKNOWN",
      reason: "Valid domain format, but no risk data available in database",
    };
  }

  // Invalid format - still return UNKNOWN but with different reason
  return {
    score: 50,
    label: "UNKNOWN",
    reason: "Target format not recognized. No risk data available in database",
  };
}

/**
 * KV Seeding Script (for testing)
 * 
 * To populate the RISK_KV namespace with test data, use the following:
 * 
 * ```bash
 * # Set a sanctioned address
 * wrangler kv:key put --binding=RISK_KV "0x1234567890123456789012345678901234567890" "SANCTIONED"
 * 
 * # Set a verified address
 * wrangler kv:key put --binding=RISK_KV "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" "VERIFIED"
 * 
 * # Set a suspicious address
 * wrangler kv:key put --binding=RISK_KV "0x9876543210987654321098765432109876543210" "SUSPICIOUS"
 * 
 * # Set a sanctioned domain
 * wrangler kv:key put --binding=RISK_KV "malicious-site.com" "SANCTIONED"
 * 
 * # Set a verified domain
 * wrangler kv:key put --binding=RISK_KV "trusted-site.com" "VERIFIED"
 * ```
 * 
 * Or use the Cloudflare Dashboard:
 * 1. Go to Workers & Pages → KV
 * 2. Select your RISK_KV namespace
 * 3. Add entries with:
 *    - Key: target address/domain (lowercase)
 *    - Value: "SANCTIONED", "VERIFIED", or "SUSPICIOUS"
 */

