#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/op-config.sh"

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
