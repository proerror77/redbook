#!/usr/bin/env bash
# Remove WARP WireGuard outbound from sing-box config on all nodes.
# Uses SSM (SSH is broken on these instances).
#
# What it does:
#   1. Removes wireguard outbound from sing-box config
#   2. Removes route rules that reference "warp" outbound
#   3. Replaces DNS servers referencing "warp" detour with Google DNS
#   4. Removes systemd override for ENABLE_DEPRECATED_WIREGUARD_OUTBOUND
#   5. Restarts sing-box

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

# Build the removal script as a single heredoc (avoids SSM quoting hell)
REMOVE_SCRIPT='#!/bin/bash
set -e
CONFIG=/etc/sing-box/config.json
cp $CONFIG ${CONFIG}.bak.$(date +%s)

# 1. Remove wireguard outbounds
jq "del(.outbounds[] | select(.type == \"wireguard\"))" $CONFIG > /tmp/sb-step1.json

# 2. Remove route rules with outbound "warp"
jq "if .route.rules then .route.rules = [.route.rules[] | select(.outbound == \"warp\" | not)] else . end" /tmp/sb-step1.json > /tmp/sb-step2.json

# 3. Replace DNS servers that use warp detour with Google DNS
jq ".dns.servers = [.dns.servers[] | if .detour == \"warp\" then {tag: \"google\", address: \"tls://8.8.8.8\"} else . end]" /tmp/sb-step2.json > /tmp/sb-step3.json

mv /tmp/sb-step3.json $CONFIG
rm -f /tmp/sb-step1.json /tmp/sb-step2.json

# 4. Remove systemd override
if [ -f /etc/systemd/system/sing-box.service.d/override.conf ]; then
  rm -f /etc/systemd/system/sing-box.service.d/override.conf
  rmdir /etc/systemd/system/sing-box.service.d 2>/dev/null || true
  systemctl daemon-reload
fi

# 5. Restart and verify
systemctl restart sing-box
sleep 2
systemctl is-active sing-box
echo WARP_REMOVED_OK'

# ============================================================
# SSM command to remove WARP from a single node
# ============================================================
remove_warp_on_node() {
  local region="$1"
  local short="$2"

  local ec2_data
  ec2_data=$(load_output "ec2-${short}")
  local instance_id
  instance_id=$(echo "$ec2_data" | jq -r '.instance_id')

  if [[ -z "$instance_id" || "$instance_id" == "null" ]]; then
    log_error "No instance_id for $short"
    return 1
  fi

  log_info "Removing WARP from $short ($instance_id) in $region ..."

  local cmd_id
  cmd_id=$(aws ssm send-command \
    --region "$region" \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[$(echo "$REMOVE_SCRIPT" | jq -Rs .)]}" \
    --query 'Command.CommandId' --output text)

  log_info "SSM command sent: $cmd_id"

  # Wait for command to complete
  log_info "Waiting for SSM command to complete ..."
  aws ssm wait command-executed \
    --command-id "$cmd_id" \
    --instance-id "$instance_id" \
    --region "$region" 2>/dev/null || true

  # Get output
  local output
  output=$(aws ssm get-command-invocation \
    --command-id "$cmd_id" \
    --instance-id "$instance_id" \
    --region "$region" \
    --query '{Status:Status, Output:StandardOutputContent, Error:StandardErrorContent}' \
    --output json 2>/dev/null)

  local status
  status=$(echo "$output" | jq -r '.Status')
  if [[ "$status" == "Success" ]]; then
    log_info "[$short] WARP removed successfully."
    echo "$output" | jq -r '.Output'
  else
    log_error "[$short] SSM command failed (status=$status):"
    echo "$output" | jq -r '.Error'
    return 1
  fi
}

# ============================================================
# Verify: check outbound types and DNS on a node
# ============================================================
verify_node() {
  local region="$1"
  local short="$2"

  local ec2_data
  ec2_data=$(load_output "ec2-${short}")
  local instance_id
  instance_id=$(echo "$ec2_data" | jq -r '.instance_id')

  log_info "Verifying $short ($instance_id) ..."

  local cmd_id
  cmd_id=$(aws ssm send-command \
    --region "$region" \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters '{"commands":["echo outbounds: $(cat /etc/sing-box/config.json | jq -c \"[.outbounds[] | .type]\")","echo dns: $(cat /etc/sing-box/config.json | jq -c \"[.dns.servers[] | .tag]\")","echo status: $(systemctl is-active sing-box)"]}' \
    --query 'Command.CommandId' --output text)

  aws ssm wait command-executed \
    --command-id "$cmd_id" \
    --instance-id "$instance_id" \
    --region "$region" 2>/dev/null || true

  local output
  output=$(aws ssm get-command-invocation \
    --command-id "$cmd_id" \
    --instance-id "$instance_id" \
    --region "$region" \
    --query 'StandardOutputContent' --output text 2>/dev/null)

  echo "  $output"

  if echo "$output" | grep -q "wireguard"; then
    log_error "[$short] wireguard outbound still present!"
    return 1
  fi
  if echo "$output" | grep -q "cf-warp"; then
    log_error "[$short] cf-warp DNS still present!"
    return 1
  fi
  log_info "[$short] Verified: clean."
}

# ============================================================
# Main
# ============================================================
log_info "=== Removing WARP from all nodes ==="

aws_region_loop remove_warp_on_node

log_info ""
log_info "=== Verifying all nodes ==="

aws_region_loop verify_node

log_info "=== WARP removal complete ==="
