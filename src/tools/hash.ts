/**
 * Hash Tool - The Micro-Notary Logic
 * 
 * Provides proof of existence through cryptographic timestamp receipts.
 * Hashes data and generates timestamped events for notarization.
 */

import { keccak256, toHex, isHex } from "viem";

/**
 * Timestamp Event Result
 */
export interface TimestampEventResult {
  event_hash: `0x${string}`;
  registered_at: string;
  original_data?: string; // Optional: store original data for reference
}

/**
 * Timestamp Event - Hash data and generate timestamp receipt
 * 
 * Logic:
 * 1. Hash the incoming data using keccak256 (if not already hashed)
 * 2. Generate ISO Timestamp
 * 3. Return event hash and timestamp (soft commit - not written to L1)
 * 
 * @param data - Data to timestamp (can be raw data or already hashed)
 * @param isAlreadyHashed - Whether the data is already a hash (default: false)
 * @returns Timestamp event result with hash and timestamp
 */
export function timestampEvent(
  data: string,
  isAlreadyHashed: boolean = false
): TimestampEventResult {
  // Validate input
  if (!data || data.length === 0) {
    throw new Error("Data cannot be empty");
  }

  let eventHash: `0x${string}`;

  if (isAlreadyHashed) {
    // Data is already a hash - validate format
    if (!data.startsWith("0x")) {
      throw new Error("Hash must start with '0x' prefix");
    }
    
    // Validate hex format
    if (!isHex(data)) {
      throw new Error("Invalid hex format for hash");
    }

    // Validate length (keccak256 produces 32-byte hash = 66 chars with 0x)
    if (data.length !== 66) {
      throw new Error(`Invalid hash length. Expected 66 characters (0x + 64 hex), got ${data.length}`);
    }

    eventHash = data as `0x${string}`;
  } else {
    // Hash the raw data using keccak256
    const dataHex = toHex(data);
    eventHash = keccak256(dataHex);
  }

  // Generate ISO 8601 timestamp
  const registeredAt = new Date().toISOString();

  return {
    event_hash: eventHash,
    registered_at: registeredAt,
    original_data: isAlreadyHashed ? undefined : data,
  };
}

/**
 * Validate Hash Format
 * Ensures hash follows strict format requirements (0x prefix, 66 chars)
 */
export function validateHashFormat(hash: string): hash is `0x${string}` {
  return (
    typeof hash === "string" &&
    hash.startsWith("0x") &&
    hash.length === 66 &&
    isHex(hash)
  );
}

