#!/usr/bin/env bash
# Teardown: Reverse-destroy all aws-proxy resources
# DANGEROUS: This will permanently delete all resources. Requires confirmation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Confirmation prompt
# ============================================================
log_warn "This will PERMANENTLY DELETE all aws-proxy resources!"
log_warn "Account: $ACCOUNT_ID"
log_warn "Regions: ${REGIONS[*]}"
read -p "Type 'yes-destroy-all' to confirm: " confirm
if [[ "$confirm" != "yes-destroy-all" ]]; then
  log_info "Aborted."
  exit 0
fi

# ============================================================
# Step 1: Terminate EC2 instances (all regions)
# ============================================================
terminate_ec2_in_region() {
  local region="$1"
  local short="$2"

  local instance_ids
  instance_ids=$(aws ec2 describe-instances \
    --region "$region" \
    --filters "Name=tag:Project,Values=proxy" \
              "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null)

  if [[ -z "$instance_ids" || "$instance_ids" == "None" ]]; then
    log_info "[$short] No EC2 instances to terminate."
    return 0
  fi

  log_info "[$short] Terminating instances: $instance_ids"
  aws ec2 terminate-instances --region "$region" --instance-ids $instance_ids >/dev/null

  log_info "[$short] Waiting for instances to terminate..."
  aws ec2 wait instance-terminated --region "$region" --instance-ids $instance_ids 2>/dev/null || true
  log_info "[$short] Instances terminated."
}

log_info "=== Step 1: Terminate EC2 instances ==="
aws_region_loop terminate_ec2_in_region

# ============================================================
# Step 2: Delete networking resources (all regions)
# ============================================================
delete_network_in_region() {
  local region="$1"
  local short="$2"

  # Delete Security Group
  local sg_name
  sg_name=$(get_sg_name "$short")
  local sg_id
  sg_id=$(aws ec2 describe-security-groups --region "$region" \
    --filters "Name=group-name,Values=$sg_name" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)
  if [[ -n "$sg_id" && "$sg_id" != "None" ]]; then
    log_info "[$short] Deleting security group: $sg_id"
    aws ec2 delete-security-group --region "$region" --group-id "$sg_id" 2>/dev/null || true
  fi

  # Find VPC
  local vpc_name
  vpc_name=$(get_vpc_name "$short")
  local vpc_id
  vpc_id=$(aws ec2 describe-vpcs --region "$region" \
    --filters "Name=tag:Name,Values=$vpc_name" \
    --query 'Vpcs[0].VpcId' --output text 2>/dev/null)

  if [[ -z "$vpc_id" || "$vpc_id" == "None" ]]; then
    log_info "[$short] No VPC found, skipping network cleanup."
    return 0
  fi

  # Disassociate and delete route table
  local rtb_name
  rtb_name=$(get_rtb_name "$short")
  local rtb_id
  rtb_id=$(aws ec2 describe-route-tables --region "$region" \
    --filters "Name=tag:Name,Values=$rtb_name" \
    --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null)
  if [[ -n "$rtb_id" && "$rtb_id" != "None" ]]; then
    # Disassociate all non-main associations
    local assoc_ids
    assoc_ids=$(aws ec2 describe-route-tables --region "$region" \
      --route-table-ids "$rtb_id" \
      --query 'RouteTables[0].Associations[?!Main].RouteTableAssociationId' --output text 2>/dev/null)
    for assoc in $assoc_ids; do
      [[ "$assoc" == "None" ]] && continue
      aws ec2 disassociate-route-table --region "$region" --association-id "$assoc" 2>/dev/null || true
    done
    log_info "[$short] Deleting route table: $rtb_id"
    aws ec2 delete-route-table --region "$region" --route-table-id "$rtb_id" 2>/dev/null || true
  fi

  # Detach and delete IGW
  local igw_name
  igw_name=$(get_igw_name "$short")
  local igw_id
  igw_id=$(aws ec2 describe-internet-gateways --region "$region" \
    --filters "Name=tag:Name,Values=$igw_name" \
    --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null)
  if [[ -n "$igw_id" && "$igw_id" != "None" ]]; then
    log_info "[$short] Detaching and deleting IGW: $igw_id"
    aws ec2 detach-internet-gateway --region "$region" --internet-gateway-id "$igw_id" --vpc-id "$vpc_id" 2>/dev/null || true
    aws ec2 delete-internet-gateway --region "$region" --internet-gateway-id "$igw_id" 2>/dev/null || true
  fi

  # Delete subnets
  local subnet_ids
  subnet_ids=$(aws ec2 describe-subnets --region "$region" \
    --filters "Name=vpc-id,Values=$vpc_id" \
    --query 'Subnets[].SubnetId' --output text 2>/dev/null)
  for sid in $subnet_ids; do
    [[ "$sid" == "None" ]] && continue
    log_info "[$short] Deleting subnet: $sid"
    aws ec2 delete-subnet --region "$region" --subnet-id "$sid" 2>/dev/null || true
  done

  # Delete VPC
  log_info "[$short] Deleting VPC: $vpc_id"
  aws ec2 delete-vpc --region "$region" --vpc-id "$vpc_id" 2>/dev/null || true
}

log_info "=== Step 2: Delete networking resources ==="
aws_region_loop delete_network_in_region

# ============================================================
# Step 3: Delete CloudFront distribution + OAC
# ============================================================
log_info "=== Step 3: Delete CloudFront distribution ==="

CF_DIST_ID=""
if [[ -f "$DATA_DIR/cloudfront_distribution_id.json" ]]; then
  CF_DIST_ID=$(cat "$DATA_DIR/cloudfront_distribution_id.json" | tr -d '"' | tr -d '[:space:]')
fi

if [[ -n "$CF_DIST_ID" ]]; then
  # Get current ETag and check if enabled
  CF_CONFIG=$(aws cloudfront get-distribution-config --id "$CF_DIST_ID" 2>/dev/null || true)
  if [[ -n "$CF_CONFIG" ]]; then
    CF_ETAG=$(echo "$CF_CONFIG" | jq -r '.ETag')
    CF_ENABLED=$(echo "$CF_CONFIG" | jq -r '.DistributionConfig.Enabled')

    if [[ "$CF_ENABLED" == "true" ]]; then
      log_info "Disabling CloudFront distribution $CF_DIST_ID ..."
      DISABLED_CONFIG=$(echo "$CF_CONFIG" | jq '.DistributionConfig.Enabled = false | .DistributionConfig')
      aws cloudfront update-distribution \
        --id "$CF_DIST_ID" \
        --if-match "$CF_ETAG" \
        --distribution-config "$DISABLED_CONFIG" >/dev/null
      log_info "Waiting for distribution to be disabled (this may take several minutes)..."
      aws cloudfront wait distribution-deployed --id "$CF_DIST_ID" 2>/dev/null || true
      # Re-fetch ETag after update
      CF_ETAG=$(aws cloudfront get-distribution-config --id "$CF_DIST_ID" \
        --query 'ETag' --output text)
    fi

    log_info "Deleting CloudFront distribution $CF_DIST_ID ..."
    aws cloudfront delete-distribution --id "$CF_DIST_ID" --if-match "$CF_ETAG" 2>/dev/null || true
  fi
else
  log_info "No CloudFront distribution ID found, skipping."
fi

# Delete OAC
OAC_ID=""
if [[ -f "$DATA_DIR/cloudfront_oac_id.json" ]]; then
  OAC_ID=$(cat "$DATA_DIR/cloudfront_oac_id.json" | tr -d '"' | tr -d '[:space:]')
fi
if [[ -n "$OAC_ID" ]]; then
  OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" \
    --query 'ETag' --output text 2>/dev/null || true)
  if [[ -n "$OAC_ETAG" ]]; then
    log_info "Deleting OAC: $OAC_ID"
    aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG" 2>/dev/null || true
  fi
else
  log_info "No OAC ID found, skipping."
fi

# ============================================================
# Step 4: Empty and delete S3 bucket
# ============================================================
log_info "=== Step 4: Delete S3 bucket ==="

S3_BUCKET="${S3_BUCKET_PREFIX}-${ACCOUNT_ID}"
if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
  log_info "Emptying S3 bucket: $S3_BUCKET"
  aws s3 rm "s3://${S3_BUCKET}" --recursive
  log_info "Deleting S3 bucket: $S3_BUCKET"
  aws s3api delete-bucket --bucket "$S3_BUCKET"
else
  log_info "S3 bucket $S3_BUCKET not found, skipping."
fi

# ============================================================
# Step 5: Delete API Gateway
# ============================================================
log_info "=== Step 5: Delete API Gateway ==="

API_ID=""
if [[ -f "$DATA_DIR/api_gateway_id.json" ]]; then
  API_ID=$(cat "$DATA_DIR/api_gateway_id.json" | tr -d '"' | tr -d '[:space:]')
fi
if [[ -n "$API_ID" ]]; then
  log_info "Deleting API Gateway: $API_ID"
  aws apigatewayv2 delete-api --api-id "$API_ID" 2>/dev/null || true
else
  log_info "No API Gateway ID found, skipping."
fi

# ============================================================
# Step 6: Delete Lambda function
# ============================================================
log_info "=== Step 6: Delete Lambda function ==="

if aws lambda get-function --function-name "$LAMBDA_NAME" &>/dev/null; then
  log_info "Deleting Lambda function: $LAMBDA_NAME"
  aws lambda delete-function --function-name "$LAMBDA_NAME"
else
  log_info "Lambda function $LAMBDA_NAME not found, skipping."
fi

# ============================================================
# Step 7: Delete DynamoDB tables
# ============================================================
log_info "=== Step 7: Delete DynamoDB tables ==="

for table in "$TOKENS_TABLE" "$NODES_TABLE"; do
  if aws dynamodb describe-table --table-name "$table" &>/dev/null; then
    log_info "Deleting DynamoDB table: $table"
    aws dynamodb delete-table --table-name "$table" >/dev/null
    aws dynamodb wait table-not-exists --table-name "$table" 2>/dev/null || true
  else
    log_info "DynamoDB table $table not found, skipping."
  fi
done

# ============================================================
# Step 8: Delete Secrets Manager secret
# ============================================================
log_info "=== Step 8: Delete Secrets Manager secret ==="

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &>/dev/null; then
  log_info "Deleting secret: $SECRET_NAME (force, no recovery)"
  aws secretsmanager delete-secret \
    --secret-id "$SECRET_NAME" \
    --force-delete-without-recovery
else
  log_info "Secret $SECRET_NAME not found, skipping."
fi

# ============================================================
# Step 9: Delete Instance Profile
# ============================================================
log_info "=== Step 9: Delete Instance Profile ==="

if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE" &>/dev/null; then
  log_info "Removing role from instance profile: $INSTANCE_PROFILE"
  aws iam remove-role-from-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE" \
    --role-name "$EC2_ROLE" 2>/dev/null || true
  log_info "Deleting instance profile: $INSTANCE_PROFILE"
  aws iam delete-instance-profile --instance-profile-name "$INSTANCE_PROFILE"
else
  log_info "Instance profile $INSTANCE_PROFILE not found, skipping."
fi

# ============================================================
# Step 10: Detach policies and delete IAM roles
# ============================================================
log_info "=== Step 10: Delete IAM roles ==="

delete_iam_role() {
  local role_name="$1"

  if ! aws iam get-role --role-name "$role_name" &>/dev/null; then
    log_info "IAM role $role_name not found, skipping."
    return 0
  fi

  # Detach managed policies
  local policies
  policies=$(aws iam list-attached-role-policies --role-name "$role_name" \
    --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
  for arn in $policies; do
    [[ "$arn" == "None" ]] && continue
    log_info "Detaching policy $arn from $role_name"
    aws iam detach-role-policy --role-name "$role_name" --policy-arn "$arn"
  done

  # Delete inline policies
  local inline
  inline=$(aws iam list-role-policies --role-name "$role_name" \
    --query 'PolicyNames[]' --output text 2>/dev/null)
  for pname in $inline; do
    [[ "$pname" == "None" ]] && continue
    log_info "Deleting inline policy $pname from $role_name"
    aws iam delete-role-policy --role-name "$role_name" --policy-name "$pname"
  done

  log_info "Deleting IAM role: $role_name"
  aws iam delete-role --role-name "$role_name"
}

delete_iam_role "$EC2_ROLE"
delete_iam_role "$LAMBDA_ROLE"

# ============================================================
# Step 11: Delete Budget
# ============================================================
log_info "=== Step 11: Delete Budget ==="

if aws budgets describe-budget --account-id "$ACCOUNT_ID" \
  --budget-name "proxy-monthly-budget" &>/dev/null; then
  log_info "Deleting budget: proxy-monthly-budget"
  aws budgets delete-budget --account-id "$ACCOUNT_ID" \
    --budget-name "proxy-monthly-budget"
else
  log_info "Budget proxy-monthly-budget not found, skipping."
fi

# ============================================================
# Step 12: Clean data directory
# ============================================================
log_info "=== Step 12: Clean local data ==="

if [[ -d "$DATA_DIR" ]]; then
  log_info "Removing data directory: $DATA_DIR"
  rm -rf "$DATA_DIR"
  mkdir -p "$DATA_DIR"
fi

log_info "=== Teardown complete ==="
