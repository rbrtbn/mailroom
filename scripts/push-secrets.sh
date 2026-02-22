#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/op-config.sh"

echo "🔑 Deploying production secrets to Cloudflare Workers"
echo ""

# Determine secret names: 1Password fields → .env.example keys → error
if $HAS_OP; then
  echo "Using 1Password: op://${OP_VAULT}/${OP_PROD_ITEM}"
  echo "Override with OP_VAULT and OP_PROD_ITEM env vars"
  echo ""

  secrets=$(op_field_names "$OP_PROD_ITEM")
fi

if [[ -z "${secrets:-}" ]]; then
  secrets=$(env_example_keys)
fi

if [[ -z "$secrets" ]]; then
  echo "❌ Could not determine which secrets to deploy."
  echo "   Either set up 1Password item '${OP_PROD_ITEM}' or create ${ENV_EXAMPLE}"
  exit 1
fi

count=$(echo "$secrets" | wc -l | tr -d ' ')
echo "Found ${count} secret(s) to deploy"
echo ""

failed=()

while IFS= read -r secret; do
  if $HAS_OP; then
    value=$(op read "op://${OP_VAULT}/${OP_PROD_ITEM}/${secret}" 2>/dev/null) || true

    if [[ -n "$value" ]]; then
      echo "$value" | wrangler secret put "$secret" >/dev/null
      echo "  ✅ ${secret} (from 1Password)"
      continue
    else
      echo "  ⚠️  ${secret} not found in 1Password, falling back to prompt"
    fi
  fi

  # Interactive fallback
  read -rsp "  Enter ${secret}: " value
  echo ""

  if [[ -z "$value" ]]; then
    echo "  ⏭️  ${secret} skipped (empty)"
    failed+=("$secret")
    continue
  fi

  echo "$value" | wrangler secret put "$secret" >/dev/null
  echo "  ✅ ${secret} (manual)"
done <<< "$secrets"

echo ""
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "⚠️  Skipped: ${failed[*]}"
else
  echo "🎉 All secrets deployed"
fi