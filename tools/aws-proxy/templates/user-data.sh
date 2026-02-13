#!/usr/bin/env bash
# EC2 user-data startup script for AL2023 proxy nodes.
# Sets hostname, ensures SSM agent, basic hardening.
set -euo pipefail

LOG="/var/log/user-data.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== user-data start: $(date -u) ==="

# --- IMDSv2: get instance metadata ---
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region)

echo "Instance: $INSTANCE_ID  Region: $REGION"

# --- Set hostname from Name tag ---
NAME_TAG=$(aws ec2 describe-tags \
  --region "$REGION" \
  --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Name" \
  --query "Tags[0].Value" --output text 2>/dev/null || echo "proxy-node")

if [[ "$NAME_TAG" != "None" && -n "$NAME_TAG" ]]; then
  hostnamectl set-hostname "$NAME_TAG"
  echo "Hostname set to: $NAME_TAG"
fi

# --- Ensure SSM agent is running (pre-installed on AL2023) ---
systemctl enable amazon-ssm-agent 2>/dev/null || true
systemctl start amazon-ssm-agent 2>/dev/null || true
echo "SSM agent status: $(systemctl is-active amazon-ssm-agent)"

# --- Basic hardening: disable SSH if present ---
if systemctl list-unit-files | grep -q sshd; then
  systemctl stop sshd 2>/dev/null || true
  systemctl disable sshd 2>/dev/null || true
  echo "SSH service disabled"
fi

echo "=== user-data complete: $(date -u) ==="
