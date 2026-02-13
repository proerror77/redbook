#!/usr/bin/env bash
# Register a proxy node in DynamoDB proxy-nodes table
# Usage: add-node.sh <node_id> <region> <public_ip> <instance_id>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <node_id> <region> <public_ip> <instance_id>"
  echo ""
  echo "  node_id      - Unique node identifier (e.g. proxy-us-node-0)"
  echo "  region       - AWS region (e.g. us-west-2)"
  echo "  public_ip    - Node public IP address"
  echo "  instance_id  - EC2 instance ID (e.g. i-0abc123...)"
  echo ""
  echo "Example: $0 proxy-us-node-0 us-west-2 54.200.1.100 i-0abc123def"
  exit 1
fi

NODE_ID="$1"
REGION="$2"
PUBLIC_IP="$3"
INSTANCE_ID="$4"
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log_info "Registering node: $NODE_ID in $REGION"

aws dynamodb put-item \
  --table-name "$NODES_TABLE" \
  --item "$(jq -n \
    --arg nid "$NODE_ID" \
    --arg region "$REGION" \
    --arg ip "$PUBLIC_IP" \
    --arg iid "$INSTANCE_ID" \
    --arg created "$CREATED_AT" \
    '{
      node_id: { S: $nid },
      region: { S: $region },
      public_ip: { S: $ip },
      instance_id: { S: $iid },
      status: { S: "active" },
      created_at: { S: $created }
    }')"

log_info "Node registered successfully."
echo ""
echo "  Node ID:     $NODE_ID"
echo "  Region:      $REGION"
echo "  Public IP:   $PUBLIC_IP"
echo "  Instance ID: $INSTANCE_ID"
echo "  Status:      active"
echo "  Created:     $CREATED_AT"
