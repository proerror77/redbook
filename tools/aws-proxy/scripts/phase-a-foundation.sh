#!/usr/bin/env bash
# Phase A: Foundation - IAM roles, instance profile, budget, secrets
# Idempotent: checks if resources exist before creating

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Step 1: Enable opt-in regions
# ============================================================
enable_opt_in_regions() {
  for region in "${OPT_IN_REGIONS[@]}"; do
    local status
    status=$(aws account get-region-opt-status --region-name "$region" \
      --query 'RegionOptStatus' --output text 2>/dev/null || echo "UNKNOWN")

    if [[ "$status" == "ENABLED" || "$status" == "ENABLED_BY_DEFAULT" ]]; then
      log_info "Region $region already enabled (status: $status)"
    elif [[ "$status" == "ENABLING" ]]; then
      log_info "Region $region is currently enabling, please wait..."
    else
      log_info "Enabling opt-in region: $region ..."
      aws account enable-region --region-name "$region"
      log_info "Region $region enable requested. May take a few minutes."
    fi
  done
}

# ============================================================
# Step 2: Create EC2 IAM Role
# ============================================================
create_ec2_role() {
  if aws iam get-role --role-name "$EC2_ROLE" &>/dev/null; then
    log_info "IAM role $EC2_ROLE already exists, skipping."
    return 0
  fi

  log_info "Creating IAM role: $EC2_ROLE ..."

  local trust_policy='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

  aws iam create-role \
    --role-name "$EC2_ROLE" \
    --assume-role-policy-document "$trust_policy" \
    --tags Key=Project,Value=proxy

  # SSM managed instance core
  aws iam attach-role-policy \
    --role-name "$EC2_ROLE" \
    --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  log_info "Attached AmazonSSMManagedInstanceCore to $EC2_ROLE"

  # Inline policy: S3 read + SecretsManager read
  local inline_policy
  inline_policy=$(jq -n \
    --arg bucket "${S3_BUCKET_PREFIX}-${ACCOUNT_ID}" \
    --arg secret_arn "arn:aws:secretsmanager:*:${ACCOUNT_ID}:secret:${SECRET_NAME}*" \
    '{
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:ListBucket"],
          Resource: [
            "arn:aws:s3:::\($bucket)",
            "arn:aws:s3:::\($bucket)/*"
          ]
        },
        {
          Effect: "Allow",
          Action: ["secretsmanager:GetSecretValue"],
          Resource: $secret_arn
        }
      ]
    }')

  aws iam put-role-policy \
    --role-name "$EC2_ROLE" \
    --policy-name "proxy-node-access" \
    --policy-document "$inline_policy"
  log_info "Attached inline policy proxy-node-access to $EC2_ROLE"
}

# ============================================================
# Step 3: Create Lambda IAM Role
# ============================================================
create_lambda_role() {
  if aws iam get-role --role-name "$LAMBDA_ROLE" &>/dev/null; then
    log_info "IAM role $LAMBDA_ROLE already exists, skipping."
    return 0
  fi

  log_info "Creating IAM role: $LAMBDA_ROLE ..."

  local trust_policy='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

  aws iam create-role \
    --role-name "$LAMBDA_ROLE" \
    --assume-role-policy-document "$trust_policy" \
    --tags Key=Project,Value=proxy

  # CloudWatch Logs
  aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  log_info "Attached AWSLambdaBasicExecutionRole to $LAMBDA_ROLE"

  # Inline policy: DynamoDB read
  local inline_policy
  inline_policy=$(jq -n \
    --arg tokens_arn "arn:aws:dynamodb:*:${ACCOUNT_ID}:table/${TOKENS_TABLE}" \
    --arg nodes_arn "arn:aws:dynamodb:*:${ACCOUNT_ID}:table/${NODES_TABLE}" \
    '{
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "dynamodb:GetItem",
            "dynamodb:Query",
            "dynamodb:Scan"
          ],
          Resource: [$tokens_arn, $nodes_arn]
        }
      ]
    }')

  aws iam put-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-name "proxy-lambda-dynamo-read" \
    --policy-document "$inline_policy"
  log_info "Attached inline policy proxy-lambda-dynamo-read to $LAMBDA_ROLE"
}

# ============================================================
# Step 4: Create Instance Profile
# ============================================================
create_instance_profile() {
  if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE" &>/dev/null; then
    log_info "Instance profile $INSTANCE_PROFILE already exists, skipping."
    return 0
  fi

  log_info "Creating instance profile: $INSTANCE_PROFILE ..."
  aws iam create-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE" \
    --tags Key=Project,Value=proxy

  aws iam add-role-to-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE" \
    --role-name "$EC2_ROLE"
  log_info "Added $EC2_ROLE to instance profile $INSTANCE_PROFILE"

  # Instance profile needs a few seconds to propagate
  log_info "Waiting 10s for instance profile propagation..."
  sleep 10
}

# ============================================================
# Step 5: Create Budget Alarm
# ============================================================
create_budget() {
  local budget_name="proxy-monthly-budget"

  if aws budgets describe-budget --account-id "$ACCOUNT_ID" \
    --budget-name "$budget_name" &>/dev/null; then
    log_info "Budget $budget_name already exists, skipping."
    return 0
  fi

  log_info "Creating monthly budget alarm: $budget_name ..."

  local amount="${BUDGET_AMOUNT:-50}"
  local email="${BUDGET_EMAIL:-}"

  local budget_json
  budget_json=$(jq -n --arg amt "$amount" '{
    BudgetName: "proxy-monthly-budget",
    BudgetLimit: { Amount: $amt, Unit: "USD" },
    TimeUnit: "MONTHLY",
    BudgetType: "COST"
  }')

  if [[ -n "$email" ]]; then
    local notif_json
    notif_json=$(jq -n --arg addr "$email" '[
      {
        Notification: {
          NotificationType: "ACTUAL",
          ComparisonOperator: "GREATER_THAN",
          Threshold: 80,
          ThresholdType: "PERCENTAGE"
        },
        Subscribers: [{ SubscriptionType: "EMAIL", Address: $addr }]
      },
      {
        Notification: {
          NotificationType: "ACTUAL",
          ComparisonOperator: "GREATER_THAN",
          Threshold: 100,
          ThresholdType: "PERCENTAGE"
        },
        Subscribers: [{ SubscriptionType: "EMAIL", Address: $addr }]
      }
    ]')

    aws budgets create-budget \
      --account-id "$ACCOUNT_ID" \
      --budget "$budget_json" \
      --notifications-with-subscribers "$notif_json"
  else
    log_warn "BUDGET_EMAIL not set, creating budget without notifications."
    aws budgets create-budget \
      --account-id "$ACCOUNT_ID" \
      --budget "$budget_json"
  fi
  log_info "Budget $budget_name created (limit: \$${amount}/month)."
}

# ============================================================
# Step 6: Create Secrets Manager Secret
# ============================================================
create_secrets() {
  if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &>/dev/null; then
    log_info "Secret $SECRET_NAME already exists, skipping."
    return 0
  fi

  log_info "Creating secret: $SECRET_NAME ..."

  # Generate credentials (32-char passwords)
  local ss_password vless_uuid trojan_password hy2_password reality_short_id
  ss_password=$(openssl rand -base64 24 | head -c 32)
  vless_uuid=$(uuidgen | tr '[:upper:]' '[:lower:]')
  trojan_password=$(openssl rand -base64 24 | head -c 32)
  hy2_password=$(openssl rand -base64 24 | head -c 32)
  reality_short_id=$(openssl rand -hex 4)

  # Generate Reality x25519 keypair using openssl
  local reality_private reality_public
  reality_private=$(openssl genpkey -algorithm X25519 2>/dev/null \
    | openssl pkey -outform DER 2>/dev/null | tail -c 32 | base64)
  reality_public=$(openssl genpkey -algorithm X25519 2>/dev/null \
    | openssl pkey -pubout -outform DER 2>/dev/null | tail -c 32 | base64)

  # If openssl X25519 not available, fall back to random
  if [[ -z "$reality_private" ]]; then
    log_warn "X25519 keygen not available, using random bytes for Reality keys"
    reality_private=$(openssl rand -base64 32)
    reality_public=$(openssl rand -base64 32)
  fi

  local secret_value
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

  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "sing-box proxy node credentials" \
    --secret-string "$secret_value" \
    --tags Key=Project,Value=proxy

  log_info "Secret $SECRET_NAME created with auto-generated credentials."
}

# ============================================================
# Execute all steps
# ============================================================
log_info "=== Phase A: Foundation ==="

enable_opt_in_regions
create_ec2_role
create_lambda_role
create_instance_profile
create_budget
create_secrets

log_info "=== Phase A complete ==="
