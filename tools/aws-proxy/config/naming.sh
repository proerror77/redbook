#!/usr/bin/env bash
# Resource naming conventions and constants

# --- Naming functions ---

get_vpc_name() {
  local short="$1"
  echo "proxy-${short}-vpc"
}

get_subnet_name() {
  local short="$1"
  echo "proxy-${short}-subnet"
}

get_sg_name() {
  local short="$1"
  echo "proxy-${short}-sg"
}

get_node_name() {
  local short="$1"
  local index="$2"
  echo "proxy-${short}-node-${index}"
}

get_igw_name() {
  local short="$1"
  echo "proxy-${short}-igw"
}

get_rtb_name() {
  local short="$1"
  echo "proxy-${short}-rtb"
}

# --- S3 ---
S3_BUCKET_PREFIX="proxy-config"

# --- Lambda / API Gateway ---
LAMBDA_NAME="proxy-sub-prod"
HEALTH_LAMBDA_NAME="proxy-health-check"
API_NAME="proxy-sub-api-prod"

# --- IAM ---
EC2_ROLE="proxy-node-ec2-role"
LAMBDA_ROLE="proxy-sub-lambda-role"
INSTANCE_PROFILE="proxy-node-instance-profile"

# --- DynamoDB ---
TOKENS_TABLE="proxy-tokens"
NODES_TABLE="proxy-nodes"

# --- Secrets Manager ---
SECRET_NAME="proxy/sing-box-credentials"

# --- SNS ---
SNS_TOPIC_NAME="proxy-alerts"

export S3_BUCKET_PREFIX LAMBDA_NAME HEALTH_LAMBDA_NAME API_NAME
export EC2_ROLE LAMBDA_ROLE INSTANCE_PROFILE
export TOKENS_TABLE NODES_TABLE
export SECRET_NAME SNS_TOPIC_NAME
