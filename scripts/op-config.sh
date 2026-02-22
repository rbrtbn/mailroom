#!/usr/bin/env bash
# Shared config for 1Password integration
# Sourced by setup.sh, dev.sh, secrets.sh

OP_VAULT="${OP_VAULT:-Dev}"
OP_DEV_ITEM="${OP_DEV_ITEM:-mailroom - dev}"
OP_PROD_ITEM="${OP_PROD_ITEM:-mailroom - production}"

ENV_EXAMPLE=".env.example"
TPL_FILE=".env.1password.tpl"

HAS_OP=false
HAS_TPL=false
command -v op &>/dev/null && HAS_OP=true
[[ -f "$TPL_FILE" ]] && HAS_TPL=true

# Get concealed field names from a 1Password item
# Usage: op_field_names "item name" "vault"
op_field_names() {
  local item="$1"
  local vault="${2:-$OP_VAULT}"
  op item get "$item" --vault "$vault" --format json 2>/dev/null \
    | jq -r '.fields[] | select(.type == "CONCEALED" and .label != "" and .label != "credential") | .label'
}

# Get secret names from .env.example (lines that aren't comments/blank)
env_example_keys() {
  if [[ ! -f "$ENV_EXAMPLE" ]]; then
    echo ""
    return
  fi
  grep -v '^\s*#' "$ENV_EXAMPLE" | grep -v '^\s*$' | cut -d= -f1
}