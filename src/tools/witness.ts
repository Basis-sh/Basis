/**
 * Witness Tool - The "Soul" of Basis
 * 
 * This is the file that makes you "Basis." It signs the data with your private key.
 * Your "Company Seal" - transforms commodity data into premium, verifiable truth.
 */

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";
import type { Address } from "viem";

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
 * Sign Content - Creates cryptographic proof of data integrity
 * 
 * @param content - The cleaned HTML content from the fetch
 * @param url - The source URL that was fetched
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signContent(
  content: string,
  url: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // 1. Create the unique fingerprint of this event
  // We lock the URL, Time, and Content together.
  const payload = `${url}:${timestamp}:${content}`;
  const contentHash = keccak256(toHex(payload));

  // 2. Cryptographically sign the fingerprint
  // Note: viem's signMessage will hash the message with Ethereum prefix
  // For signing raw hash, we use sign() method
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-edge-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1", // The standard crypto algo
    signer: account.address, // Your Public Identity (0x...)
    hash: contentHash,
    signature: signature,
  };
}
