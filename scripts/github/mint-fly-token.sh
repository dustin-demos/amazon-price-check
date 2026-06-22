#!/bin/bash
set -euo pipefail

# Mint a fresh Fly deploy token and write it into .env without ever printing it.
# The token value goes straight from flyctl into the file; nothing hits stdout.
APP="${1:-amzn-price-check}"
ENV_FILE="$(dirname "$0")/.env"

{
  printf 'FLY_API_TOKEN='
  flyctl tokens create deploy -a "$APP" 2>/dev/null | grep -E '^(FlyV1|fm2)'
} > "$ENV_FILE"

if grep -q '^FLY_API_TOKEN=.\+' "$ENV_FILE"; then
  echo "Wrote FLY_API_TOKEN to $ENV_FILE"
else
  echo "Failed: no token written" >&2
  exit 1
fi
