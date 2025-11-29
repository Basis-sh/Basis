/**
 * Basis: Scan MCP Server - Entry Point
 * 
 * Visual cortex for AI Agents.
 * Provides instant, edge-native image classification with cryptographic proof.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-mock";
import { classifyImage } from "./tools/scan";
import { signClassification } from "./tools/witness-scan";

// Define Input Schema (Strict Typing)
const classifySchema = z.object({
  url: z.string().url("Invalid URL format"),
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
    AI: any; // Cloudflare Workers AI binding
  };
}>();

// Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Scan (Visual Cortex Node) is Online",
    version: "v1.0.0",
    description: "Edge-native image classification with cryptographic proof",
    model: "@cf/microsoft/resnet-50",
  })
);

/**
 * POST /classify - Classify an image using AI and return cryptographic proof
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Fetch image from URL
 * 3. Run AI inference using Cloudflare Workers AI
 * 4. Sign classification certificate
 * 5. Return Basis Packet with proof
 * 
 * Example:
 * {
 *   "url": "https://example.com/image.jpg"
 * }
 */
app.post("/classify", x402, zValidator("json", classifySchema), async (c) => {
  const start = Date.now();
  const { url } = c.req.valid("json");

  try {
    // Get AI binding
    const ai = c.env.AI;
    if (!ai) {
      return c.json(
        {
          error: "Configuration Error",
          message: "AI binding not configured. Cannot perform image classification.",
        },
        500
      );
    }

    // Step 1: Classify Image
    const classificationResult = await classifyImage(url, ai);

    // Step 2: Sign Classification Certificate
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

    const proof = await signClassification(
      classificationResult.image_hash,
      classificationResult.top_result,
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
          node: "scan-edge-01",
          operation: "classify",
          performance: classificationResult.performance ? {
            ...classificationResult.performance,
            signing_ms: latency - (classificationResult.performance.total_ms || 0),
          } : undefined,
        },
        data: {
          url: url,
          image_hash: classificationResult.image_hash,
          classifications: classificationResult.classifications,
          top_result: classificationResult.top_result,
        },
        proof: proof, // Cryptographic Classification Certificate
      },
    });
  } catch (error: any) {
    // Handle various error types gracefully
    const errorMessage = error?.message || "Failed to classify image";
    
    // Determine appropriate status code
    let statusCode = 500;
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("404") ||
      errorMessage.includes("Invalid URL")
    ) {
      statusCode = 400; // Bad Request
    } else if (
      errorMessage.includes("content type") ||
      errorMessage.includes("too large") ||
      errorMessage.includes("empty")
    ) {
      statusCode = 400; // Bad Request
    } else if (errorMessage.includes("fetch")) {
      statusCode = 502; // Bad Gateway (upstream error)
    }

    return c.json(
      {
        error: "Classification Error",
        message: errorMessage,
      },
      statusCode as any
    );
  }
});

export default app;

