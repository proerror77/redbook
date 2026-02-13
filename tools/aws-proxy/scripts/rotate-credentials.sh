#!/usr/bin/env bash
# Rotate sing-box credentials in Secrets Manager and re-bootstrap all nodes
# Usage: rotate-credentials.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Confirmation
# ============================================================
log_warn "This will rotate ALL proxy credentials and re-bootstrap nodes."
log_warn "Active client connections will be interrupted."
read -p "Type 'yes' to confirm: " confirm
if [[ "$confirm" != "yes" ]]; then
  log_info "Aborted."
  exit 0
fi

# ============================================================
# Step 1: Generate new credentials
# ============================================================
log_info "=== Step 1: Generate new credentials ==="

ss_password=$(openssl rand -base64 24 | head -c 32)
vless_uuid=$(uuidgen | tr '[:upper:]' '[:lower:]')
trojan_password=$(openssl rand -base64 24 | head -c 32)
hy2_password=$(openssl rand -base64 24 | head -c 32)
reality_short_id=$(openssl rand -hex 4)

# Generate Reality x25519 keypair
reality_private=$(openssl genpkey -algorithm X25519 2>/dev/null \
  | openssl pkey -outform DER 2>/dev/null | tail -c 32 | base64)
reality_public=$(openssl genpkey -algorithm X25519 2>/dev/null \
  | openssl pkey -pubout -outform DER 2>/dev/null | tail -c 32 | base64)

if [[ -z "$reality_private" ]]; then
  log_warn "X25519 keygen not available, using random bytes for Reality keys"
  reality_private=$(openssl rand -base64 32)
  reality_public=$(openssl rand -base64 32)
fi

# ============================================================
# Step 2: Update Secrets Manager
# ============================================================
log_info "=== Step 2: Update Secrets Manager ==="

secret_value=$(jq -n \
  --arg ss_pass "$ss_password" \
  --arg vless_id "$vless_uuid" \
  --arg reality_priv "$reality_private" \
  --arg reality_pub "$reality_public" \
  --arg reality_sid "$reality_short_id" \
  --arg trojan_pass "$trojan_password" \
  --arg hy2_pass "$hy2_password" \
  '{
    ss_password: $ss_pass,
    ss_method: "2022-blake3-aes-128-gcm",
    vless_uuid: $vless_id,
    reality_private_key: $reality_priv,
    reality_public_key: $reality_pub,
    reality_short_id: $reality_sid,
    trojan_password: $trojan_pass,
    hy2_password: $hy2_pass
  }')

aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME" \
  --secret-string "$secret_value"

log_info "Secret $SECRET_NAME updated with new credentials."

# ============================================================
# Step 3: Re-bootstrap all nodes via SSM
# ============================================================
log_info "=== Step 3: Re-bootstrap nodes ==="

BOOTSTRAP_SCRIPT="$PROJECT_ROOT/templates/ssm-bootstrap.sh"
CONFIG_TPL="$PROJECT_ROOT/templates/sing-box-server.json.tpl"

for f in "$BOOTSTRAP_SCRIPT" "$CONFIG_TPL"; do
  if [[ ! -f "$f" ]]; then
    log_error "Required file not found: $f"
    exit 1
  fi
done

FAILED=0
for i in "${!REGIONS[@]}"; do
  region="${REGIONS[$i]}"
  short="${REGION_SHORTS[$i]}"

  ec2_data=$(load_output "ec2-${short}" 2>/dev/null) || {
    log_warn "No EC2 data for $short, skipping."
    continue
  }
  instance_id=$(echo "$ec2_data" | jq -r '.instance_id')

  if [[ -z "$instance_id" || "$instance_id" == "null" ]]; then
    log_warn "No instance_id for $short, skipping."
    continue
  fi

  log_info "[$short] Re-bootstrapping $instance_id ..."

  # Upload config template
  tpl_b64=$(base64 < "$CONFIG_TPL")
  upload_cmd_id=$(aws ssm send-command \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
      \"mkdir -p /etc/sing-box\",
      \"echo '$tpl_b64' | base64 -d > /etc/sing-box/config.json.tpl\"
    ]" \
    --region "$region" \
    --comment "Upload sing-box config template (rotate)" \
    --query 'Command.CommandId' --output text)

  wait_for_resource "SSM upload ($short)" \
    "aws ssm get-command-invocation --command-id '$upload_cmd_id' --instance-id '$instance_id' --region '$region' --query 'Status' --output text 2>/dev/null | grep -q Success" \
    30 10

  # Run bootstrap script
  bootstrap_content=$(cat "$BOOTSTRAP_SCRIPT")
  boot_cmd_id=$(aws ssm send-command \
    --instance-ids "$instance_id" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[$(echo "$bootstrap_content" | jq -Rs '.')]}" \
    --timeout-seconds 600 \
    --region "$region" \
    --comment "Re-bootstrap sing-box (rotate)" \
    --query 'Command.CommandId' --output text)

  wait_for_resource "SSM bootstrap ($short)" \
    "aws ssm get-command-invocation --command-id '$boot_cmd_id' --instance-id '$instance_id' --region '$region' --query 'Status' --output text 2>/dev/null | grep -q Success" \
    30 10

  if [[ $? -eq 0 ]]; then
    log_info "[$short] Re-bootstrap complete for $instance_id"
  else
    log_error "[$short] Re-bootstrap FAILED for $instance_id"
    FAILED=1
  fi
done

if [[ "$FAILED" -eq 1 ]]; then
  log_error "Some nodes failed re-bootstrap. Check logs above."
  exit 1
fi

log_info "=== Credential rotation complete ==="
