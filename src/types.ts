/**
 * Shared TypeScript interfaces and types for Basis: Fetch MCP Server
 * 
 * Industrial Architecture Note:
 * These types ensure type safety across the entire application,
 * enabling compile-time validation and better IDE support.
 */

/**
 * Result object returned by the fetch tool
 * Contains the fetched URL, cleaned content, HTTP status, and performance metrics
 */
export interface FetchResult {
  url: string;
  content: string;
  status: number;
  latency_ms: number;
}

/**
 * MCP Tool Definition following the Model Context Protocol specification
 * Used in the /manifest endpoint to describe available tools
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: {
      url: {
        type: "string";
        description: string;
      };
    };
    required: string[];
  };
}

/**
 * MCP Manifest response structure
 * Provides metadata about the server and available tools
 */
export interface MCPManifest {
  name: string;
  description: string;
  price_per_use: string;
  tools: MCPToolDefinition[];
}

/**
 * Request body structure for the /execute endpoint
 * Validated using Zod schema
 */
export interface ExecuteRequest {
  tool: string;
  args: {
    url: string;
  };
}

/**
 * Standardized error response structure
 * Used for consistent error handling across all endpoints
 */
export interface ErrorResponse {
  error: string;
  message?: string;
}

/**
 * Payment details structure for 402 Payment Required responses
 * Follows the x402 payment protocol specification
 */
export interface PaymentDetails {
  chain: string;
  network: string;
  currency: string;
  amount: string;
  recipient: string;
}

/**
 * 402 Payment Required response structure
 */
export interface PaymentRequiredResponse {
  error: string;
  payment: PaymentDetails;
}

/**
 * Witness proof structure
 * Contains cryptographic proof of data integrity and origin
 */
export interface WitnessProof {
  witness_id: string;
  method: string;
  signer: string;
  hash: string;
  signature: string;
}

/**
 * Basis Packet structure
 * The premium response format that includes data + cryptographic proof
 */
export interface BasisPacket {
  meta: {
    timestamp: string;
    latency_ms: number;
    status: number;
  };
  data: {
    url: string;
    content: string;
  };
  proof: WitnessProof;
}

/**
 * Basis Packet Response
 * Wraps the basis packet in the response structure
 */
export interface BasisPacketResponse {
  basis_packet: BasisPacket;
}

/**
 * USDC Transfer Event Log Structure
 * ERC20 Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
 * Topic[0]: keccak256("Transfer(address,address,uint256)")
 * Topic[1]: from (padded to 32 bytes)
 * Topic[2]: to (padded to 32 bytes)
 * Data: value (uint256)
 */
export interface USDCLog {
  address: `0x${string}`; // USDC contract address
  topics: [`0x${string}`, `0x${string}`, `0x${string}`]; // [eventSig, from, to]
  data: `0x${string}`; // value (uint256)
}

/**
 * Decoded USDC Transfer Event
 * Extracted from the log for validation
 */
export interface DecodedUSDCTransfer {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint; // Raw value (6 decimals)
}

/**
 * Supabase Request Log Schema
 * Matches the database table structure
 */
export interface SupabaseRequestLog {
  tool_name: string;
  wallet_address: string | null;
  status: number;
  meta: {
    latency_ms?: number;
    url?: string;
    witness_id?: string;
    tx_hash?: string;
    [key: string]: any;
  };
  created_at?: string;
}

/**
 * Context Variables
 * Extended Hono context with custom variables
 */
export interface BasisContext {
  wallet_address?: `0x${string}`;
  tx_hash?: `0x${string}`;
}

