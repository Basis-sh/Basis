/**
 * Witness Tool for Basis: Hash - The Signing Engine
 * 
 * Cryptographic proof generation for timestamp receipts.
 * Creates signed timeline proofs that certify event existence at a specific time.
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
 * Sign Timeline - Creates cryptographic proof of event existence
 * 
 * The message payload format:
 * EVENT:${event_hash}:TIME:${timestamp}:NONCE:${uuid}
 * 
 * This certifies: "Basis certifies this event existed at this time.
 * This receipt can be verified against our Public Key."
 * 
 * @param eventHash - The keccak256 hash of the event (0x...)
 * @param timestamp - ISO timestamp when event was registered
 * @param nonce - Unique UUID for this receipt
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signTimeline(
  eventHash: `0x${string}`,
  timestamp: string,
  nonce: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const proofTimestamp = new Date().toISOString();

  // Create the timeline payload in the exact format specified
  // EVENT:${event_hash}:TIME:${timestamp}:NONCE:${uuid}
  const payload = `EVENT:${eventHash}:TIME:${timestamp}:NONCE:${nonce}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-hash-node-01",
    timestamp: proofTimestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

