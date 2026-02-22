#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/op-config.sh"

HAS_DEV_VARS=false
[[ -f .dev.vars ]] && HAS_DEV_VARS=true

# If .dev.vars exists, use it as-is
if $HAS_DEV_VARS; then
  echo "📄 Using existing .dev.vars"
  wrangler dev "$@"
  status=$?
  if $HAS_OP && ! $HAS_TPL; then
    echo ""
    echo "💡 Tip: You have the 1Password CLI installed. Run 'npm run setup'"
    echo "   to generate ${TPL_FILE} and avoid storing secrets on disk."
  fi
  exit $status
fi

# 1Password CLI + template → ephemeral .dev.vars
if $HAS_OP && $HAS_TPL; then
  echo "🔐 Injecting secrets from 1Password..."
  trap 'rm -f .dev.vars' EXIT
  op inject -i "$TPL_FILE" -o .dev.vars
  wrangler dev "$@"
  exit $?
fi

# Neither path available — help the user
echo "❌ No secrets configured. To get started:"
echo ""

if $HAS_OP; then
  echo "  You have the 1Password CLI — run setup to generate the template:"
  echo ""
  echo "    npm run setup"
  echo ""
  echo "  Then run this script again."
else
  echo "  Option A: Install the 1Password CLI and run 'npm run setup'"
  echo "            https://developer.1password.com/docs/cli/get-started/"
  echo ""
  echo "  Option B: Create .dev.vars manually:"
  echo ""
  echo "    cp .env.example .dev.vars"
  echo "    # Fill in your secret values"
fi

exit 1