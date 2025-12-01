#!/bin/bash

# Setup script for Basis Workers secrets
# This script sets BASIS_PRIVATE_KEY and BASIS_WALLET_ADDRESS for all workers

# New identity values (from run.py.backup output)
WALLET_ADDRESS="0xC40f06A8b3702D1373E0b6aEF34e48c0e44e77f0"
PRIVATE_KEY="0x796978efb40f74b514c8dca7984eb62381d3f1339f0812d1a503c128e62c127b"

echo "🔐 Setting up secrets for all Basis Workers..."
echo "============================================================"
echo ""

# Array of worker configs
workers=(
  "wrangler-badge.toml"
  "wrangler-cache.toml"
  "wrangler-calc.toml"
  "wrangler-hash.toml"
  "wrangler-scan.toml"
)

# Function to set secrets for a worker
set_secrets() {
  local config=$1
  local worker_name=$(basename "$config" .toml | sed 's/wrangler-/basis-/')
  
  echo "📦 Setting secrets for $worker_name..."
  echo "   Config: $config"
  
  # Set BASIS_WALLET_ADDRESS
  echo "$WALLET_ADDRESS" | npx wrangler secret put BASIS_WALLET_ADDRESS --config "$config"
  
  # Set BASIS_PRIVATE_KEY
  echo "$PRIVATE_KEY" | npx wrangler secret put BASIS_PRIVATE_KEY --config "$config"
  
  echo "   ✅ Done!"
  echo ""
}

# Set secrets for each worker
for config in "${workers[@]}"; do
  if [ -f "$config" ]; then
    set_secrets "$config"
  else
    echo "⚠️  Warning: $config not found, skipping..."
  fi
done

echo "============================================================"
echo "✨ All secrets configured!"
echo ""
echo "Note: basis-fetch secrets should already be set (verified working)"
echo "If you need to update basis-fetch, run:"
echo "  echo '$WALLET_ADDRESS' | npx wrangler secret put BASIS_WALLET_ADDRESS --config wrangler.toml"
echo "  echo '$PRIVATE_KEY' | npx wrangler secret put BASIS_PRIVATE_KEY --config wrangler.toml"

