#!/usr/bin/env bash
# Harden origin security groups behind Cloudflare:
# - Allow TCP 443 only from Cloudflare IP ranges
# - Remove non-Cloudflare TCP 443 sources (optional)
# - Close TCP 8080 ingress (optional)
#
# Usage:
#   bash scripts/harden-cloudflare-origin.sh
#   bash scripts/harden-cloudflare-origin.sh --verify-only
#   DRY_RUN=1 bash scripts/harden-cloudflare-origin.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

for cmd in curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "Missing required tool: $cmd"
    exit 1
  fi
done

MODE="apply"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify-only)
      MODE="verify"
      shift
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

LOCKDOWN_PORT="${LOCKDOWN_PORT:-443}"
PRUNE_NON_CF_443="${PRUNE_NON_CF_443:-1}"
CLOSE_8080="${CLOSE_8080:-1}"
DRY_RUN="${DRY_RUN:-0}"
CF_IPV4_URL="${CF_IPV4_URL:-https://www.cloudflare.com/ips-v4}"
CF_IPV6_URL="${CF_IPV6_URL:-https://www.cloudflare.com/ips-v6}"

trim() {
  local s="$1"
  # shellcheck disable=SC2001
  echo "$s" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

run_aws() {
  if [[ "$MODE" == "verify" ]]; then
    return 0
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    log_info "[dry-run] aws $*"
    return 0
  fi
  aws "$@"
}

get_sg_id_from_data_or_instance() {
  local short="$1"
  local region="$2"

  local sg_file="$DATA_DIR/sg-${short}.json"
  if [[ -f "$sg_file" ]]; then
    local sg
    sg=$(trim "$(cat "$sg_file")")
    if [[ -n "$sg" ]]; then
      echo "$sg"
      return 0
    fi
  fi

  local ec2_file="$DATA_DIR/ec2-${short}.json"
  if [[ -f "$ec2_file" ]]; then
    local instance_id sg
    instance_id=$(jq -r '.instance_id // empty' "$ec2_file")
    if [[ -n "$instance_id" ]]; then
      sg=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --region "$region" \
        --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || true)
      sg=$(trim "$sg")
      if [[ -n "$sg" && "$sg" != "None" ]]; then
        echo "$sg"
        return 0
      fi
    fi
  fi

  echo ""
}

revoke_v4() {
  local region="$1" sg_id="$2" port="$3" cidr="$4"
  local perm
  perm=$(jq -cn --arg cidr "$cidr" --argjson port "$port" \
    '[{IpProtocol:"tcp",FromPort:$port,ToPort:$port,IpRanges:[{CidrIp:$cidr}]}]')
  run_aws ec2 revoke-security-group-ingress \
    --region "$region" \
    --group-id "$sg_id" \
    --ip-permissions "$perm" >/dev/null 2>&1 || true
}

revoke_v6() {
  local region="$1" sg_id="$2" port="$3" cidr="$4"
  local perm
  perm=$(jq -cn --arg cidr "$cidr" --argjson port "$port" \
    '[{IpProtocol:"tcp",FromPort:$port,ToPort:$port,Ipv6Ranges:[{CidrIpv6:$cidr}]}]')
  run_aws ec2 revoke-security-group-ingress \
    --region "$region" \
    --group-id "$sg_id" \
    --ip-permissions "$perm" >/dev/null 2>&1 || true
}

authorize_v4() {
  local region="$1" sg_id="$2" port="$3" cidr="$4"
  local perm
  perm=$(jq -cn --arg cidr "$cidr" --argjson port "$port" \
    '[{IpProtocol:"tcp",FromPort:$port,ToPort:$port,IpRanges:[{CidrIp:$cidr,Description:"Cloudflare edge"}]}]')
  run_aws ec2 authorize-security-group-ingress \
    --region "$region" \
    --group-id "$sg_id" \
    --ip-permissions "$perm" >/dev/null 2>&1 || true
}

authorize_v6() {
  local region="$1" sg_id="$2" port="$3" cidr="$4"
  local perm
  perm=$(jq -cn --arg cidr "$cidr" --argjson port "$port" \
    '[{IpProtocol:"tcp",FromPort:$port,ToPort:$port,Ipv6Ranges:[{CidrIpv6:$cidr,Description:"Cloudflare edge"}]}]')
  run_aws ec2 authorize-security-group-ingress \
    --region "$region" \
    --group-id "$sg_id" \
    --ip-permissions "$perm" >/dev/null 2>&1 || true
}

log_info "Fetching Cloudflare IP ranges ..."
CF_V4=()
CF_V6=()
CF_V4=($(curl -fsSL "$CF_IPV4_URL" | sed '/^[[:space:]]*$/d'))
CF_V6=($(curl -fsSL "$CF_IPV6_URL" | sed '/^[[:space:]]*$/d'))

if [[ ${#CF_V4[@]} -eq 0 || ${#CF_V6[@]} -eq 0 ]]; then
  log_error "Cloudflare IP list is empty. Abort."
  exit 1
fi
log_info "Cloudflare ranges: IPv4=${#CF_V4[@]}, IPv6=${#CF_V6[@]}"

DRIFT=0

process_region_sg() {
  local region="$1"
  local short="$2"

  local sg_id
  sg_id=$(get_sg_id_from_data_or_instance "$short" "$region")
  if [[ -z "$sg_id" ]]; then
    log_warn "[$short] SG not found (skip)"
    return 0
  fi

  log_info "[$short] Checking SG $sg_id in $region ..."
  local sg_json
  sg_json=$(aws ec2 describe-security-groups \
    --group-ids "$sg_id" \
    --region "$region" \
    --output json)

  local cur_443_v4=()
  local cur_443_v6=()
  local cur_8080_v4=()
  local cur_8080_v6=()
  cur_443_v4=($(echo "$sg_json" | jq -r '.SecurityGroups[0].IpPermissions[]
    | select(.IpProtocol=="tcp" and .FromPort==443 and .ToPort==443)
    | .IpRanges[]?.CidrIp'))
  cur_443_v6=($(echo "$sg_json" | jq -r '.SecurityGroups[0].IpPermissions[]
    | select(.IpProtocol=="tcp" and .FromPort==443 and .ToPort==443)
    | .Ipv6Ranges[]?.CidrIpv6'))
  cur_8080_v4=($(echo "$sg_json" | jq -r '.SecurityGroups[0].IpPermissions[]
    | select(.IpProtocol=="tcp" and .FromPort==8080 and .ToPort==8080)
    | .IpRanges[]?.CidrIp'))
  cur_8080_v6=($(echo "$sg_json" | jq -r '.SecurityGroups[0].IpPermissions[]
    | select(.IpProtocol=="tcp" and .FromPort==8080 and .ToPort==8080)
    | .Ipv6Ranges[]?.CidrIpv6'))

  local extra=0 missing=0 open8080=0 changed=0
  local cidr

  for cidr in "${cur_443_v4[@]-}"; do
    [[ -z "$cidr" ]] && continue
    if ! contains "$cidr" "${CF_V4[@]-}"; then
      (( extra++ ))
      if [[ "$MODE" == "apply" && "$PRUNE_NON_CF_443" == "1" ]]; then
        log_info "[$short] Revoke tcp/443 IPv4 non-CF: $cidr"
        revoke_v4 "$region" "$sg_id" "$LOCKDOWN_PORT" "$cidr"
        (( changed++ ))
      fi
    fi
  done

  for cidr in "${cur_443_v6[@]-}"; do
    [[ -z "$cidr" ]] && continue
    if ! contains "$cidr" "${CF_V6[@]-}"; then
      (( extra++ ))
      if [[ "$MODE" == "apply" && "$PRUNE_NON_CF_443" == "1" ]]; then
        log_info "[$short] Revoke tcp/443 IPv6 non-CF: $cidr"
        revoke_v6 "$region" "$sg_id" "$LOCKDOWN_PORT" "$cidr"
        (( changed++ ))
      fi
    fi
  done

  for cidr in "${CF_V4[@]-}"; do
    [[ -z "$cidr" ]] && continue
    if ! contains "$cidr" "${cur_443_v4[@]-}"; then
      (( missing++ ))
      if [[ "$MODE" == "apply" ]]; then
        log_info "[$short] Authorize tcp/443 IPv4 CF: $cidr"
        authorize_v4 "$region" "$sg_id" "$LOCKDOWN_PORT" "$cidr"
        (( changed++ ))
      fi
    fi
  done

  for cidr in "${CF_V6[@]-}"; do
    [[ -z "$cidr" ]] && continue
    if ! contains "$cidr" "${cur_443_v6[@]-}"; then
      (( missing++ ))
      if [[ "$MODE" == "apply" ]]; then
        log_info "[$short] Authorize tcp/443 IPv6 CF: $cidr"
        authorize_v6 "$region" "$sg_id" "$LOCKDOWN_PORT" "$cidr"
        (( changed++ ))
      fi
    fi
  done

  if [[ "$CLOSE_8080" == "1" ]]; then
    for cidr in "${cur_8080_v4[@]-}"; do
      [[ -z "$cidr" ]] && continue
      (( open8080++ ))
      if [[ "$MODE" == "apply" ]]; then
        log_info "[$short] Revoke tcp/8080 IPv4: $cidr"
        revoke_v4 "$region" "$sg_id" 8080 "$cidr"
        (( changed++ ))
      fi
    done
    for cidr in "${cur_8080_v6[@]-}"; do
      [[ -z "$cidr" ]] && continue
      (( open8080++ ))
      if [[ "$MODE" == "apply" ]]; then
        log_info "[$short] Revoke tcp/8080 IPv6: $cidr"
        revoke_v6 "$region" "$sg_id" 8080 "$cidr"
        (( changed++ ))
      fi
    done
  fi

  if (( extra > 0 || missing > 0 || open8080 > 0 )); then
    (( DRIFT++ ))
    log_warn "[$short] drift detected: extra443=$extra missing443=$missing open8080=$open8080"
  else
    log_info "[$short] SG is compliant"
  fi

  if [[ "$MODE" == "apply" ]]; then
    log_info "[$short] changes applied: $changed"
  fi
}

for i in "${!REGIONS[@]}"; do
  process_region_sg "${REGIONS[$i]}" "${REGION_SHORTS[$i]}"
done

if [[ "$MODE" == "verify" ]]; then
  if (( DRIFT > 0 )); then
    log_error "Verification failed: $DRIFT security group(s) are not compliant."
    exit 1
  fi
  log_info "Verification passed: all origin SGs are Cloudflare-locked on tcp/443."
  exit 0
fi

log_info "Hardening complete."
