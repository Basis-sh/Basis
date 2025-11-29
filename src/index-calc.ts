/**
 * Basis: Calc MCP Server - Entry Point
 * 
 * Deterministic calculation service with cryptographic audit trails.
 * Provides a liability shield for high-stakes financial/scientific calculations.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { x402 } from "./middleware/x402-mock";
import { executeFormula } from "./tools/calc";
import { signAuditTrail } from "./tools/witness-calc";
import { listFormulas } from "./tools/formulas";

// Define Input Schema (Strict Typing)
const auditMathSchema = z.object({
  formula: z.string().min(1),
  inputs: z.record(z.union([z.number(), z.string()])).refine(
    (inputs) => {
      // Ensure all values are numbers (after potential string conversion)
      return Object.values(inputs).every(
        (v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)))
      );
    },
    { message: "All input values must be numbers" }
  ),
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
    status: "Basis: Calc (Deterministic Math Node) is Online",
    version: "v1.0.0",
    description: "Deterministic calculation service with cryptographic audit trails",
  })
);

// List Available Formulas (Public)
app.get("/formulas", (c) => {
  const formulas = listFormulas();
  return c.json({
    formulas: formulas.map((f) => ({
      name: f.name,
      description: f.description,
      inputs: Object.entries(f.inputs).map(([key, def]) => ({
        name: key,
        type: def.type,
        description: def.description,
        required: def.required,
      })),
    })),
  });
});

/**
 * POST /audit_math - Execute a deterministic formula with cryptographic proof
 * 
 * Flow:
 * 1. Validate payment (x402)
 * 2. Execute formula with strict validation
 * 3. Sign audit trail certificate
 * 4. Return Basis Packet with proof
 * 
 * Example:
 * {
 *   "formula": "compound_interest",
 *   "inputs": {
 *     "principal": 1000,
 *     "rate": 0.05,
 *     "compounding_periods": 12,
 *     "years": 10
 *   }
 * }
 */
app.post("/audit_math", x402, zValidator("json", auditMathSchema), async (c) => {
  const start = Date.now();
  const { formula, inputs } = c.req.valid("json");

  try {
    // Normalize inputs: convert string numbers to numbers
    const normalizedInputs: Record<string, number> = {};
    for (const [key, value] of Object.entries(inputs)) {
      normalizedInputs[key] = typeof value === "number" ? value : Number(value);
    }

    // Step 1: Execute Formula
    const calculationResult = executeFormula(formula, normalizedInputs);

    // Step 2: Sign Audit Trail
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

    const proof = await signAuditTrail(
      calculationResult.formula_used,
      calculationResult.inputs,
      calculationResult.result,
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
          node: "calc-edge-01",
          operation: "audit_math",
        },
        data: {
          formula: calculationResult.formula_used,
          inputs: calculationResult.inputs,
          result: calculationResult.result,
        },
        proof: proof, // Cryptographic Audit Trail Certificate
      },
    });
  } catch (error: any) {
    // Handle validation and execution errors
    const errorMessage = error?.message || "Failed to execute calculation";
    
    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes("not found") || errorMessage.includes("Missing required")) {
      statusCode = 400; // Bad Request
    } else if (errorMessage.includes("Invalid")) {
      statusCode = 400; // Bad Request
    }

    return c.json(
      {
        error: "Calculation Error",
        message: errorMessage,
      },
      statusCode as any
    );
  }
});

export default app;

