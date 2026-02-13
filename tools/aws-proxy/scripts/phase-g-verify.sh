#!/usr/bin/env bash
# Phase G: End-to-end verification of all infrastructure components

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

log_info "=== Phase G: Verification ==="

PASS=0
FAIL=0
RESULTS=()

check() {
  local name="$1"
  shift
  log_info "Test: $name"
  if "$@"; then
    RESULTS+=("PASS: $name")
    (( PASS++ ))
  else
    RESULTS+=("FAIL: $name")
    (( FAIL++ ))
  fi
}

# Load saved infrastructure data
CF_DOMAIN=$(load_output "cf-domain" 2>/dev/null | jq -r '.domain // empty' || true)
APIGW_URL=$(load_output "apigw-url" 2>/dev/null | jq -r '.url // empty' || true)
TOKEN=$(load_output "initial-token" 2>/dev/null | jq -r '.token // empty' || true)

if [[ -z "$CF_DOMAIN" ]]; then
  log_warn "CloudFront domain not found in data/. Set CF_DOMAIN env var."
  CF_DOMAIN="${CF_DOMAIN:-}"
fi
if [[ -z "$APIGW_URL" ]]; then
  log_warn "API Gateway URL not found in data/. Set APIGW_URL env var."
  APIGW_URL="${APIGW_URL:-}"
fi
if [[ -z "$TOKEN" ]]; then
  log_warn "Token not found in data/. Set TOKEN env var."
  TOKEN="${TOKEN:-}"
fi

# ============================================================
# Test 1: CloudFront base.yaml
# ============================================================
test_cf_base() {
  [[ -z "$CF_DOMAIN" ]] && { log_warn "Skipping: CF_DOMAIN not set"; return 1; }
  local code
  code=$(curl -sf -o /dev/null -w '%{http_code}' "https://${CF_DOMAIN}/base.yaml")
  [[ "$code" == "200" ]]
}

# ============================================================
# Test 2: CloudFront rule-providers
# ============================================================
test_cf_rules() {
  [[ -z "$CF_DOMAIN" ]] && { log_warn "Skipping: CF_DOMAIN not set"; return 1; }
  local all_ok=true
  for rule in geosite-cn geosite-category-ads geoip-cn; do
    local code
    code=$(curl -sf -o /dev/null -w '%{http_code}' "https://${CF_DOMAIN}/rules/${rule}.yaml")
    if [[ "$code" != "200" ]]; then
      log_error "Rule $rule returned $code"
      all_ok=false
    fi
  done
  $all_ok
}

# ============================================================
# Test 3: API Gateway subscription endpoint
# ============================================================
test_apigw() {
  [[ -z "$APIGW_URL" || -z "$TOKEN" ]] && { log_warn "Skipping: APIGW_URL or TOKEN not set"; return 1; }
  local body
  body=$(curl -sf "${APIGW_URL}/mihomo/proxies/${TOKEN}")
  echo "$body" | grep -q "proxies"
}

# ============================================================
# Test 4: SSM connectivity to all regions
# ============================================================
test_ssm() {
  local all_ok=true
  for i in "${!REGIONS[@]}"; do
    local region="${REGIONS[$i]}" short="${REGION_SHORTS[$i]}"
    local ec2_data instance_id
    ec2_data=$(load_output "ec2-${short}" 2>/dev/null || true)
    instance_id=$(echo "$ec2_data" | jq -r '.instance_id // empty' 2>/dev/null || true)
    if [[ -z "$instance_id" ]]; then
      log_warn "No instance data for $short, skipping"
      all_ok=false
      continue
    fi
    local cmd_id
    cmd_id=$(aws ssm send-command \
      --instance-ids "$instance_id" \
      --document-name "AWS-RunShellScript" \
      --parameters '{"commands":["echo ok"]}' \
      --region "$region" \
      --query 'Command.CommandId' --output text 2>/dev/null)
    if [[ -z "$cmd_id" ]]; then
      log_error "SSM send-command failed for $short"
      all_ok=false
      continue
    fi
    sleep 5
    local status
    status=$(aws ssm get-command-invocation \
      --command-id "$cmd_id" --instance-id "$instance_id" \
      --region "$region" --query 'Status' --output text 2>/dev/null || echo "Failed")
    if [[ "$status" != "Success" ]]; then
      log_error "SSM command failed for $short: $status"
      all_ok=false
    fi
  done
  $all_ok
}

# ============================================================
# Test 5: Proxy provider YAML format
# ============================================================
test_provider_format() {
  [[ -z "$APIGW_URL" || -z "$TOKEN" ]] && { log_warn "Skipping"; return 1; }
  local body
  body=$(curl -sf "${APIGW_URL}/mihomo/proxies/${TOKEN}")
  echo "$body" | grep -q "server:" && echo "$body" | grep -q "type:"
}

# ============================================================
# Run all tests
# ============================================================
check "CloudFront base.yaml accessible" test_cf_base
check "CloudFront rule-providers accessible" test_cf_rules
check "API Gateway subscription endpoint" test_apigw
check "SSM connectivity to all regions" test_ssm
check "Proxy provider YAML format valid" test_provider_format

# ============================================================
# Summary
# ============================================================
echo ""
log_info "========== Verification Summary =========="
for r in "${RESULTS[@]}"; do
  if [[ "$r" == PASS* ]]; then
    printf '\033[0;32m  %s\033[0m\n' "$r"
  else
    printf '\033[0;31m  %s\033[0m\n' "$r"
  fi
done
echo ""
log_info "Total: $PASS passed, $FAIL failed"

if [[ "$FAIL" -gt 0 ]]; then
  log_error "Some tests failed!"
  exit 1
fi

log_info "=== Phase G complete: All tests passed ==="
