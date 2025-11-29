# Basis

A suite of high-performance, edge-native Cloudflare Workers that provide verifiable computing services with cryptographic witness proofs. Each service implements the x402 payment protocol for pay-per-use monetization.

## Overview

Basis is a collection of specialized workers that combine **Payment**, **Action**, and **Witness** to create verifiable, edge-native services. Each service provides cryptographic proofs of execution, enabling trustless verification of results.

## Services

### 🔍 Basis: Fetch
**Witness Node** - URL fetching with cryptographic proof

- Rapidly fetch and convert URLs to clean, text-only content
- HTML cleaning (removes scripts, styles, SVG, images)
- Cryptographic witness signatures for all fetched content
- Edge performance with sub-5-second response times

**Endpoint**: `POST /verify_url`

### 👁️ Basis: Scan
**Visual Cortex Node** - Image classification with AI

- Edge-native image classification using Cloudflare Workers AI
- ResNet-50 model for accurate classifications
- Cryptographic proof of classification results
- Supports images up to 10MB

**Endpoint**: `POST /classify`

### 💾 Basis: Cache
**Memory Node** - Key-value caching with proof

- Fast KV storage operations (GET/SET)
- Cryptographic signatures for cache operations
- Sub-50ms latency target
- Replay protection via KV locks

**Endpoints**: `POST /get`, `POST /set`

### 🧮 Basis: Calc
**Math Auditor Node** - Mathematical formula verification

- Pre-validated formula execution
- Cryptographic proof of calculations
- Support for complex mathematical operations
- Ultra-fast execution (<20ms typical)

**Endpoint**: `POST /audit_math`

### 🔐 Basis: Hash
**Micro-Notary Node** - Timestamping service

- Cryptographic timestamp receipts
- Proof of existence for any data
- Keccak256 hashing
- Signed timeline proofs

**Endpoint**: `POST /timestamp`

### 🏅 Basis: Badge
**Achievement Node** - Badge issuance

- Issue verifiable achievement badges
- Status tracking via KV storage
- Cryptographic proof of issuance
- Fast badge operations (<50ms)

**Endpoint**: `POST /issue_badge`

## Architecture

### The Basis Pattern

Each service follows the **Payment → Action → Witness** pattern:

1. **Payment (x402)**: Validates blockchain payment via Base Mainnet
2. **Action**: Performs the requested operation (fetch, scan, cache, etc.)
3. **Witness**: Creates cryptographic proof of the action and result

### Technology Stack

- **Runtime**: Cloudflare Workers (Edge Computing)
- **Framework**: Hono (Lightweight, Edge-compatible)
- **Language**: TypeScript
- **Validation**: Zod schema validation
- **Cryptography**: ECDSA secp256k1 (via viem)
- **Payment**: x402 Protocol (Base Mainnet, USDC)
- **Storage**: Cloudflare KV
- **AI**: Cloudflare Workers AI (ResNet-50)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Cloudflare account with Workers enabled
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/Basis-sh/Basis.git
cd Basis

# Install dependencies
npm install

# Type check
npm run type-check
```

### Local Development

```bash
# Start development server for a specific worker
npm run dev -- --config wrangler.toml              # Basis: Fetch
npm run dev -- --config wrangler-scan.toml         # Basis: Scan
npm run dev -- --config wrangler-cache.toml        # Basis: Cache
npm run dev -- --config wrangler-calc.toml         # Basis: Calc
npm run dev -- --config wrangler-hash.toml         # Basis: Hash
npm run dev -- --config wrangler-badge.toml        # Basis: Badge
```

### Configuration

Each worker requires environment variables to be set:

#### Required Secrets (via `wrangler secret put`)

- `BASIS_PRIVATE_KEY`: Private key for cryptographic signing (hex format with `0x` prefix)
- `BASIS_WALLET_ADDRESS`: Wallet address for receiving payments
- `SUPABASE_URL`: Supabase project URL (for Fetch worker)
- `SUPABASE_KEY`: Supabase API key (for Fetch worker)

#### Example Configuration

```bash
# Set secrets for a worker
wrangler secret put BASIS_PRIVATE_KEY --config wrangler.toml
wrangler secret put BASIS_WALLET_ADDRESS --config wrangler.toml
wrangler secret put SUPABASE_URL --config wrangler.toml
wrangler secret put SUPABASE_KEY --config wrangler.toml
```

### Deployment

#### Manual Deployment

```bash
# Deploy a specific worker
npm run deploy -- --config wrangler.toml
```

#### Automated Deployment

The repository includes GitHub Actions for automated deployment. See [`.github/SETUP.md`](.github/SETUP.md) for setup instructions.

## Payment Protocol (x402)

All services require payment via the x402 protocol:

- **Chain**: Base
- **Network**: Mainnet
- **Currency**: USDC
- **Amount**: 0.001 USDC per request
- **Authorization**: Include transaction hash in `Authorization` header

### Example Request

```bash
curl -X POST https://your-worker.workers.dev/verify_url \
  -H "Content-Type: application/json" \
  -H "Authorization: 0x1234567890abcdef..." \
  -d '{
    "tool": "basis_fetch",
    "args": {
      "url": "https://example.com"
    }
  }'
```

## Response Format

All services return a **Basis Packet** with the following structure:

```json
{
  "basis_packet": {
    "meta": {
      "id": "uuid",
      "latency_ms": 123,
      "node": "edge-01",
      "performance": { ... }
    },
    "data": {
      // Service-specific data
    },
    "proof": {
      "witness_id": "uuid",
      "timestamp": "2024-01-01T00:00:00Z",
      "signature": "0x...",
      "public_key": "0x..."
    }
  }
}
```

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for detailed latency analysis and optimization notes.

### Typical Latencies

| Service | Typical Latency | Bottleneck |
|---------|----------------|------------|
| Fetch | 200-800ms | Network fetch |
| Scan | 400-1200ms | AI inference |
| Cache | 15-40ms | KV operations |
| Calc | 10-15ms | Crypto signing |
| Hash | 10-15ms | Crypto signing |
| Badge | 15-30ms | KV lookup |
| x402 Payment | 800-1500ms | Blockchain RPC |

## Project Structure

```
Basis/
├── src/
│   ├── index.ts              # Basis: Fetch entry point
│   ├── index-scan.ts         # Basis: Scan entry point
│   ├── index-cache.ts        # Basis: Cache entry point
│   ├── index-calc.ts         # Basis: Calc entry point
│   ├── index-hash.ts         # Basis: Hash entry point
│   ├── index-badge.ts        # Basis: Badge entry point
│   ├── middleware/
│   │   ├── x402.ts           # Payment verification middleware
│   │   └── x402-mock.ts      # Mock payment (for testing)
│   ├── tools/                # Service implementations
│   ├── services/             # Shared services (logger, etc.)
│   ├── utils/                # Utility functions
│   └── types.ts              # TypeScript type definitions
├── .github/
│   ├── workflows/
│   │   └── deploy.yml        # CI/CD deployment workflow
│   └── SETUP.md              # GitHub Actions setup guide
├── wrangler.toml             # Basis: Fetch configuration
├── wrangler-scan.toml        # Basis: Scan configuration
├── wrangler-cache.toml       # Basis: Cache configuration
├── wrangler-calc.toml        # Basis: Calc configuration
├── wrangler-hash.toml        # Basis: Hash configuration
├── wrangler-badge.toml       # Basis: Badge configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

- All services use cryptographic signatures for verification
- Payment verification prevents replay attacks via KV locks
- Input validation via Zod schemas
- Error messages are sanitized to prevent information leakage
- Private keys are stored as Cloudflare Workers secrets

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Built on [Cloudflare Workers](https://workers.cloudflare.com/)
- Uses [Hono](https://hono.dev/) web framework
- Implements [x402 Payment Protocol](https://x402.dev/)

