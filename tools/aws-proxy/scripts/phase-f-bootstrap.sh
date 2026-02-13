#!/usr/bin/env bash
# Phase F: Bootstrap - Install sing-box on all nodes via SSM Run Command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

log_info "=== Phase F: Node Bootstrap ==="

BOOTSTRAP_SCRIPT="$PROJECT_ROOT/templates/ssm-bootstrap.sh"
CONFIG_TPL="$PROJECT_ROOT/templates/sing-box-server.json.tpl"

for f in "$BOOTSTRAP_SCRIPT" "$CONFIG_TPL"; do
  if [[ ! -f "$f" ]]; then
    log_error "Required file not found: $f"
    exit 1
  fi
done

# ============================================================
# Wait for SSM command to complete
# ============================================================
wait_ssm_command() {
  local region="$1" cmd_id="$2" instance_id="$3"
  local max=30 interval=10 attempt=0

  while (( attempt < max )); do
    local status
    status=$(aws ssm get-command-invocation \
      --command-id "$cmd_id" \
      --instance-id "$instance_id" \
      --region "$region" \
      --query 'Status' --output text 2>/dev/null || echo "Pending")

    case "$status" in
      Success) return 0 ;;
      Failed|TimedOut|Cancelled)
        log_error "SSM command $cmd_id failed with status: $status"
        aws ssm get-command-invocation \
          --command-id "$cmd_id" --instance-id "$instance_id" \
          --region "$region" --query 'StandardErrorContent' --output text 2>/dev/null
        return 1 ;;
    esac
    (( attempt++ ))
    sleep "$interval"
  done
  log_error "Timed out waiting for SSM command $cmd_id"
  return 1
}

# ============================================================
# Bootstrap a single node
# ============================================================
bootstrap_node() {
  local region="$1"
  local short="$2"

  local ec2_data instance_id
  ec2_data=$(load_output "ec2-${short}") || { log_error "No EC2 data for $short"; return 1; }
  instance_id=$(echo "$ec2_data" | jq -r '.instance_id')

  if [[ -z "$instance_id" || "$instance_id" == "null" ]]; then
    log_error "No instance_id for $short"
    return 1
  fi

  log_info "Bootstrapping $instance_id ($short) in $region ..."

  # Upload config template to the node
  local tpl_b64
  tpl_b64=$(base64 < "$CONFIG_TPL")

  local upload_cmd_id
  upload_cmd_id=$(aws ssm send-command \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
      \"mkdir -p /etc/sing-box\",
      \"echo '$tpl_b64' | base64 -d > /etc/sing-box/config.json.tpl\"
    ]" \
    --region "$region" \
    --comment "Upload sing-box config template" \
    --query 'Command.CommandId' --output text)

  wait_ssm_command "$region" "$upload_cmd_id" "$instance_id"
  log_info "Config template uploaded to $instance_id"

  # Run the bootstrap script
  local bootstrap_content
  bootstrap_content=$(cat "$BOOTSTRAP_SCRIPT")

  local boot_cmd_id
  boot_cmd_id=$(aws ssm send-command \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[$(echo "$bootstrap_content" | jq -Rs '.')]}" \
    --timeout-seconds 600 \
    --region "$region" \
    --comment "Bootstrap sing-box" \
    --query 'Command.CommandId' --output text)

  wait_ssm_command "$region" "$boot_cmd_id" "$instance_id"
  log_info "Bootstrap complete for $instance_id"

  # Verify sing-box is running
  local verify_cmd_id
  verify_cmd_id=$(aws ssm send-command \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters '{"commands":["systemctl is-active sing-box"]}' \
    --region "$region" \
    --query 'Command.CommandId' --output text)

  wait_ssm_command "$region" "$verify_cmd_id" "$instance_id"
  log_info "sing-box verified active on $instance_id"
}

# ============================================================
# Execute
# ============================================================
FAILED=0
for i in "${!REGIONS[@]}"; do
  region="${REGIONS[$i]}"
  short="${REGION_SHORTS[$i]}"
  if ! bootstrap_node "$region" "$short"; then
    log_error "Bootstrap FAILED for $short ($region)"
    FAILED=1
  fi
done

if [[ "$FAILED" -eq 1 ]]; then
  log_error "Some nodes failed bootstrap. Check logs above."
  exit 1
fi

log_info "=== Phase F complete ==="
