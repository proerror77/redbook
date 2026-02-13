#!/usr/bin/env bash
# Phase D: Subscription - DynamoDB tables, Lambda, API Gateway, initial token
# Idempotent: checks if resources exist before creating

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
DEPLOY_REGION="${DEPLOY_REGION:-us-west-2}"
log_info "AWS Account: $ACCOUNT_ID | Deploy region: $DEPLOY_REGION"

# ============================================================
# Step 1: Create DynamoDB table - proxy-tokens
# ============================================================
create_tokens_table() {
  if aws dynamodb describe-table --table-name "$TOKENS_TABLE" \
    --region "$DEPLOY_REGION" &>/dev/null; then
    log_info "DynamoDB table $TOKENS_TABLE already exists, skipping."
    return 0
  fi

  log_info "Creating DynamoDB table: $TOKENS_TABLE ..."
  aws dynamodb create-table \
    --table-name "$TOKENS_TABLE" \
    --attribute-definitions AttributeName=token,AttributeType=S \
    --key-schema AttributeName=token,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=Project,Value=proxy \
    --region "$DEPLOY_REGION"

  aws dynamodb wait table-exists \
    --table-name "$TOKENS_TABLE" \
    --region "$DEPLOY_REGION"
  log_info "Table $TOKENS_TABLE created and active."
}

# ============================================================
# Step 2: Create DynamoDB table - proxy-nodes
# ============================================================
create_nodes_table() {
  if aws dynamodb describe-table --table-name "$NODES_TABLE" \
    --region "$DEPLOY_REGION" &>/dev/null; then
    log_info "DynamoDB table $NODES_TABLE already exists, skipping."
    return 0
  fi

  log_info "Creating DynamoDB table: $NODES_TABLE ..."
  aws dynamodb create-table \
    --table-name "$NODES_TABLE" \
    --attribute-definitions AttributeName=node_id,AttributeType=S \
    --key-schema AttributeName=node_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=Project,Value=proxy \
    --region "$DEPLOY_REGION"

  aws dynamodb wait table-exists \
    --table-name "$NODES_TABLE" \
    --region "$DEPLOY_REGION"
  log_info "Table $NODES_TABLE created and active."
}

# ============================================================
# Step 3: Build and deploy Lambda function
# ============================================================
deploy_lambda() {
  if aws lambda get-function --function-name "$LAMBDA_NAME" \
    --region "$DEPLOY_REGION" &>/dev/null; then
    log_info "Lambda $LAMBDA_NAME already exists, skipping."
    return 0
  fi

  log_info "Building Lambda package ..."
  bash "$PROJECT_ROOT/lambda/build.sh"

  local zip_path="$PROJECT_ROOT/lambda/lambda.zip"
  if [[ ! -f "$zip_path" ]]; then
    log_error "Lambda zip not found at $zip_path"
    return 1
  fi

  local role_arn="arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE}"

  log_info "Creating Lambda function: $LAMBDA_NAME ..."
  aws lambda create-function \
    --function-name "$LAMBDA_NAME" \
    --runtime python3.12 \
    --handler handler.lambda_handler \
    --role "$role_arn" \
    --zip-file "fileb://$zip_path" \
    --timeout 10 \
    --memory-size 128 \
    --environment "Variables={TOKENS_TABLE=$TOKENS_TABLE,NODES_TABLE=$NODES_TABLE}" \
    --tags Project=proxy \
    --region "$DEPLOY_REGION"

  aws lambda wait function-active-v2 \
    --function-name "$LAMBDA_NAME" \
    --region "$DEPLOY_REGION"
  log_info "Lambda $LAMBDA_NAME deployed and active."
}

# ============================================================
# Step 4: Create API Gateway HTTP API
# ============================================================
create_api_gateway() {
  local existing_api_id
  existing_api_id=$(aws apigatewayv2 get-apis \
    --region "$DEPLOY_REGION" \
    --query "Items[?Name=='$API_NAME'].ApiId | [0]" \
    --output text 2>/dev/null)

  if [[ -n "$existing_api_id" && "$existing_api_id" != "None" ]]; then
    log_info "API Gateway $API_NAME already exists (ID: $existing_api_id), skipping."
    save_output "api-gateway-id" "\"$existing_api_id\""
    return 0
  fi

  log_info "Creating API Gateway HTTP API: $API_NAME ..."
  local api_id
  api_id=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --region "$DEPLOY_REGION" \
    --query 'ApiId' --output text)

  save_output "api-gateway-id" "\"$api_id\""
  log_info "API Gateway created: $api_id"

  # Create Lambda integration
  local lambda_arn="arn:aws:lambda:${DEPLOY_REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}"
  local integration_id
  integration_id=$(aws apigatewayv2 create-integration \
    --api-id "$api_id" \
    --integration-type AWS_PROXY \
    --integration-uri "$lambda_arn" \
    --payload-format-version "2.0" \
    --region "$DEPLOY_REGION" \
    --query 'IntegrationId' --output text)
  log_info "Lambda integration created: $integration_id"

  # Add route: GET /mihomo/proxies/{token}
  aws apigatewayv2 create-route \
    --api-id "$api_id" \
    --route-key "GET /mihomo/proxies/{token}" \
    --target "integrations/$integration_id" \
    --region "$DEPLOY_REGION"
  log_info "Route GET /mihomo/proxies/{token} created."

  # Create default stage with auto-deploy
  aws apigatewayv2 create-stage \
    --api-id "$api_id" \
    --stage-name '$default' \
    --auto-deploy \
    --region "$DEPLOY_REGION"
  log_info "Default stage created with auto-deploy."

  # Grant API Gateway permission to invoke Lambda
  aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "apigateway-invoke" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:${DEPLOY_REGION}:${ACCOUNT_ID}:${api_id}/*" \
    --region "$DEPLOY_REGION"
  log_info "Lambda invoke permission granted to API Gateway."

  local api_url="https://${api_id}.execute-api.${DEPLOY_REGION}.amazonaws.com"
  save_output "api-gateway-url" "\"$api_url\""
  log_info "API Gateway URL: $api_url"
}

# ============================================================
# Step 5: Generate initial subscription token
# ============================================================
create_initial_token() {
  local token
  token=$(uuidgen | tr '[:upper:]' '[:lower:]')

  # Check if any token already exists
  local count
  count=$(aws dynamodb scan \
    --table-name "$TOKENS_TABLE" \
    --select COUNT \
    --region "$DEPLOY_REGION" \
    --query 'Count' --output text 2>/dev/null || echo "0")

  if [[ "$count" -gt 0 ]]; then
    log_info "Tokens table already has $count token(s), skipping initial token."
    return 0
  fi

  log_info "Inserting initial token into $TOKENS_TABLE ..."
  local now
  now=$(date -u +%s)

  aws dynamodb put-item \
    --table-name "$TOKENS_TABLE" \
    --item "{
      \"token\": {\"S\": \"$token\"},
      \"user_name\": {\"S\": \"admin\"},
      \"enabled\": {\"BOOL\": true},
      \"allowed_regions\": {\"L\": [{\"S\": \"us-west-2\"},{\"S\": \"ap-northeast-1\"},{\"S\": \"ap-east-2\"}]},
      \"created_at\": {\"N\": \"$now\"}
    }" \
    --region "$DEPLOY_REGION"

  save_output "initial-token" "\"$token\""
  log_info "Initial token created: $token"
}

# ============================================================
# Execute all steps
# ============================================================
log_info "=== Phase D: Subscription ==="

create_tokens_table
create_nodes_table
deploy_lambda
create_api_gateway
create_initial_token

log_info "=== Phase D complete ==="
