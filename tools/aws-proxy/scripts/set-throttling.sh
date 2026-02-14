#!/usr/bin/env bash
# Set API Gateway throttling on the proxy subscription API.
# Default: 10 req/s burst, 5 req/s sustained rate.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

API_ID=$(load_output "api-gateway-id" | tr -d '"' | tr -d '[:space:]')

if [[ -z "$API_ID" ]]; then
  log_error "No API Gateway ID found in data/api-gateway-id.json"
  exit 1
fi

BURST="${1:-10}"
RATE="${2:-5}"

log_info "Setting throttling on API $API_ID: burst=$BURST, rate=$RATE"

aws apigatewayv2 update-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --region us-west-2 \
  --default-route-settings "ThrottlingBurstLimit=$BURST,ThrottlingRateLimit=$RATE"

log_info "Throttling configured successfully."
log_info "Verify: aws apigatewayv2 get-stage --api-id $API_ID --stage-name '\$default' --region us-west-2 --query 'DefaultRouteSettings'"
