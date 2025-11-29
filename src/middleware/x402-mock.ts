/**
 * x402 Payment Gate Middleware - Mock Version
 * 
 * Simplified payment gate for Basis: Cache.
 * Validates Authorization header format (transaction hash).
 * 
 * Note: This is a mock version. Replace with full blockchain verification
 * for production use (see x402.ts for production implementation).
 */

import type { Context, Next } from "hono";

export const x402 = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  // Mock validation: Check for valid transaction hash format
  const isValidPayment = authHeader && authHeader.startsWith("0x") && authHeader.length === 66;

  if (!isValidPayment) {
    // 402 Payment Required - The Standard Response
    return c.json(
      {
        error: "Payment Required",
        message: "You must attach a valid x402 transaction hash to the Authorization header.",
        payment_context: {
          chain: "base",
          network: "mainnet",
          currency: "USDC",
          amount: "0.001",
          recipient: c.env.BASIS_WALLET_ADDRESS || "0x_SETUP_YOUR_WALLET_SECRET",
        },
      },
      402
    );
  }

  await next();
};

