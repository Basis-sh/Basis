/**
 * Basis: Badge MCP Server - Entry Point
 * 
 * Lightweight identity verification service for AI Agents.
 * Issues cryptographically signed session badges based on wallet address status.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-mock";
import { checkStatus } from "./tools/badge";
import { signBadge } from "./tools/witness-badge";

// Define Input Schema (Strict Typing)
const issueBadgeSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: "Invalid Ethereum wallet address format",
  }),
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
    IDENTITY_KV: KVNamespace;
  };
}>();

// Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Badge (Identity Node) is Online",
    version: "v1.0.0",
    description: "Lightweight identity verification service",
  })
);

/**
 * POST /issue_badge - Issue a signed session badge for a wallet address
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Check wallet status against Blocklist/Allowlist
 * 3. Sign the badge with cryptographic proof
 * 4. Return Basis Packet with signed proof
 */
app.post("/issue_badge", x402, zValidator("json", issueBadgeSchema), async (c) => {
  const start = Date.now();
  const { wallet_address } = c.req.valid("json");

  try {
    // Get KV namespace
    const kv = c.env.IDENTITY_KV;
    if (!kv) {
      return c.json(
        {
          error: "Configuration Error",
          message: "IDENTITY_KV not configured",
        },
        500
      );
    }

    // Step 1: Check Status
    const badgeResult = await checkStatus(kv, wallet_address);

    // Step 2: Sign the Badge
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

    const proof = await signBadge(
      badgeResult.wallet_address,
      badgeResult.status,
      badgeResult.session_id,
      privateKey
    );

    const end = Date.now();
    const latency = end - start;

    // Step 3: Return Basis Packet
    return c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "badge-edge-01",
          operation: "issue_badge",
        },
        data: {
          wallet_address: badgeResult.wallet_address,
          status: badgeResult.status,
          session_id: badgeResult.session_id,
        },
        proof: proof, // Cryptographic Handstamp
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: "Internal Server Error",
        message: error?.message || "Failed to issue badge",
      },
      500
    );
  }
});

export default app;

