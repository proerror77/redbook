#!/usr/bin/env bash
# Rotate IP for a proxy node by stop/start cycle.
# Usage: rotate-ip.sh <node_id>  (e.g., us-1, jp-1, tw-1)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <node_id>  (e.g., us-1, jp-1, tw-1)"
  exit 1
fi

NODE_ID="$1"
SHORT="${NODE_ID%-*}"  # us, jp, tw

# Resolve region from short name
REGION=""
for i in "${!REGION_SHORTS[@]}"; do
  if [[ "${REGION_SHORTS[$i]}" == "$SHORT" ]]; then
    REGION="${REGIONS[$i]}"
    break
  fi
done

if [[ -z "$REGION" ]]; then
  log_error "Unknown region short name: $SHORT"
  exit 1
fi

# Load instance data
EC2_DATA=$(load_output "ec2-${SHORT}")
INSTANCE_ID=$(echo "$EC2_DATA" | jq -r '.instance_id')
OLD_IP=$(echo "$EC2_DATA" | jq -r '.public_ip')

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "null" ]]; then
  log_error "No instance_id found for $SHORT"
  exit 1
fi

log_info "Node: $NODE_ID"
log_info "Region: $REGION"
log_info "Instance: $INSTANCE_ID"
log_info "Current IP: $OLD_IP"

# Step 1: Stop instance
log_info "Stopping instance $INSTANCE_ID ..."
aws ec2 stop-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" > /dev/null

log_info "Waiting for instance to stop ..."
aws ec2 wait instance-stopped \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION"
log_info "Instance stopped."

# Step 2: Start instance (gets new public IP)
log_info "Starting instance $INSTANCE_ID ..."
aws ec2 start-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" > /dev/null

log_info "Waiting for instance to run ..."
aws ec2 wait instance-running \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION"

# Step 3: Get new IP
NEW_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

log_info "New IP: $NEW_IP (was: $OLD_IP)"

if [[ "$NEW_IP" == "$OLD_IP" ]]; then
  log_warn "IP did not change. May need to release/allocate EIP or retry."
fi

# Step 4: Update DynamoDB
log_info "Updating DynamoDB $NODES_TABLE ..."
aws dynamodb update-item \
  --table-name "$NODES_TABLE" \
  --region us-west-2 \
  --key "{\"node_id\": {\"S\": \"$NODE_ID\"}}" \
  --update-expression "SET public_ip = :ip, health_status = :s, consecutive_failures = :zero" \
  --expression-attribute-values "{
    \":ip\": {\"S\": \"$NEW_IP\"},
    \":s\": {\"S\": \"healthy\"},
    \":zero\": {\"N\": \"0\"}
  }"
log_info "DynamoDB updated."

# Step 5: Update local data file
NODE_NAME=$(echo "$EC2_DATA" | jq -r '.node_name')
save_output "ec2-${SHORT}" "$(jq -n \
  --arg iid "$INSTANCE_ID" \
  --arg ip "$NEW_IP" \
  --arg name "$NODE_NAME" \
  '{instance_id: $iid, public_ip: $ip, node_name: $name}')"
log_info "Local data/ec2-${SHORT}.json updated."

# Step 6: Wait for SSM and verify sing-box
log_info "Waiting for SSM to come online ..."
wait_for_resource "SSM online for $INSTANCE_ID" \
  "aws ssm describe-instance-information \
    --filters Key=InstanceIds,Values=$INSTANCE_ID \
    --region $REGION \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text | grep -q Online" \
  30 10

log_info "Checking sing-box status via SSM ..."
CMD_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters commands='["systemctl is-active sing-box"]' \
  --query 'Command.CommandId' --output text)

aws ssm wait command-executed \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$REGION" 2>/dev/null || true

SB_STATUS=$(aws ssm get-command-invocation \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'StandardOutputContent' --output text 2>/dev/null | tr -d '[:space:]')

if [[ "$SB_STATUS" == "active" ]]; then
  log_info "sing-box is running on new IP $NEW_IP"
else
  log_warn "sing-box status: $SB_STATUS — may need manual check"
fi

log_info "=== IP rotation complete for $NODE_ID ==="
log_info "Old: $OLD_IP → New: $NEW_IP"
