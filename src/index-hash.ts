/**
 * Basis: Hash MCP Server - Entry Point
 * 
 * Micro-notary service for proof of existence.
 * Provides cryptographically signed timestamp receipts for data hashes.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-mock";
import { timestampEvent } from "./tools/hash";
import { signTimeline } from "./tools/witness-hash";

// Define Input Schema (Strict Typing)
const timestampSchema = z.object({
  data: z.string().min(1, "Data cannot be empty"),
  is_hash: z.boolean().optional().default(false), // Optional flag if data is already a hash
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
  };
}>();

// Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Hash (Micro-Notary Node) is Online",
    version: "v1.0.0",
    description: "Cryptographic timestamp receipts for proof of existence",
  })
);

/**
 * POST /timestamp - Create a cryptographically signed timestamp receipt
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Hash data (if not already hashed) using keccak256
 * 3. Generate timestamp
 * 4. Sign timeline proof
 * 5. Return Basis Packet with proof
 * 
 * Example:
 * {
 *   "data": "User agreed to TOS v2",
 *   "is_hash": false
 * }
 * 
 * Or for pre-hashed data:
 * {
 *   "data": "0x1234...abcd",
 *   "is_hash": true
 * }
 */
app.post("/timestamp", x402, zValidator("json", timestampSchema), async (c) => {
  const start = Date.now();
  const { data, is_hash } = c.req.valid("json");

  try {
    // Step 1: Hash & Timestamp Event
    const timestampResult = timestampEvent(data, is_hash);

    // Step 2: Generate Nonce (UUID for this receipt)
    const nonce = crypto.randomUUID();

    // Step 3: Sign Timeline Proof
    const privateKey = c.env.BASIS_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      return c.json(
        {
          error: "Configuration Error",
          message: "BASIS_PRIVATE_KEY not configured. Cannot create witness proof.",
        },
        500
      );
    }

    const proof = await signTimeline(
      timestampResult.event_hash,
      timestampResult.registered_at,
      nonce,
      privateKey
    );

    const end = Date.now();
    const latency = end - start;

    // Step 4: Return Basis Packet
    return c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "hash-edge-01",
          operation: "timestamp",
        },
        data: {
          event_hash: timestampResult.event_hash,
          registered_at: timestampResult.registered_at,
          nonce: nonce,
        },
        proof: proof, // Cryptographic Timeline Proof
      },
    });
  } catch (error: any) {
    // Handle validation and execution errors
    const errorMessage = error?.message || "Failed to create timestamp receipt";
    
    // Determine appropriate status code
    let statusCode = 500;
    if (
      errorMessage.includes("must start with") ||
      errorMessage.includes("Invalid hash") ||
      errorMessage.includes("cannot be empty")
    ) {
      statusCode = 400; // Bad Request
    }

    return c.json(
      {
        error: "Timestamp Error",
        message: errorMessage,
      },
      statusCode as any
    );
  }
});

export default app;

