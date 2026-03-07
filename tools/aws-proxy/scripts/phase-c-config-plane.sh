#!/usr/bin/env bash
# Phase C: Config Plane - S3 bucket + CloudFront OAC distribution
# Idempotent: checks if resources exist before creating

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

S3_BUCKET="${S3_BUCKET_PREFIX}-${ACCOUNT_ID}"

# ============================================================
# Step 1: Create S3 Bucket
# ============================================================
create_s3_bucket() {
  if aws s3api head-bucket --bucket "$S3_BUCKET" &>/dev/null; then
    log_info "S3 bucket $S3_BUCKET already exists, skipping creation."
  else
    log_info "Creating S3 bucket: $S3_BUCKET ..."
    aws s3api create-bucket \
      --bucket "$S3_BUCKET" \
      --region us-east-1
    log_info "S3 bucket $S3_BUCKET created."
  fi

  # Block all public access
  log_info "Ensuring public access is blocked on $S3_BUCKET ..."
  aws s3api put-public-access-block \
    --bucket "$S3_BUCKET" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  # Enable versioning
  log_info "Enabling versioning on $S3_BUCKET ..."
  aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET" \
    --versioning-configuration Status=Enabled

  log_info "S3 bucket $S3_BUCKET configured."
}

# ============================================================
# Step 2: Upload config files to S3
# ============================================================
upload_configs() {
  local tpl_file="$PROJECT_ROOT/templates/mihomo-base.yaml.tpl"
  if [[ ! -f "$tpl_file" ]]; then
    log_error "Template not found: $tpl_file"
    return 1
  fi

  # base.yaml is rendered and uploaded after CloudFront is ready (needs __CF_URL__).
  log_info "Found base template: $tpl_file"

  # Upload rules if directory exists
  local rules_dir="$PROJECT_ROOT/rules"
  if [[ -d "$rules_dir" ]]; then
    local count=0
    for rule_file in "$rules_dir"/*.yaml; do
      [[ -f "$rule_file" ]] || continue
      local basename
      basename=$(basename "$rule_file")
      log_info "Uploading rules/$basename ..."
      aws s3 cp "$rule_file" "s3://$S3_BUCKET/rules/$basename"
      (( count++ ))
    done
    log_info "Uploaded $count rule file(s) to s3://$S3_BUCKET/rules/"
  else
    log_warn "No rules/ directory found, skipping rule uploads."
  fi
}

# ============================================================
# Step 3: Create CloudFront Origin Access Control
# ============================================================
OAC_NAME="proxy-config-oac"

create_oac() {
  # Check if OAC already exists
  local existing_oac
  existing_oac=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id" \
    --output text 2>/dev/null || echo "")

  if [[ -n "$existing_oac" && "$existing_oac" != "None" ]]; then
    log_info "OAC $OAC_NAME already exists (ID: $existing_oac), skipping."
    echo "$existing_oac"
    return 0
  fi

  log_info "Creating CloudFront Origin Access Control: $OAC_NAME ..."

  local oac_config
  oac_config=$(jq -n \
    --arg name "$OAC_NAME" \
    '{
      Name: $name,
      Description: "OAC for proxy config S3 bucket",
      SigningProtocol: "sigv4",
      SigningBehavior: "always",
      OriginAccessControlOriginType: "s3"
    }')

  local result
  result=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "$oac_config")

  local oac_id
  oac_id=$(echo "$result" | jq -r '.OriginAccessControl.Id')
  log_info "Created OAC: $oac_id"
  echo "$oac_id"
}

# ============================================================
# Step 4: Create CloudFront Distribution
# ============================================================
CF_COMMENT="proxy-config-distribution"

create_distribution() {
  local oac_id="$1"

  # Check if distribution already exists by comment tag
  local existing_dist
  existing_dist=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='$CF_COMMENT'].Id" \
    --output text 2>/dev/null || echo "")

  if [[ -n "$existing_dist" && "$existing_dist" != "None" ]]; then
    log_info "CloudFront distribution already exists (ID: $existing_dist), skipping."
    local domain
    domain=$(aws cloudfront get-distribution --id "$existing_dist" \
      --query 'Distribution.DomainName' --output text)
    save_output "cf-domain" "\"$domain\""
    save_output "cf-dist-id" "\"$existing_dist\""
    echo "$existing_dist"
    return 0
  fi

  log_info "Creating CloudFront distribution for $S3_BUCKET ..."

  local s3_origin="${S3_BUCKET}.s3.amazonaws.com"
  local caller_ref
  caller_ref="proxy-$(date +%s)"

  local dist_config
  dist_config=$(jq -n \
    --arg origin "$s3_origin" \
    --arg bucket "$S3_BUCKET" \
    --arg oac_id "$oac_id" \
    --arg caller_ref "$caller_ref" \
    --arg comment "$CF_COMMENT" \
    '{
      CallerReference: $caller_ref,
      Comment: $comment,
      Enabled: true,
      PriceClass: "PriceClass_100",
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: $bucket,
            DomainName: $origin,
            OriginAccessControlId: $oac_id,
            S3OriginConfig: {
              OriginAccessIdentity: ""
            }
          }
        ]
      },
      DefaultCacheBehavior: {
        TargetOriginId: $bucket,
        ViewerProtocolPolicy: "https-only",
        AllowedMethods: {
          Quantity: 2,
          Items: ["GET", "HEAD"],
          CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] }
        },
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true
      }
    }')

  local result
  result=$(aws cloudfront create-distribution \
    --distribution-config "$dist_config")

  local dist_id dist_domain
  dist_id=$(echo "$result" | jq -r '.Distribution.Id')
  dist_domain=$(echo "$result" | jq -r '.Distribution.DomainName')

  log_info "Created CloudFront distribution: $dist_id ($dist_domain)"
  save_output "cf-domain" "\"$dist_domain\""
  save_output "cf-dist-id" "\"$dist_id\""

  echo "$dist_id"
}

# ============================================================
# Step 5: Update S3 Bucket Policy for CloudFront OAC
# ============================================================
update_bucket_policy() {
  local dist_id="$1"

  # Get the distribution ARN
  local dist_arn
  dist_arn=$(aws cloudfront get-distribution --id "$dist_id" \
    --query 'Distribution.ARN' --output text)

  log_info "Updating S3 bucket policy to allow CloudFront OAC ..."

  local bucket_policy
  bucket_policy=$(jq -n \
    --arg bucket_arn "arn:aws:s3:::$S3_BUCKET" \
    --arg dist_arn "$dist_arn" \
    '{
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowCloudFrontOAC",
          Effect: "Allow",
          Principal: { Service: "cloudfront.amazonaws.com" },
          Action: "s3:GetObject",
          Resource: "\($bucket_arn)/*",
          Condition: {
            StringEquals: {
              "AWS:SourceArn": $dist_arn
            }
          }
        }
      ]
    }')

  aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET" \
    --policy "$bucket_policy"

  log_info "S3 bucket policy updated."
}

# ============================================================
# Step 6: Wait for CloudFront distribution to deploy
# ============================================================
wait_for_distribution() {
  local dist_id="$1"

  wait_for_resource \
    "CloudFront distribution $dist_id" \
    "aws cloudfront get-distribution --id '$dist_id' --query 'Distribution.Status' --output text | grep -q 'Deployed'" \
    60 15
}

# ============================================================
# Step 7: Render and upload base.yaml (fill placeholders)
# ============================================================
render_and_upload_base_yaml() {
  local cf_domain="$1"
  local tpl_file="$PROJECT_ROOT/templates/mihomo-base.yaml.tpl"
  if [[ ! -f "$tpl_file" ]]; then
    log_error "Template not found: $tpl_file"
    return 1
  fi

  local cf_url="https://${cf_domain}"

  local apigw_url token
  apigw_url="${APIGW_URL:-}"
  token="${TOKEN:-}"

  if [[ -z "$apigw_url" ]]; then
    apigw_url=$(load_output "api-gateway-url" 2>/dev/null | jq -r '. // empty' || true)
  fi
  if [[ -z "$token" ]]; then
    token=$(load_output "initial-token" 2>/dev/null | jq -r '. // empty' || true)
  fi

  if [[ -z "$apigw_url" ]]; then
    log_warn "APIGW_URL not set yet; leaving __APIGW_URL__ placeholder in base.yaml."
    apigw_url="__APIGW_URL__"
  fi

  render_and_upload() {
    local token_value="$1"
    local s3_key="$2"
    local tmp
    tmp=$(mktemp)
    sed \
      -e "s|__CF_URL__|${cf_url}|g" \
      -e "s|__APIGW_URL__|${apigw_url}|g" \
      -e "s|__TOKEN__|${token_value}|g" \
      "$tpl_file" > "$tmp"
    log_info "Uploading rendered ${s3_key#s3://$S3_BUCKET/} to $s3_key ..."
    aws s3 cp "$tmp" "$s3_key"
    rm -f "$tmp"
  }

  # Public root file should NOT embed a token.
  render_and_upload "__TOKEN__" "s3://$S3_BUCKET/base.yaml"

  # Token-specific base config: URL contains the token, same trust model as any subscription URL.
  if [[ -n "$token" ]]; then
    render_and_upload "$token" "s3://$S3_BUCKET/base/${token}.yaml"
  else
    log_warn "TOKEN not set yet; skipping token-specific base/<token>.yaml upload."
  fi
}

# ============================================================
# Execute all steps
# ============================================================
log_info "=== Phase C: Config Plane ==="

create_s3_bucket
upload_configs

OAC_ID=$(create_oac)
DIST_ID=$(create_distribution "$OAC_ID")

if [[ -n "$DIST_ID" ]]; then
  update_bucket_policy "$DIST_ID"
  wait_for_distribution "$DIST_ID"
  dist_domain=$(aws cloudfront get-distribution --id "$DIST_ID" \
    --query 'Distribution.DomainName' --output text)
  save_output "cf-domain" "\"$dist_domain\""
  render_and_upload_base_yaml "$dist_domain"

  # CloudFront caches aggressively; invalidate updated files for immediate use.
  inv_id=$(aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths '/base.yaml' '/base/*' '/rules/*' \
    --query 'Invalidation.Id' --output text 2>/dev/null || true)
  [[ -n "$inv_id" ]] && log_info "Created CloudFront invalidation: $inv_id"
fi

log_info "=== Phase C complete ==="
