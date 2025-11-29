/**
 * Witness Tool for Basis: Badge - The Signing Engine
 * 
 * Cryptographic proof generation for identity badges.
 * Creates signed "Handstamps" that agents can present to other servers.
 */

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";
import type { Address } from "viem";
import type { BadgeStatus } from "./badge";

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
 * Sign Badge - Creates cryptographic proof of identity status
 * 
 * The message payload format:
 * WALLET:${wallet}:STATUS:${status}:SESSION:${uuid}
 * 
 * This creates a cryptographic "Handstamp" the agent can show to other servers.
 * 
 * @param wallet - The wallet address being verified
 * @param status - The badge status (BANNED, VERIFIED, NEUTRAL)
 * @param sessionId - The session UUID
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signBadge(
  wallet: string,
  status: BadgeStatus,
  sessionId: string,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // Create the message payload in the exact format specified
  // WALLET:${wallet}:STATUS:${status}:SESSION:${uuid}
  const payload = `WALLET:${wallet}:STATUS:${status}:SESSION:${sessionId}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-badge-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

