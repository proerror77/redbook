#!/usr/bin/env bash
# Create/Update Cloudflare proxied DNS records for proxy nodes (us/jp/tw).
# Requires: CLOUDFLARE_API_TOKEN, jq, curl
#
# Usage:
#   CF_EDGE_DOMAIN=icered.com bash tools/aws-proxy/scripts/setup-cloudflare-dns.sh
#   bash tools/aws-proxy/scripts/setup-cloudflare-dns.sh icered.com
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DOMAIN="${1:-${CF_EDGE_DOMAIN:-}}"
if [[ -z "${DOMAIN:-}" ]]; then
  echo "ERROR: domain not provided. Use: CF_EDGE_DOMAIN=example.com $0" >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set" >&2
  exit 1
fi

cf_api() {
  local method="$1" url="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "$url" \
      --data "$data"
  else
    curl -fsS -X "$method" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "$url"
  fi
}

echo "[cloudflare] Looking up zone: $DOMAIN"
ZONE_ID=$(
  cf_api GET "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
    | jq -r '.result[0].id // empty'
)
if [[ -z "$ZONE_ID" ]]; then
  echo "ERROR: Cloudflare zone not found for domain: $DOMAIN" >&2
  exit 1
fi
echo "[cloudflare] Zone ID: $ZONE_ID"

node_ip_from_data() {
  local short="$1"
  local f="$PROJECT_ROOT/data/ec2-${short}.json"
  if [[ ! -f "$f" ]]; then
    echo ""
    return 0
  fi
  jq -r '.public_ip // empty' "$f"
}

upsert_a_record() {
  local name="$1" ip="$2"
  if [[ -z "$ip" ]]; then
    echo "WARN: missing IP for ${name}.${DOMAIN} (skipping)" >&2
    return 0
  fi

  local fqdn="${name}.${DOMAIN}"
  local record
  record=$(cf_api GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${fqdn}")
  local id
  id=$(echo "$record" | jq -r '.result[0].id // empty')

  local payload
  payload=$(jq -cn --arg name "$name" --arg ip "$ip" \
    '{type:"A", name:$name, content:$ip, ttl:1, proxied:true}')

  if [[ -z "$id" ]]; then
    echo "[dns] Creating A $fqdn -> $ip (proxied)"
    cf_api POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" "$payload" >/dev/null
  else
    local cur_ip cur_proxied
    cur_ip=$(echo "$record" | jq -r '.result[0].content // empty')
    cur_proxied=$(echo "$record" | jq -r '.result[0].proxied // false')
    if [[ "$cur_ip" == "$ip" && "$cur_proxied" == "true" ]]; then
      echo "[dns] OK A $fqdn -> $ip (proxied)"
    else
      echo "[dns] Updating A $fqdn -> $ip (proxied)"
      cf_api PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${id}" "$payload" >/dev/null
    fi
  fi
}

US_IP="$(node_ip_from_data us)"
JP_IP="$(node_ip_from_data jp)"
TW_IP="$(node_ip_from_data tw)"

upsert_a_record us "$US_IP"
upsert_a_record jp "$JP_IP"
upsert_a_record tw "$TW_IP"

echo "[cloudflare] Done."
