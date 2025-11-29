/**
 * Witness Tool for Basis: Scan - The Signing Engine
 * 
 * Cryptographic proof generation for image classifications.
 * Creates signed certificates that prove AI model identification results.
 */

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";
import type { Classification } from "./scan";

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
 * Sign Classification - Creates cryptographic proof of image classification
 * 
 * The message payload format:
 * IMAGE_HASH:${hash}:TOP_RESULT:${label}:CONFIDENCE:${score}
 * 
 * This certifies: "Basis certifies that our Model identified this image content
 * with this specific confidence level."
 * 
 * @param imageHash - The keccak256 hash of the image (0x...)
 * @param topResult - The top classification result (label and score)
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signClassification(
  imageHash: string,
  topResult: Classification,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // Create the classification payload in the exact format specified
  // IMAGE_HASH:${hash}:TOP_RESULT:${label}:CONFIDENCE:${score}
  const payload = `IMAGE_HASH:${imageHash}:TOP_RESULT:${topResult.label}:CONFIDENCE:${topResult.score}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-scan-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

