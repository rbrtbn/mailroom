#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/op-config.sh"

KV_BINDING="STATE_KV"
KV_NAMESPACE="mailroom-state"
CONFIG_FILE="wrangler.jsonc"

# --- Wrangler configuration ---

if ! command -v wrangler &>/dev/null; then
  echo "❌ wrangler not found. Run: npm install -g wrangler"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "❌ jq not found. Run: brew install jq"
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ ${CONFIG_FILE} not found. It should be checked into the repo."
  exit 1
fi

echo "🔍 Looking for existing KV namespace '${KV_NAMESPACE}'..."
namespace_id=$(
  wrangler kv namespace list 2>/dev/null \
    | jq -r --arg title "$KV_NAMESPACE" '.[] | select(.title == $title) | .id // empty'
)

if [[ -n "$namespace_id" ]]; then
  echo "  ✅ Found existing namespace: ${namespace_id}"
else
  echo "  📦 Creating KV namespace '${KV_NAMESPACE}'..."
  create_output=$(wrangler kv namespace create "$KV_NAMESPACE" 2>/dev/null)
  namespace_id=$(echo "$create_output" | jq -r '.id')

  if [[ -z "$namespace_id" || "$namespace_id" == "null" ]]; then
    echo "  ❌ Failed to create namespace. Raw output:"
    echo "$create_output"
    exit 1
  fi

  echo "  ✅ Created namespace: ${namespace_id}"
fi

if grep -q '"__KV_NAMESPACE_ID__"' "$CONFIG_FILE"; then
  sed -i.bak "s/\"__KV_NAMESPACE_ID__\"/\"${namespace_id}\"/" "$CONFIG_FILE"
  rm -f "${CONFIG_FILE}.bak"
  echo "  ✅ Updated ${CONFIG_FILE} with namespace ID"
elif grep -q "$namespace_id" "$CONFIG_FILE"; then
  echo "  ℹ️  ${CONFIG_FILE} already has the correct namespace ID"
else
  echo "  ⚠️  Could not find placeholder '__KV_NAMESPACE_ID__' in ${CONFIG_FILE}"
  echo "     Manually set the '${KV_BINDING}' namespace id to: ${namespace_id}"
fi

echo ""

# --- 1Password template ---

if [[ -f "$TPL_FILE" ]]; then
  echo "📄 ${TPL_FILE} already exists, skipping"
elif ! $HAS_OP; then
  echo "ℹ️  1Password CLI not found — skipping ${TPL_FILE} generation"
  echo "   Copy .env.example to .dev.vars and fill in manually"
else
  echo "🔐 Generating ${TPL_FILE} from op://${OP_VAULT}/${OP_DEV_ITEM}"

  fields=$(op_field_names "$OP_DEV_ITEM")

  if [[ -z "$fields" ]]; then
    echo "  ❌ No secret fields found in '${OP_DEV_ITEM}' (vault: ${OP_VAULT})"
    echo "     Make sure the item exists and has password-type fields"
    exit 1
  fi

  {
    echo ""
    while IFS= read -r field; do
      echo "${field}={{ op://${OP_VAULT}/${OP_DEV_ITEM}/${field} }}"
    done <<< "$fields"
  } > "$TPL_FILE"

  echo "  ✅ Created ${TPL_FILE} with $(echo "$fields" | wc -l | tr -d ' ') secret(s):"
  echo ""
  sed 's/^/     /' "$TPL_FILE"
fi

echo ""
echo "🎉 Setup complete. Run 'npm run dev' to start."