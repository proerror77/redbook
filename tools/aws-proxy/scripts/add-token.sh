#!/usr/bin/env bash
# Add a new access token to DynamoDB proxy-tokens table
# Usage: add-token.sh <user_name> [region1,region2,...]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <user_name> [region1,region2,...]"
  echo "  user_name       - Name/label for the token owner"
  echo "  allowed_regions - Comma-separated regions (default: all)"
  echo ""
  echo "Example: $0 alice us-west-2,ap-northeast-1"
  exit 1
fi

USER_NAME="$1"

# Default: all configured regions
if [[ $# -ge 2 ]]; then
  IFS=',' read -ra ALLOWED_REGIONS <<< "$2"
else
  ALLOWED_REGIONS=("${REGIONS[@]}")
fi

# Generate UUID v4 token
if command -v uuidgen &>/dev/null; then
  TOKEN=$(uuidgen | tr '[:upper:]' '[:lower:]')
else
  TOKEN=$(python3 -c "import uuid; print(uuid.uuid4())")
fi

NOW=$(date -u +%s)

# Build regions JSON list
REGIONS_JSON=$(printf '%s\n' "${ALLOWED_REGIONS[@]}" | jq -R . | jq -s '{ L: [.[] | {S: .}] }')

# Insert into DynamoDB
log_info "Adding token for user: $USER_NAME"
aws dynamodb put-item \
  --table-name "$TOKENS_TABLE" \
  --item "$(jq -n \
    --arg token "$TOKEN" \
    --arg user "$USER_NAME" \
    --argjson created "$NOW" \
    --argjson regions "$REGIONS_JSON" \
    '{
      token: { S: $token },
      user_name: { S: $user },
      enabled: { BOOL: true },
      allowed_regions: $regions,
      created_at: { N: ($created|tostring) }
    }')"

log_info "Token created successfully."
echo ""
echo "  User:    $USER_NAME"
echo "  Token:   $TOKEN"
echo "  Regions: ${ALLOWED_REGIONS[*]}"
echo "  Created: $NOW"
