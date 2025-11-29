/**
 * Witness Tool for Basis: Calc - The Signing Engine
 * 
 * Cryptographic proof generation for deterministic calculations.
 * Creates signed audit trails that certify formula execution results.
 */

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";

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
 * Sign Audit Trail - Creates cryptographic proof of calculation
 * 
 * The message payload format:
 * FORMULA:${name}:INPUTS:${json_inputs}:RESULT:${result}
 * 
 * This certifies: "Basis certifies that these inputs run through this formula
 * produce exactly this result."
 * 
 * @param formulaName - Name of the formula executed
 * @param inputs - Input values used (as JSON string)
 * @param result - Calculated result
 * @param privateKey - The Basis private key (from environment)
 * @returns Witness proof object with signature and metadata
 */
export async function signAuditTrail(
  formulaName: string,
  inputs: Record<string, number>,
  result: number,
  privateKey: `0x${string}`
): Promise<WitnessProof> {
  if (!privateKey) {
    throw new Error("CRITICAL: BASIS_PRIVATE_KEY is missing. Cannot notarize.");
  }

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();

  // Create the audit trail payload in the exact format specified
  // FORMULA:${name}:INPUTS:${json_inputs}:RESULT:${result}
  const jsonInputs = JSON.stringify(inputs);
  const payload = `FORMULA:${formulaName}:INPUTS:${jsonInputs}:RESULT:${result}`;
  const contentHash = keccak256(toHex(payload));

  // Cryptographically sign the fingerprint
  const signature = await account.sign({
    hash: contentHash,
  });

  return {
    witness_id: "basis-calc-node-01",
    timestamp: timestamp,
    method: "ecdsa-secp256k1",
    signer: account.address,
    hash: contentHash,
    signature: signature,
  };
}

