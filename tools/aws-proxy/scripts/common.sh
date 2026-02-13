#!/usr/bin/env bash
# Shared functions and setup for all aws-proxy scripts
set -euo pipefail

# Resolve paths relative to the project root (tools/aws-proxy/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"

# Source config files
source "$PROJECT_ROOT/config/regions.sh"
source "$PROJECT_ROOT/config/naming.sh"
source "$PROJECT_ROOT/config/ports.sh"

# Load .env if present
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Ensure data directory exists
mkdir -p "$DATA_DIR"

# --- Colored logging ---

log_info() {
  printf '\033[0;32m[INFO]\033[0m %s\n' "$*"
}

log_warn() {
  printf '\033[0;33m[WARN]\033[0m %s\n' "$*" >&2
}

log_error() {
  printf '\033[0;31m[ERROR]\033[0m %s\n' "$*" >&2
}

# --- Prerequisite checks ---

check_prerequisites() {
  local missing=()
  for cmd in aws jq; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required tools: ${missing[*]}"
    exit 1
  fi
}

# --- AWS helpers ---

get_account_id() {
  aws sts get-caller-identity --query 'Account' --output text
}

# Run a command across all configured regions
aws_region_loop() {
  local callback="$1"
  shift
  for i in "${!REGIONS[@]}"; do
    local region="${REGIONS[$i]}"
    local short="${REGION_SHORTS[$i]}"
    log_info "[$region ($short)] Running $callback ..."
    "$callback" "$region" "$short" "$@"
  done
}

# --- Generic resource waiter ---

# Usage: wait_for_resource <description> <check_command> [max_attempts] [interval]
# check_command should return 0 when resource is ready
wait_for_resource() {
  local desc="$1"
  local check_cmd="$2"
  local max_attempts="${3:-30}"
  local interval="${4:-10}"

  log_info "Waiting for $desc ..."
  local attempt=0
  while (( attempt < max_attempts )); do
    if eval "$check_cmd" &>/dev/null; then
      log_info "$desc is ready."
      return 0
    fi
    (( attempt++ ))
    sleep "$interval"
  done
  log_error "Timed out waiting for $desc after $((max_attempts * interval))s"
  return 1
}

# --- Data persistence helpers ---

# Save a value to data/<key>.json
save_output() {
  local key="$1"
  local value="$2"
  echo "$value" > "$DATA_DIR/${key}.json"
  log_info "Saved $key to data/${key}.json"
}

# Load a value from data/<key>.json
load_output() {
  local key="$1"
  local file="$DATA_DIR/${key}.json"
  if [[ ! -f "$file" ]]; then
    log_error "No saved data for key: $key"
    return 1
  fi
  cat "$file"
}
