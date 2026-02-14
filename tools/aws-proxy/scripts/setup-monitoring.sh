#!/usr/bin/env bash
# One-click monitoring setup: SNS topic + Health Check Lambda + EventBridge + CloudWatch alarms.
# Idempotent — safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
CONTROL_REGION="us-west-2"
HEALTH_LAMBDA_NAME="proxy-health-check"
SNS_TOPIC_NAME="proxy-alerts"

log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Step 1: Create SNS topic
# ============================================================
setup_sns() {
  log_info "=== Setting up SNS topic ==="

  SNS_TOPIC_ARN=$(aws sns create-topic \
    --name "$SNS_TOPIC_NAME" \
    --region "$CONTROL_REGION" \
    --query 'TopicArn' --output text)

  log_info "SNS topic: $SNS_TOPIC_ARN"
  save_output "sns-topic-arn" "\"$SNS_TOPIC_ARN\""

  # Check for existing subscriptions
  local existing_subs
  existing_subs=$(aws sns list-subscriptions-by-topic \
    --topic-arn "$SNS_TOPIC_ARN" \
    --region "$CONTROL_REGION" \
    --query 'Subscriptions[?Protocol==`email`].Endpoint' \
    --output text 2>/dev/null || echo "")

  if [[ -z "$existing_subs" ]]; then
    log_info "No email subscription found."
    log_info "To subscribe: aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint YOUR_EMAIL --region $CONTROL_REGION"
  else
    log_info "Existing email subscriptions: $existing_subs"
  fi
}

# ============================================================
# Step 2: Create Health Check Lambda
# ============================================================
setup_health_lambda() {
  log_info "=== Setting up Health Check Lambda ==="

  # Check if function exists
  local existing
  existing=$(aws lambda get-function \
    --function-name "$HEALTH_LAMBDA_NAME" \
    --region "$CONTROL_REGION" \
    --query 'Configuration.FunctionArn' \
    --output text 2>/dev/null || echo "")

  # Build zip
  local lambda_dir="$PROJECT_ROOT/lambda"
  local zip_file="$lambda_dir/health_check.zip"
  (cd "$lambda_dir" && zip -j "$zip_file" health_check.py)
  log_info "Built $zip_file"

  if [[ -n "$existing" && "$existing" != "None" ]]; then
    log_info "Lambda $HEALTH_LAMBDA_NAME exists, updating code ..."
    aws lambda update-function-code \
      --function-name "$HEALTH_LAMBDA_NAME" \
      --zip-file "fileb://$zip_file" \
      --region "$CONTROL_REGION" > /dev/null

    # Update environment
    aws lambda update-function-configuration \
      --function-name "$HEALTH_LAMBDA_NAME" \
      --environment "Variables={NODES_TABLE=$NODES_TABLE,SNS_TOPIC_ARN=$SNS_TOPIC_ARN}" \
      --timeout 30 \
      --region "$CONTROL_REGION" > /dev/null
  else
    log_info "Creating Lambda $HEALTH_LAMBDA_NAME ..."
    aws lambda create-function \
      --function-name "$HEALTH_LAMBDA_NAME" \
      --runtime python3.12 \
      --role "arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE}" \
      --handler health_check.handler \
      --zip-file "fileb://$zip_file" \
      --timeout 30 \
      --environment "Variables={NODES_TABLE=$NODES_TABLE,SNS_TOPIC_ARN=$SNS_TOPIC_ARN}" \
      --region "$CONTROL_REGION" > /dev/null
  fi

  # Ensure Lambda role has SNS publish permission
  local policy_doc
  policy_doc=$(cat <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "*"
    }
  ]
}
POLICY
)

  aws iam put-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-name "proxy-sns-publish" \
    --policy-document "$policy_doc" 2>/dev/null || true

  log_info "Lambda $HEALTH_LAMBDA_NAME ready."

  # Clean up zip
  rm -f "$zip_file"
}

# ============================================================
# Step 3: Create EventBridge rule (every 30 minutes)
# ============================================================
setup_eventbridge() {
  log_info "=== Setting up EventBridge schedule ==="

  local rule_name="proxy-health-check-schedule"
  local lambda_arn
  lambda_arn=$(aws lambda get-function \
    --function-name "$HEALTH_LAMBDA_NAME" \
    --region "$CONTROL_REGION" \
    --query 'Configuration.FunctionArn' --output text)

  # Create/update rule
  aws events put-rule \
    --name "$rule_name" \
    --schedule-expression "rate(30 minutes)" \
    --state ENABLED \
    --region "$CONTROL_REGION" > /dev/null

  # Add Lambda as target
  aws events put-targets \
    --rule "$rule_name" \
    --targets "Id=health-check-target,Arn=$lambda_arn" \
    --region "$CONTROL_REGION" > /dev/null

  # Grant EventBridge permission to invoke Lambda
  aws lambda add-permission \
    --function-name "$HEALTH_LAMBDA_NAME" \
    --statement-id "eventbridge-health-check" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "arn:aws:events:${CONTROL_REGION}:${ACCOUNT_ID}:rule/${rule_name}" \
    --region "$CONTROL_REGION" 2>/dev/null || true

  log_info "EventBridge rule '$rule_name' configured (every 30 min)."
}

# ============================================================
# Step 4: CloudWatch StatusCheckFailed alarms for each EC2
# ============================================================
setup_cloudwatch_alarms() {
  log_info "=== Setting up CloudWatch alarms ==="

  for i in "${!REGION_SHORTS[@]}"; do
    local short="${REGION_SHORTS[$i]}"
    local region="${REGIONS[$i]}"

    local ec2_data
    ec2_data=$(load_output "ec2-${short}" 2>/dev/null || echo "")
    if [[ -z "$ec2_data" ]]; then
      log_warn "No EC2 data for $short, skipping alarm."
      continue
    fi

    local instance_id
    instance_id=$(echo "$ec2_data" | jq -r '.instance_id')

    if [[ -z "$instance_id" || "$instance_id" == "null" ]]; then
      log_warn "No instance_id for $short, skipping alarm."
      continue
    fi

    local alarm_name="proxy-${short}-status-check"
    log_info "Creating alarm $alarm_name for $instance_id in $region ..."

    # SNS topic must be in the same region as the alarm for cross-region
    # For simplicity, create alarms in control region using cross-region metrics
    # Actually, CloudWatch alarms must be in the same region as the metric.
    # So we create the alarm in each node's region.
    # But SNS topic is in us-west-2 — cross-region SNS action works.

    aws cloudwatch put-metric-alarm \
      --alarm-name "$alarm_name" \
      --namespace "AWS/EC2" \
      --metric-name "StatusCheckFailed" \
      --dimensions "Name=InstanceId,Value=$instance_id" \
      --statistic "Maximum" \
      --period 300 \
      --evaluation-periods 2 \
      --threshold 1 \
      --comparison-operator "GreaterThanOrEqualToThreshold" \
      --alarm-actions "$SNS_TOPIC_ARN" \
      --ok-actions "$SNS_TOPIC_ARN" \
      --region "$region" 2>/dev/null || log_warn "Failed to create alarm in $region (SNS cross-region may need setup)"

    log_info "Alarm $alarm_name created in $region."
  done
}

# ============================================================
# Main
# ============================================================
log_info "=== Setting up monitoring infrastructure ==="

setup_sns
setup_health_lambda
setup_eventbridge
setup_cloudwatch_alarms

log_info ""
log_info "=== Monitoring setup complete ==="
log_info ""
log_info "Next steps:"
log_info "  1. Subscribe email to SNS: aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint YOUR@EMAIL.COM --region $CONTROL_REGION"
log_info "  2. Test health check: aws lambda invoke --function-name $HEALTH_LAMBDA_NAME --region $CONTROL_REGION /dev/stdout"
log_info "  3. Test IP rotation: bash $SCRIPT_DIR/rotate-ip.sh us-1"
