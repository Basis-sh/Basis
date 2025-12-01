/**
 * Witness Tool for Basis: Signal - The Signing Engine
 * 
 * Cryptographic proof generation for risk assessments.
 * Creates signed certificates that prove Basis assessed a target at a specific moment.
 */

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";
import type { Address } from "viem";
import type { RiskLevel } from "./signal";

/**
 * Witness Proof Interface
 */
export interface WitnessProof {
  witness_id: string;
  timestamp: string;
  method: string;
  signer: string;
  hash: string;
  signature: string;
}

/**
 * Sign Risk Assessment - Creates cryptographic proof of risk assessment
 * 
 * The message payload format (as specified):
 * TARGET:${target}:SCORE:${score}:TIME:${timestamp}
 * 
 * This creates a cryptographic certificate: "Basis certifies that at this precise moment, 
 * this target was assessed as Safe/Unsafe."
 * 
 * @param target - The target being assessed (wallet address or domain)
 * @param score - The risk score (0-100)
 * @param timestamp - ISO timestamp string
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signRiskAssessment(
  target: string,
  score: number,
  timestamp: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  // Normalize private key format
  // Ensure it starts with 0x and is the correct length
  let normalizedKey: `0x${string}`;
  if (privateKey.startsWith("0x")) {
    normalizedKey = privateKey as `0x${string}`;
  } else {
    // Add 0x prefix if missing
    normalizedKey = `0x${privateKey}` as `0x${string}`;
  }

  // Validate format: should be 0x + 64 hex characters = 66 total
  if (normalizedKey.length !== 66) {
    throw new Error(
      `CRITICAL: BASIS_PRIVATE_KEY has invalid format. Expected 66 characters (0x + 64 hex), got ${normalizedKey.length}. ` +
      `Please ensure your private key is a valid hex string starting with 0x.`
    );
  }

  // Validate hex characters
  const hexPattern = /^0x[0-9a-fA-F]{64}$/;
  if (!hexPattern.test(normalizedKey)) {
    throw new Error(
      "CRITICAL: BASIS_PRIVATE_KEY contains invalid characters. Must be a valid hex string (0-9, a-f, A-F)."
    );
  }

  const account = privateKeyToAccount(normalizedKey);

  // Create the message payload in the exact format specified
  // TARGET:${target}:SCORE:${score}:TIME:${timestamp}
  const payload = `TARGET:${target}:SCORE:${score}:TIME:${timestamp}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-signal-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

