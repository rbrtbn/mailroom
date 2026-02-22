#!/usr/bin/env bash
set -euo pipefail

HAS_OP=false
HAS_TPL=false
HAS_DEV_VARS=false

command -v op &>/dev/null && HAS_OP=true
[[ -f .env.1password.tpl ]] && HAS_TPL=true
[[ -f .dev.vars ]] && HAS_DEV_VARS=true

# If .dev.vars exists, use it as-is
if $HAS_DEV_VARS; then
  echo "📄 Using existing .dev.vars"
  if $HAS_OP && ! $HAS_TPL; then
    echo ""
    echo "💡 Tip: You have the 1Password CLI installed. Create .env.1password.tpl"
    echo "   to avoid storing secrets on disk. See .env.example for the required keys."
  fi
  exec wrangler dev "$@"
fi

# 1Password CLI + template → ephemeral .dev.vars
if $HAS_OP && $HAS_TPL; then
  echo "🔐 Injecting secrets from 1Password..."
  trap 'rm -f .dev.vars' EXIT
  op inject -i .env.1password.tpl -o .dev.vars
  wrangler dev "$@"
  exit $?
fi

# Neither path available — help the user
echo "❌ No secrets configured. To get started:"
echo ""

if $HAS_OP; then
  echo "  You have the 1Password CLI installed — create a template:"
  echo ""
  echo "    cp .env.example .env.1password.tpl"
  echo "    # Replace values with op:// secret references, e.g.:"
  echo "    # API_KEY=op://Your Vault/your-item/API_KEY"
  echo ""
  echo "  Then run this script again."
else
  echo "  Option A: Install the 1Password CLI and create .env.1password.tpl"
  echo "            https://developer.1password.com/docs/cli/get-started/"
  echo ""
  echo "  Option B: Create .dev.vars manually:"
  echo ""
  echo "    cp .env.example .dev.vars"
  echo "    # Fill in your secret values"
fi

exit 1