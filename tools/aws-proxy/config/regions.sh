#!/usr/bin/env bash
# Region definitions with CIDR blocks and short names

# Region identifiers
REGIONS=(
  "us-west-2"
  "ap-northeast-1"
  "ap-east-2"
)

# Short names for resource naming
REGION_SHORTS=(
  "us"
  "jp"
  "tw"
)

# VPC CIDR blocks per region
REGION_CIDRS=(
  "10.0.0.0/16"
  "10.1.0.0/16"
  "10.2.0.0/16"
)

# Subnet CIDR blocks per region
REGION_SUBNETS=(
  "10.0.1.0/24"
  "10.1.1.0/24"
  "10.2.1.0/24"
)

# Regions that require opt-in
OPT_IN_REGIONS=("ap-east-2")

# Helper: get index for a region
get_region_index() {
  local region="$1"
  for i in "${!REGIONS[@]}"; do
    if [[ "${REGIONS[$i]}" == "$region" ]]; then
      echo "$i"
      return 0
    fi
  done
  return 1
}

# Helper: get short name for a region
get_region_short() {
  local region="$1"
  local idx
  idx=$(get_region_index "$region") || return 1
  echo "${REGION_SHORTS[$idx]}"
}

# Helper: check if region requires opt-in
is_opt_in_region() {
  local region="$1"
  for r in "${OPT_IN_REGIONS[@]}"; do
    if [[ "$r" == "$region" ]]; then
      return 0
    fi
  done
  return 1
}

export REGIONS REGION_SHORTS REGION_CIDRS REGION_SUBNETS OPT_IN_REGIONS
