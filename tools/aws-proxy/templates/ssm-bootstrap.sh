#!/usr/bin/env bash
# SSM bootstrap script: install sing-box via 233boy script, add protocols, start.
# Run via SSM Run Command after EC2 instance is ready.

LOG="/var/log/ssm-bootstrap.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== ssm-bootstrap start: $(date -u) ==="

# --- Determine region from IMDSv2 ---
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region)
echo "Region: $REGION"

# --- Install sing-box via 233boy script ---
echo "Installing sing-box via 233boy/sing-box ..."
export TERM=xterm
bash <(wget -qO- -o- https://github.com/233boy/sing-box/raw/main/install.sh) || true
echo "sing-box install script finished"

# Ensure sb is in PATH
export PATH="/usr/local/bin:/usr/bin:$PATH"
if ! command -v sb &>/dev/null; then
  echo "ERROR: sb command not found after install"
  exit 1
fi
echo "sing-box version: $(sing-box version 2>/dev/null || echo unknown)"

# --- Fetch credentials from Secrets Manager ---
echo "Fetching credentials from Secrets Manager..."
SECRET_REGION="${SECRET_REGION:-us-west-2}"
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id proxy/sing-box-credentials \
  --region "$SECRET_REGION" \
  --query SecretString --output text)

SS_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.ss_password')
VLESS_UUID=$(echo "$SECRET_JSON" | jq -r '.vless_uuid')
TROJAN_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.trojan_password')
HY2_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.hy2_password')
echo "Credentials fetched successfully"

# --- Remove default config created by installer ---
echo "Removing default config ..."
sb del -f 2>/dev/null || true

# --- Add protocols via sb command ---
echo "Adding VLESS-REALITY on port 443 ..."
sb add reality 443 "$VLESS_UUID" dl.google.com || echo "WARN: reality add returned non-zero"

echo "Adding Shadowsocks on port 8388 ..."
sb add ss 8388 "$SS_PASSWORD" 2022-blake3-aes-128-gcm || echo "WARN: ss add returned non-zero"

echo "Adding Trojan on port 8443 ..."
sb add trojan 8443 "$TROJAN_PASSWORD" || echo "WARN: trojan add returned non-zero"

echo "Adding Hysteria2 on port 8844 ..."
sb add hy 8844 "$HY2_PASSWORD" || echo "WARN: hy2 add returned non-zero"

# --- Restart to apply all configs ---
echo "Restarting sing-box ..."
sb restart || true

# --- Verify ---
sleep 2
sb status || true
sb info || true
echo "=== ssm-bootstrap complete: $(date -u) ==="
