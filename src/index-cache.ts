/**
 * Basis: Cache MCP Server - Entry Point
 * 
 * Ultra-fast short-term memory for AI Agents.
 * Provides cryptographically signed cache operations with x402 payment gate.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-mock";
import { setCache, getCache } from "./tools/cache";
import { signProofOfCustody, signDataIntegrity } from "./tools/witness-cache";

// Define Input Schemas (Strict Typing)
const setSchema = z.object({
  key: z.string().min(1).max(512), // Reasonable key length limit
  value: z.union([z.string(), z.record(z.any())]), // String or JSON object
  ttl: z.number().int().positive().optional(), // Optional TTL in seconds
});

const getSchema = z.object({
  key: z.string().min(1).max(512),
});

const app = new Hono<{
  Bindings: {
    BASIS_PRIVATE_KEY: string;
    BASIS_WALLET_ADDRESS: string;
    MEMORY_KV: KVNamespace;
  };
}>();

// Health Check (Public)
app.get("/", (c) =>
  c.json({
    status: "Basis: Cache (Memory Node) is Online",
    version: "v1.0.0",
    performance: "<50ms target latency",
  })
);

/**
 * POST /set - Store data in cache with Proof of Custody
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Store data in KV
 * 3. Sign Proof of Custody receipt
 * 4. Return Basis Packet with proof
 */
app.post("/set", x402, zValidator("json", setSchema), async (c) => {
  const start = Date.now();
  const { key, value, ttl } = c.req.valid("json");

  try {
    // Get KV namespace
    const kv = c.env.MEMORY_KV;
    if (!kv) {
      return c.json(
        {
          error: "Configuration Error",
          message: "MEMORY_KV not configured",
        },
        500
      );
    }

    // Serialize value for storage
    const serializedValue = typeof value === "string" ? value : JSON.stringify(value);

    // Step 1: Store in KV
    const storeResult = await setCache(kv, key, serializedValue, ttl);

    // Step 2: Sign Proof of Custody
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

    const proof = await signProofOfCustody(key, serializedValue, privateKey);

    const end = Date.now();
    const latency = end - start;

    // Step 3: Return Basis Packet
    return c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "cache-edge-01",
          operation: "set",
        },
        data: {
          key: storeResult.key,
          status: storeResult.status,
          ttl: storeResult.ttl,
        },
        proof: proof, // Proof of Custody
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: "Internal Server Error",
        message: error?.message || "Failed to store data in cache",
      },
      500
    );
  }
});

/**
 * GET /get - Retrieve data from cache with Data Integrity Proof
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Retrieve data from KV
 * 3. Sign Data Integrity proof (proves data hasn't changed)
 * 4. Return Basis Packet with proof
 */
app.get("/get", x402, async (c) => {
  const start = Date.now();
  
  // Validate query parameter
  const key = c.req.query("key");
  if (!key) {
    return c.json(
      {
        error: "Bad Request",
        message: "Missing required query parameter: key",
      },
      400
    );
  }
  
  // Validate key format
  const validation = getSchema.safeParse({ key });
  if (!validation.success) {
    return c.json(
      {
        error: "Bad Request",
        message: validation.error.errors[0].message,
      },
      400
    );
  }
  
  const { key: validatedKey } = validation.data;

  try {
    // Get KV namespace
    const kv = c.env.MEMORY_KV;
    if (!kv) {
      return c.json(
        {
          error: "Configuration Error",
          message: "MEMORY_KV not configured",
        },
        500
      );
    }

    // Step 1: Retrieve from KV
    const getResult = await getCache(kv, validatedKey);

    if (!getResult.found) {
      return c.json(
        {
          error: "Not Found",
          message: `No data found for key: ${validatedKey}`,
        },
        404
      );
    }

    // Step 2: Sign Data Integrity Proof
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

    const proof = await signDataIntegrity(validatedKey, getResult.value!, privateKey);

    const end = Date.now();
    const latency = end - start;

    // Step 3: Return Basis Packet
    return c.json({
      basis_packet: {
        meta: {
          id: crypto.randomUUID(),
          latency_ms: latency,
          node: "cache-edge-01",
          operation: "get",
        },
        data: {
          key: getResult.key,
          value: getResult.value,
          found: getResult.found,
        },
        proof: proof, // Data Integrity Proof
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve data from cache",
      },
      500
    );
  }
});

export default app;

