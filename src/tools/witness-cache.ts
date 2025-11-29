/**
 * Witness Tool for Basis: Cache - The "Soul" of Basis
 * 
 * Cryptographic proof generation for cache operations.
 * Provides "Proof of Custody" for SET operations and data integrity proofs for GET operations.
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
 * Sign Proof of Custody - For SET operations
 * Creates cryptographic proof that Basis holds the data as of a specific timestamp.
 * 
 * @param key - The cache key
 * @param value - The stored value
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signProofOfCustody(
  key: string,
  value: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // Create the Proof of Custody statement
  // "I hold this data as of [Timestamp]."
  const custodyStatement = `I hold this data as of ${timestamp}. Key: ${key}, Value: ${value}`;
  const contentHash = keccak256(toHex(custodyStatement));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-cache-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

/**
 * Sign Data Integrity Proof - For GET operations
 * Creates cryptographic proof that the retrieved data hasn't changed.
 * 
 * @param key - The cache key
 * @param value - The retrieved value
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signDataIntegrity(
  key: string,
  value: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // Create the data integrity proof
  // Lock key, value, and timestamp together
  const payload = `${key}:${value}:${timestamp}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-cache-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

