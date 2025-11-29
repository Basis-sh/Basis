/**
 * Basis: Fetch MCP Server - Entry Point
 * 
 * The Brain - The router that ties Payment, Action, and Witness together.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402";
import { performFetch } from "./tools/fetch";
import { signContent } from "./tools/witness";
import { logRequest } from "./services/logger";
import type { BasisContext } from "./types";
import manifest from "./manifest.json";

// Define the Input Schema (Strict Typing)
const executeSchema = z.object({
  tool: z.literal("basis_fetch"),
  args: z.object({
    url: z.string().url(),
  }),
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
    BASIS_KV: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
  };
  Variables: BasisContext;
}>();

// 1. Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Fetch (Witness Node) is Online",
    version: "v2.0.0-witness",
  })
);

// 1.25. Manifest Endpoint (Public) - The Signal Fire
app.get("/manifest.json", (c) => {
  // Return the Master Manifest that lists ALL 6 tools
  return c.json(manifest);
});

// 1.5. Test Endpoint (No Payment Required) - For Testing Proof Generation
app.post("/test", async (c) => {
  const start = Date.now();
  
  try {
    // Get private key from environment
    const privateKey = c.env.BASIS_PRIVATE_KEY as `0x${string}`;
    const expectedWalletAddress = c.env.BASIS_WALLET_ADDRESS as string;
    
    if (!privateKey) {
      return c.json(
        {
          error: "Configuration Error",
          message: "BASIS_PRIVATE_KEY not configured",
          test_results: {
            proof_exists: false,
            signer_matches: false,
            latency_ms: Date.now() - start,
          },
        },
        500
      );
    }

    // Create a test payload (no actual fetch needed)
    const testUrl = "https://test.basis.sh/test";
    const testContent = "This is a test payload for Basis proof verification";
    
    // Generate proof (this will validate the private key format)
    let proof;
    try {
      proof = await signContent(testContent, testUrl, privateKey);
    } catch (error: any) {
      return c.json(
        {
          error: "Private Key Error",
          message: error?.message || "Failed to generate proof",
          test_results: {
            proof_exists: false,
            signer_matches: false,
            latency_ms: Date.now() - start,
            private_key_format_valid: false,
            error_details: error?.message,
          },
          troubleshooting: {
            issue: "BASIS_PRIVATE_KEY format is invalid",
            expected_format: "0x followed by 64 hexadecimal characters (66 total)",
            example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            check: "Ensure your Cloudflare Workers secret is stored exactly as shown in the example above, with no extra spaces or newlines",
          },
        },
        500
      );
    }
    
    const end = Date.now();
    const latency = end - start;
    
    // Verify signer matches expected wallet address
    const signerMatches = proof.signer.toLowerCase() === expectedWalletAddress?.toLowerCase();
    
    // Return test results
    return c.json({
      test_results: {
        proof_exists: !!proof,
        proof_object: proof,
        signer_address: proof.signer,
        expected_address: expectedWalletAddress,
        signer_matches: signerMatches,
        latency_ms: latency,
        latency_under_200ms: latency < 200,
      },
      message: "Test completed successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        error: "Test Failed",
        message: error?.message || "An error occurred during testing",
        test_results: {
          proof_exists: false,
          signer_matches: false,
          latency_ms: Date.now() - start,
        },
      },
      500
    );
  }
});

// 2. The Tool Endpoint (Protected by x402)
app.post("/verify_url", x402, zValidator("json", executeSchema), async (c) => {
  const start = Date.now();
  let status = 200;
  let witnessId: string | undefined;

  try {
    const { args } = c.req.valid("json");

    // Step A: Perform the Action
    const fetchResult = await performFetch(args.url);

    if (fetchResult.status !== 200 || !fetchResult.content) {
      status = fetchResult.status;
      // Log the error
      logRequest(c, status, {
        latency_ms: Date.now() - start,
        url: args.url,
        error: fetchResult.error,
      });
      return c.json({ error: fetchResult.error }, fetchResult.status as any);
    }

    // Step B: Witness the Truth (The Pivot)
    // This is where we sign the data.
    const privateKey = c.env.BASIS_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      status = 500;
      logRequest(c, status, {
        latency_ms: Date.now() - start,
        url: args.url,
        error: "BASIS_PRIVATE_KEY not configured",
      });
      return c.json(
        {
          error: "Configuration Error",
          message: "BASIS_PRIVATE_KEY not configured. Cannot create witness proof.",
        },
        500
      );
    }

    const proof = await signContent(fetchResult.content, args.url, privateKey);
    witnessId = proof.witness_id;

    const end = Date.now();
    const latency = end - start;

    // Step C: Return the Basis Packet
    const response = c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "edge-01",
          performance: fetchResult.performance ? {
            ...fetchResult.performance,
            signing_ms: latency - (fetchResult.performance.total_ms || 0),
          } : undefined,
        },
        data: {
          url: args.url,
          content_preview: fetchResult.content.substring(0, 100) + "...",
          full_content_length: fetchResult.content.length,
        },
        proof: proof, // <--- The Product
      },
    });

    // Log successful request asynchronously (doesn't block response)
    logRequest(c, status, {
      latency_ms: latency,
      url: args.url,
      witness_id: witnessId,
    });

    return response;
  } catch (error: any) {
    status = 500;
    const errorMessage = error?.message || "Internal server error";
    
    // Log the full error details (for debugging)
    logRequest(c, status, {
      latency_ms: Date.now() - start,
      error: errorMessage,
    });
    
    // Return sanitized error message to client (prevent information leakage)
    // Only expose generic error messages to prevent revealing internal details
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
