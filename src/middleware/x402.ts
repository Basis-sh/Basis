/**
 * x402 Payment Gate Middleware - The Gate
 * 
 * Production-grade payment processor with real blockchain verification.
 * Verifies USDC payments on Base Mainnet and prevents replay attacks.
 */

import type { Context, Next } from "hono";
import { createPublicClient, http, type Address, decodeEventLog, type Log, type Abi } from "viem";
import { base } from "viem/chains";
import type { BasisContext } from "../types";

// USDC Base Mainnet Contract Address
const USDC_BASE_ADDRESS: `0x${string}` = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// ERC20 Transfer Event ABI
// Transfer(address indexed from, address indexed to, uint256 value)
const ERC20_TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;

// Minimum payment: 0.001 USDC = 1000 units (USDC has 6 decimals)
const MIN_PAYMENT_AMOUNT = 1000n;

// Replay protection TTL: 24 hours in seconds
const REPLAY_TTL = 86400;

/**
 * Decode USDC Transfer event from log using viem's decodeEventLog
 * This provides type-safe decoding and proper handling of event data
 */
function decodeUSDCLog(log: Log): { from: Address; to: Address; value: bigint } | null {
  try {
    // Verify it's from USDC contract
    if (log.address.toLowerCase() !== USDC_BASE_ADDRESS.toLowerCase()) {
      return null;
    }

    // Use viem's decodeEventLog for robust parsing
    const decoded = decodeEventLog({
      abi: ERC20_TRANSFER_ABI,
      data: log.data,
      topics: log.topics,
    });

    // Type guard: ensure it's a Transfer event
    if (decoded.eventName !== "Transfer") {
      return null;
    }

    return {
      from: decoded.args.from as Address,
      to: decoded.args.to as Address,
      value: decoded.args.value as bigint,
    };
  } catch (error) {
    // decodeEventLog will throw if the log doesn't match the ABI
    return null;
  }
}

/**
 * Verify USDC payment on Base Mainnet
 */
async function verifyPayment(
  txHash: `0x${string}`,
  expectedRecipient: Address
): Promise<{ valid: boolean; walletAddress?: Address; error?: string }> {
  // Detect test/placeholder transaction hashes
  const isTestHash = /^0x(1234567890abcdef|0000000000000000|ffffffffffffffff)/i.test(txHash) ||
                     txHash === "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  
  if (isTestHash) {
    return {
      valid: false,
      error: "Invalid transaction hash: This appears to be a test/placeholder hash. Please use a real transaction hash from Base Mainnet.",
    };
  }
  
  try {
    // Create public client for Base Mainnet
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Fetch transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    // Critical Check 1: Transaction must be successful
    if (receipt.status !== "success") {
      return { valid: false, error: "Transaction failed or is pending" };
    }

    // Critical Check 2: Must contain logs from USDC contract
    if (!receipt.logs || receipt.logs.length === 0) {
      return { valid: false, error: "Transaction contains no logs" };
    }

    // Find USDC Transfer log
    let validTransfer: { from: Address; to: Address; value: bigint } | null = null;

    for (const log of receipt.logs) {
      const decoded = decodeUSDCLog(log);
      if (decoded) {
        // Critical Check 3: Recipient must match our wallet address
        if (decoded.to.toLowerCase() === expectedRecipient.toLowerCase()) {
          // Critical Check 4: Amount must be >= minimum
          if (decoded.value >= MIN_PAYMENT_AMOUNT) {
            validTransfer = decoded;
            break;
          }
        }
      }
    }

    if (!validTransfer) {
      return {
        valid: false,
        error: "No valid USDC transfer found to recipient address with sufficient amount",
      };
    }

    return {
      valid: true,
      walletAddress: validTransfer.from,
    };
  } catch (error: any) {
    // Handle specific viem errors
    const errorMessage = error?.message || "";
    
    // Check for transaction not found errors
    if (
      errorMessage.includes("could not be found") ||
      errorMessage.includes("Transaction receipt") ||
      errorMessage.includes("not found") ||
      error?.name === "TransactionReceiptNotFoundError"
    ) {
      return {
        valid: false,
        error: `Transaction receipt with hash "${txHash}" could not be found. The transaction may not be processed on a block yet, or the hash may be invalid. Please ensure the transaction has been confirmed on Base Mainnet.`,
      };
    }
    
    // Check for RPC/network errors
    if (
      errorMessage.includes("fetch") ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      return {
        valid: false,
        error: "Failed to connect to Base Mainnet RPC. Please try again later.",
      };
    }
    
    // Generic error fallback
    return {
      valid: false,
      error: errorMessage || "Failed to verify transaction on blockchain",
    };
  }
}

/**
 * x402 Payment Gate Middleware
 * 
 * Flow:
 * 1. Extract Authorization header (TxHash)
 * 2. Replay Check: Verify hash not in KV
 * 3. Chain Verification: Validate USDC payment on Base
 * 4. Lock: Store hash in KV with 24h TTL
 * 5. Attach wallet_address to context
 */
export const x402 = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  // Validate Authorization header format
  if (!authHeader || !authHeader.startsWith("0x") || authHeader.length !== 66) {
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

  const txHash = authHeader as `0x${string}`;
  const basisWalletAddress = c.env.BASIS_WALLET_ADDRESS as Address | undefined;
  const kv = c.env.BASIS_KV as KVNamespace | undefined;

  // Validate environment variables
  if (!basisWalletAddress) {
    return c.json(
      {
        error: "Configuration Error",
        message: "BASIS_WALLET_ADDRESS not configured",
      },
      500
    );
  }

  if (!kv) {
    return c.json(
      {
        error: "Configuration Error",
        message: "BASIS_KV not configured",
      },
      500
    );
  }

  // Step 1: Replay Protection Check (Atomic Lock Acquisition)
  // Use a two-phase locking approach to minimize race conditions:
  // 1. Check if hash exists (used or pending)
  // 2. If not, immediately acquire lock with "pending" status
  // 3. Verify payment
  // 4. Update to "used" or release lock on failure
  try {
    const existingHash = await kv.get(txHash);
    if (existingHash !== null) {
      return c.json(
        {
          error: "Payment Reuse Detected",
          message: "This transaction hash has already been used. Each payment can only be used once.",
        },
        402
      );
    }

    // Acquire lock immediately to minimize race condition window
    // Use short TTL (5 minutes) for pending state - if verification fails,
    // the lock will expire automatically
    const PENDING_TTL = 300; // 5 minutes
    await kv.put(txHash, "pending", { expirationTtl: PENDING_TTL });
  } catch (error) {
    // If KV operations fail, we should fail securely
    // This prevents bypassing payment verification
    console.error("KV replay check/lock acquisition failed:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Failed to process payment verification",
      },
      500
    );
  }

  // Step 2: Blockchain Verification
  const verification = await verifyPayment(txHash, basisWalletAddress);

  if (!verification.valid) {
    // Release the lock on verification failure
    try {
      await kv.delete(txHash);
    } catch (error) {
      // Log but don't fail - lock will expire anyway
      console.error("Failed to release lock on verification failure:", error);
    }

    return c.json(
      {
        error: "Payment Verification Failed",
        message: verification.error || "Transaction does not meet payment requirements",
        payment_context: {
          chain: "base",
          network: "mainnet",
          currency: "USDC",
          amount: "0.001",
          recipient: basisWalletAddress,
        },
      },
      402
    );
  }

  // Step 3: Update lock to "used" status with full TTL (Replay Protection)
  try {
    // Update to "used" with full 24 hour TTL
    await kv.put(txHash, "used", { expirationTtl: REPLAY_TTL });
  } catch (error) {
    // If KV write fails after verification, this is critical
    // We should fail the request to prevent double-spending
    console.error("KV lock update failed after verification:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Payment verified but failed to record usage. Please contact support.",
      },
      500
    );
  }

  // Step 4: Attach wallet address to context for logging
  (c.var as BasisContext).wallet_address = verification.walletAddress;
  (c.var as BasisContext).tx_hash = txHash;

  await next();
};
