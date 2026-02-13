#!/usr/bin/env bash
# Phase E: Data Plane - Launch EC2 instances in all regions
# Idempotent: checks existing instances by Name tag before creating

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Helper: Get latest AL2023 AMI for a region
# ============================================================
get_ami_id() {
  local region="$1"
  aws ssm get-parameter \
    --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64" \
    --region "$region" \
    --query 'Parameter.Value' --output text
}

# ============================================================
# Helper: Find existing instance by Name tag
# ============================================================
find_instance_by_name() {
  local region="$1"
  local name="$2"
  aws ec2 describe-instances \
    --region "$region" \
    --filters "Name=tag:Name,Values=$name" \
              "Name=instance-state-name,Values=pending,running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null
}

# ============================================================
# Helper: Wait for SSM online
# ============================================================
wait_for_ssm() {
  local region="$1"
  local instance_id="$2"
  wait_for_resource "SSM online for $instance_id" \
    "aws ssm describe-instance-information \
      --filters Key=InstanceIds,Values=$instance_id \
      --region $region \
      --query 'InstanceInformationList[0].PingStatus' \
      --output text | grep -q Online" \
    30 10
}

# ============================================================
# Launch EC2 instance in a region
# ============================================================
launch_node() {
  local region="$1"
  local short="$2"
  local node_name
  node_name=$(get_node_name "$short" 1)

  # Idempotent check
  local existing
  existing=$(find_instance_by_name "$region" "$node_name")
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    log_info "Instance $node_name already exists: $existing, skipping."
    # Still save data in case it was lost
    local public_ip
    public_ip=$(aws ec2 describe-instances \
      --instance-ids "$existing" --region "$region" \
      --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    save_output "ec2-${short}" "{\"instance_id\":\"$existing\",\"public_ip\":\"$public_ip\",\"node_name\":\"$node_name\"}"
    return 0
  fi

  # Get AMI
  log_info "Looking up latest AL2023 AMI in $region ..."
  local ami_id
  ami_id=$(get_ami_id "$region")
  log_info "AMI: $ami_id"

  # Load VPC resources from phase-b data (stored as plain text)
  local sg_id subnet_id
  sg_id=$(load_output "sg-${short}" | tr -d '"' | tr -d '[:space:]')
  subnet_id=$(load_output "subnet-${short}" | tr -d '"' | tr -d '[:space:]')

  if [[ -z "$sg_id" || -z "$subnet_id" ]]; then
    log_error "Missing VPC data for $short. Run phase-b first."
    return 1
  fi
  log_info "Using SG=$sg_id, Subnet=$subnet_id"

  # Read user-data template
  local userdata_file="$PROJECT_ROOT/templates/user-data.sh"
  if [[ ! -f "$userdata_file" ]]; then
    log_error "User-data template not found: $userdata_file"
    return 1
  fi

  # Launch instance
  log_info "Launching $node_name in $region ..."
  local instance_id
  instance_id=$(aws ec2 run-instances \
    --region "$region" \
    --image-id "$ami_id" \
    --instance-type t3.micro \
    --iam-instance-profile Name="$INSTANCE_PROFILE" \
    --security-group-ids "$sg_id" \
    --subnet-id "$subnet_id" \
    --associate-public-ip-address \
    --user-data "file://$userdata_file" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$node_name},{Key=Project,Value=proxy}]" \
    --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
    --query 'Instances[0].InstanceId' --output text)

  log_info "Launched $node_name: $instance_id"

  # Wait for running state
  log_info "Waiting for $instance_id to reach running state ..."
  aws ec2 wait instance-running \
    --instance-ids "$instance_id" --region "$region"
  log_info "$instance_id is running."

  # Get public IP
  local public_ip
  public_ip=$(aws ec2 describe-instances \
    --instance-ids "$instance_id" --region "$region" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
  log_info "$node_name public IP: $public_ip"

  # Wait for SSM online
  wait_for_ssm "$region" "$instance_id"

  # Write to DynamoDB proxy-nodes table
  local created_at
  created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local node_id="${short}-1"

  log_info "Writing $node_id to DynamoDB $NODES_TABLE ..."
  aws dynamodb put-item \
    --table-name "$NODES_TABLE" \
    --region us-west-2 \
    --item "$(jq -n \
      --arg nid "$node_id" \
      --arg reg "$region" \
      --arg ip "$public_ip" \
      --arg iid "$instance_id" \
      --arg cat "$created_at" \
      '{
        node_id:     {S: $nid},
        region:      {S: $reg},
        public_ip:   {S: $ip},
        instance_id: {S: $iid},
        status:      {S: "active"},
        protocols: {M: {
          ss:     {M: {port: {N: "8388"},  creds_ref: {S: "proxy/sing-box-credentials"}}},
          vless:  {M: {port: {N: "443"},   creds_ref: {S: "proxy/sing-box-credentials"}}},
          trojan: {M: {port: {N: "8443"},  creds_ref: {S: "proxy/sing-box-credentials"}}},
          hy2:    {M: {port: {N: "8844"},  creds_ref: {S: "proxy/sing-box-credentials"}}}
        }},
        created_at:  {S: $cat}
      }')"

  log_info "DynamoDB: $node_id written."

  # Save instance info to data/
  save_output "ec2-${short}" "$(jq -n \
    --arg iid "$instance_id" \
    --arg ip "$public_ip" \
    --arg name "$node_name" \
    '{instance_id: $iid, public_ip: $ip, node_name: $name}')"

  log_info "$node_name deployment complete."
}

# ============================================================
# Execute: launch nodes in all regions
# ============================================================
log_info "=== Phase E: Data Plane ==="

aws_region_loop launch_node

log_info "=== Phase E complete ==="
