#!/bin/bash
set -euo pipefail

# Push GitHub Actions secrets from the .env next to this script.
# Values are read literally (not sourced) so tokens with , = etc. survive,
# and piped via stdin so they never appear in output.
ENV_FILE="$(dirname "$0")/.env"

set_secret() {
  local name="$1" value
  value="$(grep -E "^${name}=" "$ENV_FILE" | head -1 | cut -d= -f2-)"
  printf '%s' "$value" | gh secret set "$name"
}

set_secret FLY_API_TOKEN

echo "Done!"
