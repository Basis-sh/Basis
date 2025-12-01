/**
 * Basis: Signal MCP Server - Entry Point
 * 
 * Instant Risk Oracle for AI Agents.
 * Provides signed, timestamped risk assessments of crypto wallet addresses or domains.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-signal";
import { assessRisk } from "./tools/signal";
import { signRiskAssessment } from "./tools/witness-signal";
import { logRequest } from "./services/logger";
import type { BasisContext } from "./types";
import manifest from "./manifest.json";

// Define the Input Schema (Strict Typing)
const checkRiskSchema = z.object({
  target: z.string().min(1, {
    message: "Target must be a non-empty string",
  }),
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
    RISK_KV: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
  };
  Variables: BasisContext;
}>();

// 1. Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Signal (Risk Oracle Node) is Online",
    version: "v1.0.0",
    description: "Instant Risk Oracle for AI Agents",
  })
);

// 1.25. Manifest Endpoint (Public) - The Signal Fire
app.get("/manifest.json", (c) => {
  // Return the Master Manifest that lists ALL tools
  return c.json(manifest);
});

// 2. The Tool Endpoint (Protected by x402)
app.post("/check_risk", x402, zValidator("json", checkRiskSchema), async (c) => {
  const start = Date.now();
  let status = 200;
  let witnessId: string | undefined;

  try {
    const { target } = c.req.valid("json");

    // Get KV namespace
    const kv = c.env.RISK_KV;
    if (!kv) {
      status = 500;
      logRequest(c, status, {
        latency_ms: Date.now() - start,
        target: target,
        error: "RISK_KV not configured",
      }, "basis_signal");
      return c.json(
        {
          error: "Configuration Error",
          message: "RISK_KV not configured",
        },
        500
      );
    }

    // Step A: Perform the Risk Assessment
    const riskResult = await assessRisk(kv, target);

    // Step B: Witness the Truth (The Pivot)
    // This is where we sign the risk assessment.
    const privateKey = c.env.BASIS_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      status = 500;
      logRequest(c, status, {
        latency_ms: Date.now() - start,
        target: target,
        error: "BASIS_PRIVATE_KEY not configured",
      }, "basis_signal");
      return c.json(
        {
          error: "Configuration Error",
          message: "BASIS_PRIVATE_KEY not configured. Cannot create witness proof.",
        },
        500
      );
    }

    const timestamp = new Date().toISOString();
    const proof = await signRiskAssessment(
      target,
      riskResult.score,
      timestamp,
      privateKey
    );
    witnessId = proof.witness_id;

    const end = Date.now();
    const latency = end - start;

    // Step C: Return the Basis Packet
    const response = c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "signal-edge-01",
          operation: "check_risk",
        },
        data: {
          target: target,
          risk_score: riskResult.score,
          risk_label: riskResult.label,
          reason: riskResult.reason,
        },
        proof: proof, // <--- The Product: Cryptographic Certificate
      },
    });

    // Log successful request asynchronously (doesn't block response)
    logRequest(c, status, {
      latency_ms: latency,
      target: target,
      risk_score: riskResult.score,
      risk_label: riskResult.label,
      witness_id: witnessId,
    }, "basis_signal");

    return response;
  } catch (error: any) {
    status = 500;
    const errorMessage = error?.message || "Internal server error";
    
    // Log the full error details (for debugging)
    logRequest(c, status, {
      latency_ms: Date.now() - start,
      error: errorMessage,
    }, "basis_signal");
    
    // Return sanitized error message to client (prevent information leakage)
    return c.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request",
      },
      500
    );
  }
});

export default app;

