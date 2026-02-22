#!/usr/bin/env bash
set -euo pipefail

KV_BINDING="STATE_KV"
KV_NAMESPACE="mailroom-state"
CONFIG_FILE="wrangler.jsonc"

if ! command -v wrangler &>/dev/null; then
  echo "❌ wrangler not found. Run: npm install -g wrangler"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "❌ jq not found. Run: brew install jq"
  exit 1
fi

# Create wrangler.jsonc if it doesn't exist
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "📄 Creating ${CONFIG_FILE}..."
  cp wrangler.jsonc.tpl "$CONFIG_FILE"
fi

# Check if the namespace already exists
echo "🔍 Looking for existing KV namespace '${KV_NAMESPACE}'..."
namespace_id=$(
  wrangler kv namespace list 2>/dev/null \
    | jq -r --arg title "$KV_NAMESPACE" '.[] | select(.title == $title) | .id // empty'
)

if [[ -n "$namespace_id" ]]; then
  echo "✅ Found existing namespace: ${namespace_id}"
else
  echo "📦 Creating KV namespace '${KV_NAMESPACE}'..."
  create_output=$(wrangler kv namespace create "$KV_NAMESPACE" 2>/dev/null)
  namespace_id=$(echo "$create_output" | jq -r '.id')

  if [[ -z "$namespace_id" || "$namespace_id" == "null" ]]; then
    echo "❌ Failed to create namespace. Raw output:"
    echo "$create_output"
    exit 1
  fi

  echo "✅ Created namespace: ${namespace_id}"
fi

# Update wrangler.jsonc
if grep -q '"__KV_NAMESPACE_ID__"' "$CONFIG_FILE"; then
  sed -i.bak "s/\"__KV_NAMESPACE_ID__\"/\"${namespace_id}\"/" "$CONFIG_FILE"
  rm -f "${CONFIG_FILE}.bak"
  echo "✅ Updated ${CONFIG_FILE} with namespace ID"
elif grep -q "$namespace_id" "$CONFIG_FILE"; then
  echo "ℹ️  ${CONFIG_FILE} already has the correct namespace ID"
else
  echo "⚠️  Could not find placeholder '__KV_NAMESPACE_ID__' in ${CONFIG_FILE}"
  echo "   Manually set the '${KV_BINDING}' namespace id to: ${namespace_id}"
fi